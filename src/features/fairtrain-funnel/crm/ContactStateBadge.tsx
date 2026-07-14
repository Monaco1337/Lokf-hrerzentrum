/**
 * ContactStateBadge — surfaces the contact-protection state (Kontaktschutz) of a
 * lead: "Wartet auf Eignungscheck", "Wartet auf Unterlagen", "Automationen
 * pausiert" and "Manuell kontaktiert durch [Bearbeiter] am [Zeitpunkt]".
 *
 * Purely presentational — reads fields already resolved on the lead. Renders
 * nothing when there is nothing worth flagging.
 */
import {
  CONTACT_STATE_LABEL,
  CONTACT_STATE_TONE,
  ContactState,
  isWaitingContactState,
} from "@/features/fairtrain-funnel/contactState";

const TONE_CLASS: Record<(typeof CONTACT_STATE_TONE)[ContactState], string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export interface ContactStateBadgeLead {
  contactState: ContactState;
  automationPaused: boolean;
  lastManualContactAt: Date | null;
  lastManualContactBy?: string | null;
  assignedTo?: string | null;
}

/** A single pill for the contact state (nothing when `none`). */
export function ContactStatePill({ state }: { state: ContactState }) {
  if (state === ContactState.NONE) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1 ring-inset ${TONE_CLASS[CONTACT_STATE_TONE[state]]}`}
    >
      {CONTACT_STATE_LABEL[state]}
    </span>
  );
}

/**
 * The full set of contact-protection indicators for a lead: state pill,
 * "Automationen pausiert" and the manual-contact hint.
 */
export function ContactStateBadge({
  lead,
  showManualHint = true,
}: {
  lead: ContactStateBadgeLead;
  /** Also render the "Manuell kontaktiert durch … am …" line. */
  showManualHint?: boolean;
}) {
  const hasState = lead.contactState !== ContactState.NONE;
  const showPaused =
    lead.automationPaused && !isWaitingContactState(lead.contactState);
  if (!hasState && !showPaused && !(showManualHint && lead.lastManualContactAt)) {
    return null;
  }
  const by = lead.lastManualContactBy || lead.assignedTo || null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <ContactStatePill state={lead.contactState} />
      {showPaused ? (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
          Automationen pausiert
        </span>
      ) : null}
      {showManualHint && lead.lastManualContactAt ? (
        <span className="text-[10.5px] text-slate-500">
          Manuell kontaktiert
          {by ? ` durch ${by}` : ""} am{" "}
          {DATE.format(new Date(lead.lastManualContactAt))}
        </span>
      ) : null}
    </span>
  );
}
