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
  offen: "bg-sky-50 text-sky-700 ring-sky-200",
  angeschrieben: "bg-amber-50 text-amber-700 ring-amber-200",
  beantwortet: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  erledigt: "bg-slate-100 text-slate-600 ring-slate-200",
  fehlgeschlagen: "bg-rose-50 text-rose-700 ring-rose-200",
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
