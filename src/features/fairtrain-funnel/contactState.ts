/**
 * Contact protection ("Kontaktschutz") — handling lifecycle for leads that a
 * human already worked (call / Multichat) and that now wait for the applicant to
 * act. It is SEPARATE from the pipeline `status` and the campaign `campaignStatus`
 * and exists purely to stop further AUTOMATIC outreach.
 *
 * Shared by the UI (badges, Multichat resolution menu) and the server
 * (ContactGuardService) so both agree on the exact same vocabulary.
 */
import { z } from "zod";

export const ContactState = {
  NONE: "none",
  WAITING_FOR_FUNNEL: "waiting_for_funnel",
  WAITING_FOR_DOCUMENTS: "waiting_for_documents",
  MANUALLY_CONTACTED: "manually_contacted",
  CONVERSATION_COMPLETED: "conversation_completed",
  NO_INTEREST: "no_interest",
  DOCUMENTS_RECEIVED: "documents_received",
} as const;
export type ContactState = (typeof ContactState)[keyof typeof ContactState];

export const ContactStateSchema = z.enum(
  Object.values(ContactState) as [ContactState, ...ContactState[]],
);

export function parseContactState(value: string | null | undefined): ContactState {
  const r = ContactStateSchema.safeParse(value);
  return r.success ? r.data : ContactState.NONE;
}

export const CONTACT_STATE_LABEL: Record<ContactState, string> = {
  none: "—",
  waiting_for_funnel: "Wartet auf Eignungscheck",
  waiting_for_documents: "Wartet auf Unterlagen",
  manually_contacted: "Manuell kontaktiert",
  conversation_completed: "Gespräch abgeschlossen",
  no_interest: "Kein Interesse",
  documents_received: "Unterlagen eingegangen",
};

/** Short tone key → mapped to Tailwind classes in the UI layer. */
export const CONTACT_STATE_TONE: Record<
  ContactState,
  "slate" | "amber" | "violet" | "rose" | "emerald"
> = {
  none: "slate",
  waiting_for_funnel: "amber",
  waiting_for_documents: "amber",
  manually_contacted: "violet",
  conversation_completed: "slate",
  no_interest: "rose",
  documents_received: "emerald",
};

/**
 * Contact states that BLOCK automatic outbound (WhatsApp + e-mail).
 *
 * `documents_received` is intentionally NOT here: the applicant acted and the
 * lead is ready for a human again — but `reactivationExcluded` still keeps it
 * out of fresh campaigns.
 */
export const CONTACT_BLOCKING_STATES: ReadonlySet<ContactState> = new Set([
  ContactState.WAITING_FOR_FUNNEL,
  ContactState.WAITING_FOR_DOCUMENTS,
  ContactState.MANUALLY_CONTACTED,
  ContactState.CONVERSATION_COMPLETED,
  ContactState.NO_INTEREST,
]);

/** Contact states that indicate the lead is waiting on the applicant. */
export function isWaitingContactState(state: ContactState): boolean {
  return (
    state === ContactState.WAITING_FOR_FUNNEL ||
    state === ContactState.WAITING_FOR_DOCUMENTS
  );
}

// ── Multichat "Erledigt" resolutions ────────────────────────────────────────
// The choices an agent picks when closing a Multichat conversation. Each maps to
// a contact state and whether the lead is excluded from future reactivation.

export const MANUAL_RESOLUTIONS = [
  {
    id: "done",
    label: "Erledigt – kein weiterer Kontakt",
    contactState: ContactState.CONVERSATION_COMPLETED,
    reactivationExcluded: true,
  },
  {
    id: "waiting_funnel",
    label: "Wartet auf Eignungscheck",
    contactState: ContactState.WAITING_FOR_FUNNEL,
    reactivationExcluded: true,
  },
  {
    id: "waiting_documents",
    label: "Wartet auf Unterlagen",
    contactState: ContactState.WAITING_FOR_DOCUMENTS,
    reactivationExcluded: true,
  },
  {
    id: "callback",
    label: "Rückruf vereinbart",
    contactState: ContactState.MANUALLY_CONTACTED,
    reactivationExcluded: true,
  },
  {
    id: "no_interest",
    label: "Kein Interesse",
    contactState: ContactState.NO_INTEREST,
    reactivationExcluded: true,
  },
] as const;

export type ManualResolutionId = (typeof MANUAL_RESOLUTIONS)[number]["id"];

export const ManualResolutionSchema = z.enum(
  MANUAL_RESOLUTIONS.map((r) => r.id) as [ManualResolutionId, ...ManualResolutionId[]],
);

export function manualResolution(id: ManualResolutionId) {
  return MANUAL_RESOLUTIONS.find((r) => r.id === id)!;
}
