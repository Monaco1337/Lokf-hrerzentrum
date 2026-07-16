/**
 * ReplyIntentClassifier — the "Antwort analysieren (KI)" brain.
 *
 * Deterministically classifies an inbound WhatsApp reply (Quick-Reply button
 * OR free text) into a rich analysis: interest yes/no, employment situation,
 * a primary intent and a set of combinable flags plus a confidence score.
 *
 * IMPORTANT (per product direction): this classifier ONLY classifies — it never
 * generates any message text. It is PURE and deterministic (no I/O), so it
 * behaves identically for the live webhook and the retro/backfill run and is
 * fully unit-testable.
 *
 * Quick-Reply buttons are authoritative and always win over free text. When a
 * free-text reply is too ambiguous to branch on safely, `manualReview` is set —
 * the caller then flags the lead "Manuelle Prüfung erforderlich" and does NOT
 * start a (possibly wrong) automation.
 */
import {
  classifyEmploymentQuickReply,
  classifyEmploymentReply,
  type EmploymentReplyInput,
} from "./EmploymentReplyClassifier";
import { isOptOutMessage } from "./WhatsAppOptOutService";

export type ReplyInterest = "yes" | "no" | "unknown";

/**
 * Primary detected intent. Drives the "… erkannt" builder conditions. Ordered by
 * priority when several signals are present (stop wins over everything, etc.).
 */
export type ReplyIntent =
  | "stop"
  | "no_interest"
  | "callback"
  | "question"
  | "employed"
  | "job_seeking"
  | "job_insecure"
  | "career_change"
  | "general_interest"
  | "other";

export type ReplyEmployment =
  | "employed"
  | "job_seeking"
  | "job_insecure"
  | "career_change"
  | "other";

/** Independently combinable detection flags (for UND/ODER conditions). */
export interface ReplyFlags {
  interest: boolean;
  employed: boolean;
  jobSeeking: boolean;
  jobInsecure: boolean;
  careerChange: boolean;
  generalInterest: boolean;
  noInterest: boolean;
  callback: boolean;
  question: boolean;
  stop: boolean;
}

export interface ReplyAnalysis {
  interest: ReplyInterest;
  employment: ReplyEmployment | null;
  intent: ReplyIntent;
  flags: ReplyFlags;
  /** 0..1 confidence in the primary classification. */
  confidence: number;
  /** True when too ambiguous to branch on → manual review, no auto-action. */
  manualReview: boolean;
  originalMessage: string;
  source: "quick_reply" | "freetext" | "fallback";
}

/** Lowercase + fold German umlauts/ß so "möchte" and "moechte" both match. */
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

// ── free-text signal patterns (checked on the folded text) ───────────────────

const CALLBACK_PATTERNS: RegExp[] = [
  /rufen?\s+sie\s+mich\s+an/,
  /ruf\s+mich\s+an/,
  /rueckruf/,
  /zurueck\s*rufen/,
  /koennen\s+sie\s+mich\s+anrufen/,
  /telefon(isch|ieren)?/,
  /(bitte\s+)?anrufen/,
  /erreichen\s+sie\s+mich/,
  /melden?\s+sie\s+sich/,
  /meldet?\s+euch/,
  /meld(e|et)\s+dich/,
  /beratung/,
  /berat(en|er)/,
];

const QUESTION_PATTERNS: RegExp[] = [
  /\bwie\b/,
  /\bwas\b/,
  /\bwann\b/,
  /\bwo\b/,
  /\bwarum\b/,
  /\bwelche/,
  /\bwieviel|\bwie\s+viel/,
  /\bkostet\b/,
  /\bgehalt\b/,
  /\bvoraussetzung/,
  /\binfos?\b/,
  /\bmehr\s+(infos|informationen)/,
];

const NO_INTEREST_PATTERNS: RegExp[] = [
  /kein\s+interesse/,
  /nicht\s+interessiert/,
  /passt\s+(es\s+|gerade\s+|momentan\s+|zurzeit\s+|aktuell\s+|leider\s+)*nicht/,
  /momentan\s+nicht/,
  /aktuell\s+nicht/,
  /zurzeit\s+nicht/,
  /lieber\s+nicht/,
  /nein\s+danke/,
  /brauche\s+(das\s+)?nicht/,
  /leider\s+nein/,
];

