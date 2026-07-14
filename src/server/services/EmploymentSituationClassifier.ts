/**
 * EmploymentSituationClassifier — robust, PURE classification of replies to the
 * "Beschäftigten-Statusabfrage" WhatsApp template.
 *
 * The lead answers by tapping a colour Quick-Reply, by sending just an emoji,
 * a single word, or a full sentence. This classifier maps ALL of these to one
 * of five canonical situations and the follow-up intent they drive:
 *
 *   🟡 GELB       fixed_term_or_termination   → precheck  (Vorab-Check-Link)
 *   🔵 BLAU       short_time_or_business_risk → precheck  (Vorab-Check-Link)
 *   🩺 GESUNDHEIT health_related              → callback  (Rückruf, kein Link)
 *   ⚪ WEISS      stable_employment           → callback  (Beratung, kein Link)
 *   💬 ANDERE     other                       → manual_review (kein Auto-Send)
 *
 * It is deterministic + side-effect free, so it behaves identically for the
 * live webhook and the retro/backfill run and is fully unit-testable. The whole
 * inbound message is always analysed — never only the emoji ("🟡 Vertrag läuft
 * aus" reads emoji AND text). Conflicts are resolved by a fixed priority order.
 */
import { EmploymentStatus } from "@/features/fairtrain-funnel/types";
import { FunnelPhase } from "@/features/fairtrain-funnel/funnelPhase";

import { isOptOutMessage } from "./WhatsAppOptOutService";

export type EmploymentSituationCategory =
  | "fixed_term_or_termination"
  | "short_time_or_business_risk"
  | "health_related"
  | "stable_employment"
  | "other";

/** Follow-up route a category drives. */
export type SituationIntent = "precheck" | "callback" | "manual_review";

export interface SituationReplyInput {
  /** Stable Meta quick-reply payload id (button reply). */
  buttonId?: string | undefined;
  /** Quick-reply button label as shown to the lead. */
  buttonTitle?: string | undefined;
  /** Free-text message body (may contain emojis). */
  body?: string | undefined;
}

export interface SituationClassification {
  category: EmploymentSituationCategory;
  intent: SituationIntent;
  /** 0..1 confidence in the chosen category. */
  confidence: number;
  /** Concrete keywords/emoji that led to the decision (persisted for audit). */
  matchedKeywords: string[];
  source: "quick_reply" | "emoji" | "freetext" | "fallback";
  /** True when a real Beschäftigten-Statusabfrage signal was found. */
  signalDetected: boolean;
  /** True when the reply must NOT auto-branch (manual clarification / unsure). */
  manualReview: boolean;
  /** Interest expressed alongside the situation (e.g. WEISS + „möchte mich verändern"). */
  interest: boolean;
  /** True when the reply is a STOP / opt-out (priority 1, handled by caller). */
  optOut: boolean;
}

/** Stable Meta quick-reply payload ids for the colour buttons. */
export const SITUATION_QUICK_REPLY: Record<EmploymentSituationCategory, string> = {
  fixed_term_or_termination: "situation_gelb",
  short_time_or_business_risk: "situation_blau",
  health_related: "situation_gesundheit",
  stable_employment: "situation_weiss",
  other: "situation_andere",
};

/** Canonical lead tag per category (idempotency + Multichat display marker). */
export const SITUATION_TAG_V2: Record<EmploymentSituationCategory, string> = {
  fixed_term_or_termination: "befristung_kuendigung",
  short_time_or_business_risk: "kurzarbeit_betriebskrise",
  health_related: "gesundheitliche_gruende",
  stable_employment: "arbeitsplatz_sicher",
  other: "sonstige_situation",
};

/** All V2 situation tags — used to detect an already-handled lead. */
export const ALL_SITUATION_TAGS_V2: ReadonlyArray<string> =
  Object.values(SITUATION_TAG_V2);

export const SITUATION_INTENT: Record<
  EmploymentSituationCategory,
  SituationIntent
> = {
  fixed_term_or_termination: "precheck",
  short_time_or_business_risk: "precheck",
  health_related: "callback",
  stable_employment: "callback",
  other: "manual_review",
};

