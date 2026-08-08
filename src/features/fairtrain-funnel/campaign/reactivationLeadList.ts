/**
 * reactivationLeadList — client-safe model for the "alle importierten Leads"
 * table on the Reaktivierung/Kommunikation page.
 *
 * A single, mutually-exclusive lifecycle state per lead so the operator sees at
 * a glance which of the imported Alt-Leads are still open, which were already
 * contacted (and are therefore locked against a second Erstkontakt), which
 * replied, which are done/handed over, and which failed. The derivation here
 * mirrors the DB filters in LeadRepository so the badge always matches the tab.
 */

/** The failed WhatsApp tracking statuses (kept in sync with CampaignKpisQuery). */
export const FAILED_WHATSAPP_STATUSES: ReadonlyArray<string> = [
  "fehlgeschlagen",
  "nummer_ungueltig",
  "nicht_registriert",
  "nicht_erreichbar",
];

export const REACTIVATION_LEAD_STATES = [
  "offen",
  "angeschrieben",
  "beantwortet",
  "erledigt",
  "fehlgeschlagen",
] as const;

export type ReactivationLeadState = (typeof REACTIVATION_LEAD_STATES)[number];

export const REACTIVATION_LEAD_STATE_LABEL: Record<
  ReactivationLeadState,
  string
> = {
  offen: "Offen",
  angeschrieben: "Angeschrieben",
  beantwortet: "Beantwortet",
  erledigt: "Erledigt",
  fehlgeschlagen: "Fehlgeschlagen",
};

/** Short one-liner shown under the filter chip / as a tooltip. */
export const REACTIVATION_LEAD_STATE_HINT: Record<
  ReactivationLeadState,
  string
> = {
  offen: "Noch nicht kontaktiert – wird beim nächsten Versand angeschrieben.",
  angeschrieben:
    "Erstkontakt gesendet – gesperrt, wird nie erneut erst-kontaktiert.",
  beantwortet: "Hat geantwortet – der KI-Antwort-Router übernimmt.",
  erledigt: "Abgeschlossen, in den Funnel übernommen oder ausgeschlossen.",
  fehlgeschlagen: "Versand fehlgeschlagen (z. B. ungültige Nummer).",
};

export const REACTIVATION_LEAD_STATE_TONE: Record<
  ReactivationLeadState,
  string
> = {
  offen: "bg-sky-500/15 text-sky-300 ring-sky-500/25",
  angeschrieben: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  beantwortet: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  erledigt: "bg-white/[0.06] text-[#aab4ae] ring-white/[0.1]",
  fehlgeschlagen: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

/** A UI-safe row for the imported-leads table (no server types leak here). */
export interface ReactivationLeadRow {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  state: ReactivationLeadState;
  /** When the Erstkontakt went out (null while still open). */
  contactedAt: Date | null;
  /** Latest relevant activity for sorting/display. */
  lastActivityAt: Date | null;
}

/** Fields needed to derive the state — a subset of LeadSummary. */
export interface ReactivationStateInput {
  leadType: string;
  campaignCompleted: boolean;
  reactivationExcluded: boolean;
  communicationStarted: boolean;
  lastWhatsappReplyAt: Date | null;
  whatsappStatus: string;
}

/**
 * The minimal, RAW cohort row the repository returns for the imported-leads
 * board. Deliberately NOT run through the strict LeadSummary zod parsing, so a
 * single lead with a legacy/invalid enum value can never crash the whole table.
 * All filtering, counting and pagination happen in memory from this one query.
 */
export interface ReactivationCohortRow extends ReactivationStateInput {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  firstContactSentAt: Date | null;
  createdAt: Date;
}

/**
 * Single source of truth for a lead's reactivation state. Priority (top wins),
 * mirrored exactly by the DB where-builders so counts, tabs and badges agree:
 *   erledigt → fehlgeschlagen → beantwortet → angeschrieben → offen
 */
export function deriveReactivationLeadState(
  lead: ReactivationStateInput,
): ReactivationLeadState {
  if (
    lead.campaignCompleted ||
    lead.leadType !== "alt_lead" ||
    lead.reactivationExcluded
  ) {
    return "erledigt";
  }
  if (FAILED_WHATSAPP_STATUSES.includes(lead.whatsappStatus)) {
    return "fehlgeschlagen";
  }
  if (lead.lastWhatsappReplyAt) return "beantwortet";
  if (lead.communicationStarted) return "angeschrieben";
  return "offen";
}