// Softer stop/opt-out phrases (regex, not exact). Used only for the AI "STOPP
// erkannt" branch — the actual opt-out ACTION stays driven by the strict
// keyword match in WhatsAppOptOutService (false-positive-safe).
const STOP_PATTERNS: RegExp[] = [
  /keine\s+(weiteren\s+)?nachrichten/,
  /nachrichten\s+.*(stoppen|einstellen|beenden)/,
  /nicht\s+mehr\s+(schreiben|kontaktieren|anschreiben|melden)/,
  /keine\s+werbung/,
  /austragen/,
  /abbestellen/,
];

const INTEREST_PATTERNS: RegExp[] = [
  /interesse/,
  /interessiert/,
  /gerne/,
  /gern/,
  /\bja\b/,
  /klingt\s+(gut|interessant|spannend)/,
  /bin\s+dabei/,
  /wuerde\s+(gerne|gern|mich)/,
  /mehr\s+(erfahren|wissen|infos|informationen)/,
];

const JOB_INSECURE_PATTERNS: RegExp[] = [
  /unsicher/,
  /gekuendigt/,
  /kuendigung/,
  /befristet/,
  /(betrieb|firma)\s+.*(schliess|insolven|pleite)/,
  /insolven/,
  /kurzarbeit/,
  /wackelt/,
  /nicht\s+sicher\s+ob\s+(ich|mein\s+job)/,
  /arbeitsplatz\s+.*(unsicher|weg|verlier)/,
];

// Tolerant job-seeking hints (allow filler words between "suche" and the noun,
// e.g. "Ich suche momentan Arbeit"). Complements the stricter shared classifier.
const JOB_SEEKING_HINTS: RegExp[] = [
  /suche\s+(\w+\s+){0,3}(arbeit|job|stelle|anstellung|beschaeftigung|arbeitsstelle)/,
  /auf\s+(der\s+)?(job|arbeit)s?\s*suche/,
  /arbeitssuchend/,
  /arbeitsuchend/,
  /arbeitslos/,
];

const CAREER_CHANGE_PATTERNS: RegExp[] = [
  /veraender/,
  /umorientier/,
  /neu\s*orientier/,
  /umschul/,
  /quereinstieg/,
  /etwas\s+(neues|anderes)\s+(machen|suchen|probieren)/,
  /beruflich\s+.*(veraender|weiter|neu)/,
  /moechte\s+mich\s+veraender/,
  /wechsel/,
];

function any(patterns: RegExp[], text: string): boolean {
  return patterns.some((re) => re.test(text));
}

/**
 * Full analysis. Priority (highest first):
 *   Quick-Reply button → stop → no-interest → employment/career/insecure →
 *   callback → question → general interest → fallback.
 */