export const SITUATION_FUNNEL_PHASE: Record<
  EmploymentSituationCategory,
  FunnelPhase
> = {
  fixed_term_or_termination: FunnelPhase.WAITING_PRECHECK,
  short_time_or_business_risk: FunnelPhase.WAITING_PRECHECK,
  health_related: FunnelPhase.CALLBACK_REQUIRED,
  stable_employment: FunnelPhase.CONSULTATION_REQUIRED,
  other: FunnelPhase.MANUAL_CLARIFICATION,
};

export const SITUATION_LABEL_V2: Record<EmploymentSituationCategory, string> = {
  fixed_term_or_termination: "Befristung / Kündigung",
  short_time_or_business_risk: "Kurzarbeit / Betriebskrise",
  health_related: "Gesundheitliche Gründe",
  stable_employment: "Arbeitsplatz sicher",
  other: "Sonstige Situation",
};

export const SITUATION_EMPLOYMENT_STATUS_V2: Record<
  EmploymentSituationCategory,
  EmploymentStatus
> = {
  fixed_term_or_termination: EmploymentStatus.EMPLOYED_FULL,
  short_time_or_business_risk: EmploymentStatus.EMPLOYED_FULL,
  health_related: EmploymentStatus.EMPLOYED_FULL,
  stable_employment: EmploymentStatus.EMPLOYED_FULL,
  other: EmploymentStatus.OTHER,
};

/** Confidence below this threshold means: do NOT auto-branch → manual review. */
export const SITUATION_CONFIDENCE_THRESHOLD = 0.6;

/**
 * Conflict resolution — when several categories are detected, the highest
 * priority wins (lower number = higher priority). Opt-out (1) is detected
 * separately and short-circuits before this table is consulted.
 */
const CATEGORY_PRIORITY: Record<EmploymentSituationCategory, number> = {
  health_related: 2,
  fixed_term_or_termination: 3,
  short_time_or_business_risk: 4,
  stable_employment: 5,
  other: 6,
};

/** Emoji → category. Scanned on the RAW body (emojis survive folding anyway). */
const EMOJI_CATEGORY: ReadonlyArray<[string, EmploymentSituationCategory]> = [
  ["🟡", "fixed_term_or_termination"],
  ["🔵", "short_time_or_business_risk"],
  ["🩺", "health_related"],
  ["⚪", "stable_employment"],
  ["💬", "other"],
];

