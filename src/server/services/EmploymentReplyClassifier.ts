/**
 * EmploymentReplyClassifier — maps an inbound WhatsApp reply (Quick-Reply button
 * OR free text) to the lead's employment situation.
 *
 * Three canonical situations drive the reactivation branching:
 *   • employed     ("Beschäftigt")        → status geklärt   → Beschäftigten-Flow
 *   • job_seeking  ("Arbeitssuchend")     → status geklärt   → Arbeitssuchenden-Flow
 *   • other        ("Sonstige Situation") → Klärung nötig    → Klärungs-Flow
 *
 * The classifier is PURE and deterministic (no I/O), so it is fully unit-testable
 * and behaves identically for the live webhook and the retro/backfill run.
 * Quick-Reply buttons win over free text; ambiguous free text falls back to
 * "other" (→ manual review) — it never guesses aggressively.
 */
import { EmploymentStatus } from "@/features/fairtrain-funnel/types";

export type EmploymentSituation = "employed" | "job_seeking" | "other";

export interface EmploymentReplyInput {
  /** Stable Meta quick-reply payload id (button reply). */
  buttonId?: string | undefined;
  /** Quick-reply button label as shown to the lead. */
  buttonTitle?: string | undefined;
  /** Free-text message body. */
  body?: string | undefined;
}

export interface EmploymentClassification {
  situation: EmploymentSituation;
  /** How the situation was determined — quick-reply is authoritative. */
  source: "quick_reply" | "freetext" | "fallback";
}

/** Stable Meta quick-reply payload ids for the situation buttons. */
export const EMPLOYMENT_QUICK_REPLY = {
  EMPLOYED: "situation_beschaeftigt",
  JOB_SEEKING: "situation_arbeitssuchend",
  OTHER: "situation_sonstige",
} as const;

/** Canonical lead tag written per situation (idempotency marker). */
export const SITUATION_TAG: Record<EmploymentSituation, string> = {
  employed: "beschaeftigt",
  job_seeking: "arbeitssuchend",
  other: "sonstige_situation",
};

/** Funnel-phase tag per situation. */
export const SITUATION_FUNNEL_TAG: Record<EmploymentSituation, string> = {
  employed: "funnel_status_geklaert",
  job_seeking: "funnel_status_geklaert",
  other: "funnel_klaerung_erforderlich",
};

/** Human funnel-phase label (timeline / audit). */
export const SITUATION_FUNNEL_LABEL: Record<EmploymentSituation, string> = {
  employed: "Status geklärt",
  job_seeking: "Status geklärt",
  other: "Klärung erforderlich",
};

/** German UI label per situation. */
export const SITUATION_LABEL: Record<EmploymentSituation, string> = {
  employed: "Beschäftigt",
  job_seeking: "Arbeitssuchend",
  other: "Sonstige Situation",
};

/** Employment enum value stored on the lead per situation. */
export const SITUATION_EMPLOYMENT_STATUS: Record<
  EmploymentSituation,
  EmploymentStatus
> = {
  employed: EmploymentStatus.EMPLOYED_FULL,
  job_seeking: EmploymentStatus.UNEMPLOYED,
  other: EmploymentStatus.OTHER,
};

/** All situation tags — used to detect an already-classified lead. */
export const ALL_SITUATION_TAGS: ReadonlyArray<string> =
  Object.values(SITUATION_TAG);

/** Lowercase + fold German umlauts/ß so "beschäftigt" and "beschaeftigt" match. */
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

// Order matters: job-seeking phrases are specific and checked first so a
// generic "arbeite …" (employed) can never shadow "arbeitssuchend"/"arbeitslos".
const JOB_SEEKING_PATTERNS: RegExp[] = [
  /arbeitssuchend/,
  /arbeitsuchend/,
  /arbeitslos/,
  /arbeit\s*suchend/,
  /suche\s+(eine[nm]?\s+)?(arbeit|job|stelle|anstellung)/,
  /(auf\s+)?job\s*suche/,
  /arbeits\s*suche/,
  /ohne\s+(arbeit|job|anstellung|beschaeftigung)/,
  /keine\s+(arbeit|anstellung|beschaeftigung)/,
  /derzeit\s+nicht\s+(beschaeftigt|angestellt)/,
];

const EMPLOYED_PATTERNS: RegExp[] = [
  /beschaeftigt/,
  /fest\s*angestellt/,
  /festanstellung/,
  /\bangestellt\b/,
  /berufstaetig/,
  /erwerbstaetig/,
  /\bin\s+arbeit\b/,
  /noch\s+im\s+job/,
  /\bim\s+job\b/,
  /habe\s+(einen\s+)?job/,
  /\barbeite\b/,
  /vollzeit/,
  /teilzeit/,
  /\bin\s+lohn\b/,
];

/** Classify a Quick-Reply button only (id first, then tolerant title match). */
export function classifyEmploymentQuickReply(
  input: EmploymentReplyInput,
): EmploymentSituation | null {
  const id = fold(input.buttonId);
  if (id === EMPLOYMENT_QUICK_REPLY.EMPLOYED) return "employed";
  if (id === EMPLOYMENT_QUICK_REPLY.JOB_SEEKING) return "job_seeking";
  if (id === EMPLOYMENT_QUICK_REPLY.OTHER) return "other";

  const title = fold(input.buttonTitle);
  if (!title) return null;
  if (JOB_SEEKING_PATTERNS.some((re) => re.test(title))) return "job_seeking";
  if (EMPLOYED_PATTERNS.some((re) => re.test(title))) return "employed";
  if (/(sonstige|weder|anders|etwas\s+anderes|selbststaendig|selbstaendig|rente|student|ausbildung)/.test(title))
    return "other";
  return null;
}

/** Classify free text. Returns null when nothing matches (caller decides). */
export function classifyEmploymentFreeText(
  body: string | undefined,
): EmploymentSituation | null {
  const text = fold(body);
  if (!text) return null;
  if (JOB_SEEKING_PATTERNS.some((re) => re.test(text))) return "job_seeking";
  if (EMPLOYED_PATTERNS.some((re) => re.test(text))) return "employed";
  return null;
}

/**
 * Full classification: quick-reply (authoritative) → free text → fallback.
 * Always returns a situation — an unrecognised reply becomes "other" so it is
 * routed to manual clarification rather than being dropped.
 */
export function classifyEmploymentReply(
  input: EmploymentReplyInput,
): EmploymentClassification {
  const quick = classifyEmploymentQuickReply(input);
  if (quick) return { situation: quick, source: "quick_reply" };

  const free = classifyEmploymentFreeText(input.body);
  if (free) return { situation: free, source: "freetext" };

  return { situation: "other", source: "fallback" };
}
