/**
 * ReplyClassifier — turns an inbound WhatsApp reply into exactly ONE router
 * path for the unified engine (Arbeitssuchend / Beschäftigt / Mehr Infos /
 * Rückruf / Kein Interesse / Sonstige).
 *
 * Strategy: run the deterministic classifier first (fast, no I/O, gives us the
 * employment situation + intent + tags used downstream). If an LLM is
 * configured (OPENAI_API_KEY set), ask it to classify free text too; a
 * confident LLM answer wins, otherwise we keep the deterministic result. On ANY
 * LLM error/timeout we silently fall back — the message path is never blocked.
 *
 * The LLM ONLY classifies. It never generates any message text.
 */
import { serverEnv } from "@/server/env";

import {
  type EmploymentReplyInput,
} from "../EmploymentReplyClassifier";
import {
  analyzeReply,
  MANUAL_REVIEW_THRESHOLD,
  type ReplyAnalysis,
  type ReplyIntent,
} from "../ReplyIntentClassifier";
import {
  ROUTER_PATHS,
  type WorkflowRouterPath,
} from "@/features/fairtrain-funnel/automation/workflow/graph";

import { intentToPath, pathForAnalysis } from "./pathMapping";

export { intentToPath, pathForAnalysis };

export interface WorkflowClassification {
  path: WorkflowRouterPath;
  intent: ReplyIntent;
  confidence: number;
  manualReview: boolean;
  originalMessage: string;
  signals: string[];
  source: "quick_reply" | "freetext" | "llm" | "fallback";
  analysis: ReplyAnalysis;
}

const LLM_TIMEOUT_MS = 4000;
const LLM_CONFIDENCE_FLOOR = 0.6;

function isValidPath(v: unknown): v is WorkflowRouterPath {
  return typeof v === "string" && (ROUTER_PATHS as readonly string[]).includes(v);
}

/**
 * Ask the LLM to classify the reply. Returns null on any problem (no key,
 * timeout, bad JSON, low confidence) so the caller keeps the deterministic
 * result. Never throws.
 */
async function classifyWithLlm(
  message: string,
): Promise<{ path: WorkflowRouterPath; confidence: number } | null> {
  const key = serverEnv.OPENAI_API_KEY.trim();
  if (!key || !message.trim()) return null;

  const system =
    "Du bist ein Klassifikator für eingehende WhatsApp-Antworten von Interessenten einer Lokführer-Weiterbildung. " +
    "Ordne die Nachricht GENAU EINER Kategorie zu und antworte NUR mit JSON " +
    '{"category": <kategorie>, "confidence": <0..1>}. ' +
    "Kategorien: " +
    '"job_seeking" (arbeitssuchend/arbeitslos/sucht Job), ' +
    '"employed" (aktuell beschäftigt, auch unsicher/befristet/Veränderungswunsch), ' +
    '"other" (erkennbare, aber sonstige Situation: selbstständig/Rente/Student/Ausbildung), ' +
    '"more_info" (will mehr Infos, stellt Fragen), ' +
    '"callback" (möchte zurückgerufen/angerufen werden), ' +
    '"consultation" (möchte eine Beratung / ein Beratungsgespräch), ' +
    '"no_interest" (kein Interesse/Absage), ' +
    '"stop" (Abmeldung/keine Nachrichten mehr/STOPP), ' +
    '"unclear" (unklar, nicht eindeutig zuordenbar → manuelle Prüfung). ' +
    "Wähle bei Unsicherheit IMMER \"unclear\" statt zu raten. " +
    "Priorität bei mehreren Absichten: stop > callback/consultation > no_interest > job_seeking/employed/other > more_info > unclear. " +
    "Analysiere die GESAMTE Nachricht, nicht nur Emojis.";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: serverEnv.OPENAI_MODEL,
        temperature: 0,
        max_tokens: 40,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: message.slice(0, 1000) },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as {
      category?: unknown;
      confidence?: unknown;
    };
    if (!isValidPath(parsed.category)) return null;
    const confidence =
      typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.7;
    if (confidence < LLM_CONFIDENCE_FLOOR) return null;
    return { path: parsed.category, confidence };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Classify a reply into a router path. Quick-Reply buttons are authoritative and
 * skip the LLM entirely; free text is analysed deterministically and, when a
 * confident LLM answer is available, refined by it.
 */
export async function classifyReply(
  input: EmploymentReplyInput,
): Promise<WorkflowClassification> {
  const analysis = analyzeReply(input);
  const deterministicPath = pathForAnalysis(analysis);

  // A quick-reply button (or a strong stop) is authoritative — trust it.
  if (analysis.source === "quick_reply" || analysis.intent === "stop") {
    return {
      path: deterministicPath,
      intent: analysis.intent,
      confidence: analysis.confidence,
      manualReview: analysis.manualReview,
      originalMessage: analysis.originalMessage,
      signals: collectSignals(analysis),
      source: analysis.source === "quick_reply" ? "quick_reply" : "freetext",
      analysis,
    };
  }

  // Free text: try the LLM as a second opinion.
  const llm = await classifyWithLlm(analysis.originalMessage);
  if (llm) {
    return {
      path: llm.path,
      intent: analysis.intent,
      confidence: llm.confidence,
      manualReview: llm.path === "unclear",
      originalMessage: analysis.originalMessage,
      signals: collectSignals(analysis),
      source: "llm",
      analysis,
    };
  }

  // No LLM answer → keep deterministic; uncertain text stays manual review.
  const manualReview =
    analysis.manualReview || analysis.confidence < MANUAL_REVIEW_THRESHOLD;
  return {
    path: manualReview ? "unclear" : deterministicPath,
    intent: analysis.intent,
    confidence: analysis.confidence,
    manualReview,
    originalMessage: analysis.originalMessage,
    signals: collectSignals(analysis),
    source: analysis.source,
    analysis,
  };
}

function collectSignals(a: ReplyAnalysis): string[] {
  return Object.entries(a.flags)
    .filter(([, on]) => on)
    .map(([k]) => k);
}