/** Lowercase + fold German umlauts/ß so „befristung" and „befristung" match. */
function fold(input: string | undefined): string {
  return (input ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();
}

// ── keyword patterns per category (checked on folded text) ───────────────────
// Each entry keeps a human label so we can persist WHICH keyword matched.

interface KeywordRule {
  label: string;
  re: RegExp;
}

const HEALTH_KEYWORDS: KeywordRule[] = [
  { label: "gesundheitlich", re: /gesundheitlich/ },
  { label: "gesundheitliche gründe", re: /gesundheitliche?\s+gruende/ },
  { label: "gesundheit", re: /\bgesundheit\b/ },
  { label: "krankheit", re: /krankheit|\bkrank\b/ },
  { label: "rücken", re: /\bruecken/ },
  { label: "psychische belastung", re: /psychisch/ },
  { label: "kann Beruf nicht mehr ausüben", re: /beruf\s+.*(nicht\s+mehr).*(ausueben|arbeiten)|(nicht\s+mehr\s+ausueben)/ },
  { label: "reha", re: /\breha\b/ },
  { label: "rentenversicherung", re: /rentenversicherung/ },
  { label: "lta", re: /\blta\b/ },
  { label: "teilhabe am arbeitsleben", re: /teilhabe(\s+am\s+arbeitsleben)?/ },
];

const FIXED_TERM_KEYWORDS: KeywordRule[] = [
  { label: "gelb", re: /\bgelb\b/ },
  // „(?<!un)" so „unbefristet" (→ stable) never trips the befristet rule.
  { label: "befristet", re: /(?<!un)befrist/ },
  { label: "vertrag läuft aus", re: /vertrag\s+(laeuft|endet)(\s+.*)?(aus|ab)?|vertrag\s+.*aus\b|auslaufender\s+vertrag/ },
  { label: "kündigung", re: /kuendigung|gekuendigt/ },
  { label: "jobverlust", re: /jobverlust|job\s+verlust|verliere?\s+(meinen\s+)?job/ },
];

const SHORT_TIME_KEYWORDS: KeywordRule[] = [
  { label: "blau", re: /\bblau\b/ },
  { label: "kurzarbeit", re: /kurzarbeit/ },
  { label: "betrieb in krise", re: /(betrieb|firma)\s+.*(krise|schwierigkeit|probleme)|betriebskrise/ },
  { label: "wirtschaftliche schwierigkeiten", re: /wirtschaftlich(e|en)?\s+(schwierigkeit|probleme|lage)/ },
  { label: "insolvenz", re: /insolven(z|t)|pleite/ },
  { label: "stellenabbau", re: /stellen\s*abbau|stellenabbau|stellen\s+ab\b|baut?\s+stellen\s+ab|abbau\s+von\s+stellen/ },
  { label: "arbeitsplatz unsicher wegen Betrieb", re: /arbeitsplatz\s+.*unsicher\s+.*betrieb|betrieb\s+.*unsicher/ },
];

const STABLE_KEYWORDS: KeywordRule[] = [
  { label: "weiß", re: /\bweiss\b/ },
  { label: "arbeitsplatz sicher", re: /arbeitsplatz\s+.*sicher|sicherer?\s+(job|arbeitsplatz)|job\s+.*sicher/ },
  { label: "unbefristet", re: /unbefristet/ },
  { label: "fest angestellt", re: /fest\s*angestellt|festanstellung/ },
  { label: "alles stabil", re: /alles\s+stabil|\bstabil\b/ },
  { label: "keine kündigung", re: /keine\s+kuendigung/ },
  { label: "nur interessiert", re: /nur\s+interess(iert|e)/ },
];

const OTHER_KEYWORDS: KeywordRule[] = [
  { label: "andere situation", re: /andere?\s+situation|\banders\b|sonstige?s?/ },
  { label: "trifft nicht zu", re: /trifft\s+nicht\s+zu/ },
  { label: "keine der Optionen", re: /keine\s+der\s+optionen|keine\s+option\s+passt|passt\s+(keine|nichts)/ },
];

const INTEREST_KEYWORDS: RegExp[] = [
  /interess(e|iert)/,
  /veraender/,
  /umorientier/,
  /wechsel/,
  /\bgerne\b|\bgern\b/,
  /moechte\s+mich/,
  /langfristig/,
  /neu\s*orientier/,
];

const CATEGORY_KEYWORDS: Record<EmploymentSituationCategory, KeywordRule[]> = {
  health_related: HEALTH_KEYWORDS,
  fixed_term_or_termination: FIXED_TERM_KEYWORDS,
  short_time_or_business_risk: SHORT_TIME_KEYWORDS,
  stable_employment: STABLE_KEYWORDS,
  other: OTHER_KEYWORDS,
};

function quickReplyCategory(
  input: SituationReplyInput,
): EmploymentSituationCategory | null {
  const id = fold(input.buttonId);
  for (const [cat, payload] of Object.entries(SITUATION_QUICK_REPLY) as [
    EmploymentSituationCategory,
    string,
  ][]) {
    if (id && id === payload) return cat;
  }
  // Tolerant title match (colour word / label).
  const title = fold(input.buttonTitle);
  if (!title) return null;
  if (/(gelb|befrist|kuendig)/.test(title)) return "fixed_term_or_termination";
  if (/(blau|kurzarbeit|krise|insolven)/.test(title))
    return "short_time_or_business_risk";
  if (/(gesundheit|rücken|ruecken|krank|reha)/.test(title))
    return "health_related";
  if (/(weiss|weiß|sicher|unbefristet|stabil)/.test(title))
    return "stable_employment";
  if (/(anders|andere|sonstige|💬)/.test(title)) return "other";
  return null;
}

/**
 * Classify a reply to the Beschäftigten-Statusabfrage. Always returns a result;
 * `signalDetected === false` means no situation signal was present at all
 * (the caller should fall back to the generic reply handling).
 */
export function classifyEmploymentSituation(
  input: SituationReplyInput,
): SituationClassification {
  const rawBody = (input.body ?? "").trim();
  const text = fold(input.body);

  // Priority 1: STOP / opt-out. Flagged so the caller runs the opt-out flow.
  const optOut = isOptOutMessage({
    body: input.body,
    buttonTitle: input.buttonTitle,
  });

  // 1) Quick-reply button — authoritative.
  const quick = quickReplyCategory(input);
  if (quick && !optOut) {
    return build(quick, {
      confidence: 0.97,
      source: "quick_reply",
      matched: [`quick_reply:${SITUATION_QUICK_REPLY[quick]}`],
      interest: INTEREST_KEYWORDS.some((re) => re.test(text)),
      optOut,
    });
  }

  // Collect emoji + keyword matches across all categories.
  const matchedCats = new Map<
    EmploymentSituationCategory,
    { weight: number; keywords: string[] }
  >();
  const add = (
    cat: EmploymentSituationCategory,
    weight: number,
    keyword: string,
  ) => {
    const cur = matchedCats.get(cat) ?? { weight: 0, keywords: [] };
    cur.weight = Math.max(cur.weight, weight);
    cur.keywords.push(keyword);
    matchedCats.set(cat, cur);
  };

  for (const [emoji, cat] of EMOJI_CATEGORY) {
    if (rawBody.includes(emoji)) add(cat, 2, emoji);
  }
  if (text) {
    for (const [cat, rules] of Object.entries(CATEGORY_KEYWORDS) as [
      EmploymentSituationCategory,
      KeywordRule[],
    ][]) {
      for (const rule of rules) {
        if (rule.re.test(text)) add(cat, 1, rule.label);
      }
    }
  }

  if (matchedCats.size === 0) {
    // No situation signal at all → let the generic reply handler take over.
    return {
      category: "other",
      intent: "manual_review",
      confidence: optOut ? 1 : 0.2,
      matchedKeywords: [],
      source: "fallback",
      signalDetected: false,
      manualReview: true,
      interest: INTEREST_KEYWORDS.some((re) => re.test(text)),
      optOut,
    };
  }

  // Resolve conflicts by fixed priority (health > fixed > short > stable > other).
  let chosen: EmploymentSituationCategory = "other";
  let best = Number.POSITIVE_INFINITY;
  for (const cat of matchedCats.keys()) {
    if (CATEGORY_PRIORITY[cat] < best) {
      best = CATEGORY_PRIORITY[cat];
      chosen = cat;
    }
  }

  const detail = matchedCats.get(chosen)!;
  // Folding keeps the emoji in `text`, so "emoji-only" = an emoji matched AND
  // there are no latin letters (i.e. no real words) in the message.
  const hasLetters = /[a-z]/.test(text);
  const emojiOnly = detail.weight >= 2 && !hasLetters;
  // Emoji-only = 0.9; emoji+text agreeing = 0.97; keyword only = 0.85.
  let confidence: number;
  if (detail.weight >= 2 && detail.keywords.length > 1) confidence = 0.97;
  else if (detail.weight >= 2) confidence = emojiOnly ? 0.9 : 0.92;
  else confidence = 0.85;

  return build(chosen, {
    confidence,
    source: emojiOnly ? "emoji" : "freetext",
    matched: detail.keywords,
    interest: INTEREST_KEYWORDS.some((re) => re.test(text)),
    optOut,
  });
}

function build(
  category: EmploymentSituationCategory,
  args: {
    confidence: number;
    source: SituationClassification["source"];
    matched: string[];
    interest: boolean;
    optOut: boolean;
  },
): SituationClassification {
  const intent = SITUATION_INTENT[category];
  const manualReview =
    intent === "manual_review" ||
    args.confidence < SITUATION_CONFIDENCE_THRESHOLD;
  return {
    category,
    intent,
    confidence: args.confidence,
    matchedKeywords: args.matched,
    source: args.source,
    signalDetected: true,
    manualReview,
    interest: args.interest,
    optOut: args.optOut,
  };
}