export function analyzeReply(input: EmploymentReplyInput): ReplyAnalysis {
  const original = (input.body ?? "").trim();
  const text = fold(input.body);

  // 1) STOP / opt-out — always wins. Strict keyword match OR a softer stop
  //    phrase ("keine weiteren Nachrichten", "nicht mehr schreiben", …).
  if (isOptOutMessage(input) || any(STOP_PATTERNS, text)) {
    return build({
      intent: "stop",
      interest: "no",
      employment: null,
      source: input.buttonTitle ? "quick_reply" : "freetext",
      confidence: 1,
      original,
      set: { stop: true, noInterest: true },
    });
  }

  // 2) Quick-Reply button is authoritative for the employment situation.
  const quick = classifyEmploymentQuickReply(input);
  if (quick) {
    return build({
      intent: quick,
      interest: "yes",
      employment: quick,
      source: "quick_reply",
      confidence: 1,
      original,
      set: {
        interest: true,
        employed: quick === "employed",
        jobSeeking: quick === "job_seeking",
      },
    });
  }

  if (!text) {
    return build({
      intent: "other",
      interest: "unknown",
      employment: null,
      source: "fallback",
      confidence: 0,
      original,
      set: {},
      manualReview: true,
    });
  }

  const hasInterest = any(INTEREST_PATTERNS, text);
  const hasNoInterest = any(NO_INTEREST_PATTERNS, text);
  const hasCallback = any(CALLBACK_PATTERNS, text);
  const hasQuestion = any(QUESTION_PATTERNS, text);
  const hasInsecure = any(JOB_INSECURE_PATTERNS, text);
  const hasCareer = any(CAREER_CHANGE_PATTERNS, text);
  const employment = classifyEmploymentReply(input);
  const detectedEmployed = employment.source === "freetext" && employment.situation === "employed";
  const detectedSeeking =
    any(JOB_SEEKING_HINTS, text) ||
    (employment.source === "freetext" && employment.situation === "job_seeking");

  // 3) Explicit rejection (unless it also clearly states interest, which "no"
  //    patterns are written to avoid) wins over the softer situation signals.
  if (hasNoInterest && !hasInterest) {
    return build({
      intent: "no_interest",
      interest: "no",
      employment: null,
      source: "freetext",
      confidence: 0.85,
      original,
      set: { noInterest: true },
    });
  }

  // 4) Concrete situations. Career change / insecurity are more specific than a
  //    plain employed/seeking classification, so they are checked first.
  if (hasCareer) {
    return build({
      intent: "career_change",
      interest: "yes",
      employment: "career_change",
      source: "freetext",
      confidence: 0.8,
      original,
      set: { interest: true, careerChange: true, employed: detectedEmployed },
    });
  }
  if (hasInsecure) {
    return build({
      intent: "job_insecure",
      interest: "yes",
      employment: "job_insecure",
      source: "freetext",
      confidence: 0.78,
      original,
      set: { interest: true, jobInsecure: true },
    });
  }
  if (detectedSeeking) {
    return build({
      intent: "job_seeking",
      interest: "yes",
      employment: "job_seeking",
      source: "freetext",
      confidence: 0.82,
      original,
      set: { interest: true, jobSeeking: true },
    });
  }
  if (detectedEmployed) {
    return build({
      intent: "employed",
      interest: hasInterest ? "yes" : "unknown",
      employment: "employed",
      source: "freetext",
      confidence: 0.8,
      original,
      set: { interest: hasInterest, employed: true },
    });
  }

  // 5) Callback / question requests (no situation stated).
  if (hasCallback) {
    return build({
      intent: "callback",
      interest: hasInterest ? "yes" : "unknown",
      employment: null,
      source: "freetext",
      confidence: 0.8,
      original,
      set: { callback: true, interest: hasInterest, question: hasQuestion },
    });
  }
  if (hasQuestion) {
    return build({
      intent: "question",
      interest: hasInterest ? "yes" : "unknown",
      employment: null,
      source: "freetext",
      confidence: 0.7,
      original,
      set: { question: true, interest: hasInterest },
    });
  }

  // 6) General interest without any concrete situation.
  if (hasInterest) {
    return build({
      intent: "general_interest",
      interest: "yes",
      employment: null,
      source: "freetext",
      confidence: 0.65,
      original,
      set: { interest: true, generalInterest: true },
    });
  }

  // 7) Nothing recognised → manual review, never auto-branch.
  return build({
    intent: "other",
    interest: "unknown",
    employment: "other",
    source: "fallback",
    confidence: 0.2,
    original,
    set: {},
    manualReview: true,
  });
}

/** Confidence below this threshold means the reply needs manual review. */
export const MANUAL_REVIEW_THRESHOLD = 0.5;

function build(args: {
  intent: ReplyIntent;
  interest: ReplyInterest;
  employment: ReplyEmployment | null;
  source: ReplyAnalysis["source"];
  confidence: number;
  original: string;
  set: Partial<ReplyFlags>;
  manualReview?: boolean;
}): ReplyAnalysis {
  const flags: ReplyFlags = {
    interest: false,
    employed: false,
    jobSeeking: false,
    jobInsecure: false,
    careerChange: false,
    generalInterest: false,
    noInterest: false,
    callback: false,
    question: false,
    stop: false,
    ...args.set,
  };
  return {
    intent: args.intent,
    interest: args.interest,
    employment: args.employment,
    flags,
    confidence: args.confidence,
    manualReview: args.manualReview ?? args.confidence < MANUAL_REVIEW_THRESHOLD,
    originalMessage: args.original.slice(0, 1000),
    source: args.source,
  };
}

/** Human-readable label per intent (timeline / audit / UI). */
export const REPLY_INTENT_LABEL: Record<ReplyIntent, string> = {
  stop: "STOPP / Abmeldung",
  no_interest: "Kein Interesse",
  callback: "Rückruf gewünscht",
  question: "Frage gestellt",
  employed: "Beschäftigt",
  job_seeking: "Arbeitssuchend",
  job_insecure: "Arbeitsplatz unsicher",
  career_change: "Berufliche Veränderung gewünscht",
  general_interest: "Allgemeines Interesse",
  other: "Sonstige Situation",
};

export const REPLY_INTEREST_LABEL: Record<ReplyInterest, string> = {
  yes: "Interesse vorhanden",
  no: "Kein Interesse",
  unknown: "Unklar",
};
