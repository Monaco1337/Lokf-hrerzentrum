/**
 * Funnel-Phase — the PROCESS step a lead is currently in.
 *
 * This is intentionally SEPARATE from `LeadStatus` (which describes the
 * COMMUNICATION status, e.g. NEW / CONTACTED / REPLIED). A lead can be
 * "REPLIED" (communication) while its process step is "Wartet auf Unterlagen"
 * (funnel phase) — the two axes never overwrite each other.
 *
 * Stored on the lead as a plain string column (`funnelPhase`) with a
 * backward-compatible default of "none": every existing lead and every existing
 * automation keeps behaving exactly as before until a phase is explicitly set.
 */

export const FunnelPhase = {
  NONE: "none",
  WAITING_ELIGIBILITY: "waiting_for_eligibility",
  ELIGIBILITY_STARTED: "eligibility_started",
  ELIGIBILITY_COMPLETED: "eligibility_completed",
  WAITING_DOCUMENTS: "waiting_for_documents",
  DOCUMENTS_RECEIVED: "documents_received",
  WAITING_APPOINTMENT: "waiting_for_appointment",
  APPOINTMENT_SCHEDULED: "appointment_scheduled",
  QUALIFIED: "qualified",
  COMPLETED: "completed",
} as const;
export type FunnelPhase = (typeof FunnelPhase)[keyof typeof FunnelPhase];

/** German UI labels for each funnel phase. */
export const FUNNEL_PHASE_LABEL: Record<FunnelPhase, string> = {
  none: "Keine Phase",
  waiting_for_eligibility: "Wartet auf Eignungscheck",
  eligibility_started: "Eignungscheck gestartet",
  eligibility_completed: "Eignungscheck abgeschlossen",
  waiting_for_documents: "Wartet auf Unterlagen",
  documents_received: "Unterlagen eingegangen",
  waiting_for_appointment: "Wartet auf Termin",
  appointment_scheduled: "Termin vereinbart",
  qualified: "Qualifiziert",
  completed: "Abgeschlossen",
};

/** Color tone per phase — mapped to Tailwind classes in the UI layer. */
export const FUNNEL_PHASE_TONE: Record<FunnelPhase, string> = {
  none: "slate",
  waiting_for_eligibility: "amber",
  eligibility_started: "sky",
  eligibility_completed: "blue",
  waiting_for_documents: "amber",
  documents_received: "teal",
  waiting_for_appointment: "violet",
  appointment_scheduled: "indigo",
  qualified: "emerald",
  completed: "emerald",
};

/**
 * Ordered ranking for progress display. Higher = further along. `none` is 0 so
 * an unset phase never counts as progress.
 */
export const FUNNEL_PHASE_RANK: Record<FunnelPhase, number> = {
  none: 0,
  waiting_for_eligibility: 1,
  eligibility_started: 2,
  eligibility_completed: 3,
  waiting_for_documents: 4,
  documents_received: 5,
  waiting_for_appointment: 6,
  appointment_scheduled: 7,
  qualified: 8,
  completed: 9,
};

const ALL_FUNNEL_PHASES = Object.values(FunnelPhase) as FunnelPhase[];

/** Narrow an arbitrary string to a valid FunnelPhase (fallback: "none"). */
export function parseFunnelPhase(raw: string | null | undefined): FunnelPhase {
  return ALL_FUNNEL_PHASES.includes(raw as FunnelPhase)
    ? (raw as FunnelPhase)
    : FunnelPhase.NONE;
}

export function isFunnelPhase(raw: string): raw is FunnelPhase {
  return ALL_FUNNEL_PHASES.includes(raw as FunnelPhase);
}

/** Dropdown options for the automation builder (excludes the empty "none"). */
export const FUNNEL_PHASE_OPTIONS: ReadonlyArray<{
  value: FunnelPhase;
  label: string;
}> = ALL_FUNNEL_PHASES.filter((p) => p !== FunnelPhase.NONE).map((p) => ({
  value: p,
  label: FUNNEL_PHASE_LABEL[p],
}));
