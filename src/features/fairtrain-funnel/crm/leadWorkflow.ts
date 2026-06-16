/**
 * Guided workflow — what to do next, in plain German.
 *
 * Lives in its own file (extracted from leadLabels.ts in Phase 2) so the
 * label-and-tone module stays focused on visual mapping and the workflow
 * definitions don't push it past the max-lines guardrail. The workflow map
 * is consumed by the NextStep card on the lead detail page and by the
 * status changer dropdown.
 *
 * Each `WorkflowStep` describes the recommended next move for an operator:
 *   - `next` is the status the primary CTA advances to (null for terminal)
 *   - `action` is the verb on that primary button (German)
 *   - `headline` + `hint` carry the editorial copy
 *   - `tone` drives the colour signal (urgent/active/wait/done/stopped)
 */
import { LeadStatus } from "../types";

export type WorkflowTone = "urgent" | "active" | "wait" | "done" | "stopped";

export interface WorkflowStep {
  /** the status the primary button advances to (null = terminal / no primary) */
  next: LeadStatus | null;
  /** label on the primary action button */
  action: string;
  /** short headline above the card */
  headline: string;
  /** one calm sentence telling the user what to do */
  hint: string;
  tone: WorkflowTone;
}

export const WORKFLOW: Record<LeadStatus, WorkflowStep> = {
  [LeadStatus.NEW]: {
    next: LeadStatus.QUALIFIED,
    action: "Lead qualifizieren",
    headline: "Neuer Lead – jetzt prüfen",
    hint: "Die Begrüßung ist automatisch raus. Prüfe die Eignung und qualifiziere den Lead.",
    tone: "active",
  },
  [LeadStatus.QUALIFIED]: {
    next: LeadStatus.CONTACT_PENDING,
    action: "Kontakt planen",
    headline: "Qualifiziert – Kontakt aufnehmen",
    hint: "Markiere den Lead als kontaktbereit. Im nächsten Schritt rufst du an.",
    tone: "active",
  },
  [LeadStatus.HOT]: {
    next: LeadStatus.CONTACTED,
    action: "Jetzt kontaktieren",
    headline: "Heißer Lead – sofort melden",
    hint: "Hohe Abschlusschance. Kontaktiere den Lead schnellstmöglich.",
    tone: "urgent",
  },
  [LeadStatus.CONTACT_PENDING]: {
    next: LeadStatus.CONTACTED,
    action: "Jetzt kontaktieren",
    headline: "Kontakt geplant – durchrufen",
    hint: "Ruf den Lead an. Sobald das Gespräch lief, als kontaktiert markieren.",
    tone: "active",
  },
  [LeadStatus.CONTACTED]: {
    next: LeadStatus.CALL_SCHEDULED,
    action: "Folgetermin festlegen",
    headline: "Kontaktiert – Folgetermin vereinbaren",
    hint: "Halte das nächste Telefonat fest, in dem ihr die Eignung im Detail durchgeht.",
    tone: "active",
  },
  [LeadStatus.CALL_SCHEDULED]: {
    next: LeadStatus.BRIEFING_SENT,
    action: "Briefing versenden",
    headline: "Folgetermin steht",
    hint: "Schick das Infomaterial / Briefing raus, damit der Lead optimal vorbereitet ist.",
    tone: "wait",
  },
  [LeadStatus.BRIEFING_SENT]: {
    next: LeadStatus.DOC_PENDING,
    action: "Dokumente anfordern",
    headline: "Briefing versendet",
    hint: "Bitte den Lead jetzt um die nötigen Unterlagen (Lebenslauf, Ausweis, Zeugnisse).",
    tone: "active",
  },
  [LeadStatus.DOC_PENDING]: {
    next: LeadStatus.DOC_READY,
    action: "Dokumente vollständig",
    headline: "Warten auf Dokumente",
    hint: "Sobald alle Unterlagen da sind, hier als vollständig bestätigen.",
    tone: "wait",
  },
  [LeadStatus.DOC_READY]: {
    next: LeadStatus.AA_APPOINTMENT_PENDING,
    action: "AA-Termin anstoßen",
    headline: "Unterlagen komplett",
    hint: "Vereinbare den Termin bei der Agentur für Arbeit.",
    tone: "active",
  },
  [LeadStatus.AA_APPOINTMENT_PENDING]: {
    next: LeadStatus.AA_APPOINTMENT_DONE,
    action: "Termin erledigt",
    headline: "AA-Termin läuft",
    hint: "Markiere den Termin als erledigt, sobald er stattgefunden hat.",
    tone: "wait",
  },
  [LeadStatus.AA_APPOINTMENT_DONE]: {
    next: LeadStatus.GUTSCHEIN_PENDING,
    action: "Gutschein beantragt",
    headline: "Termin erledigt",
    hint: "Stelle den Gutschein-Antrag und markiere ihn als beantragt.",
    tone: "active",
  },
  [LeadStatus.GUTSCHEIN_PENDING]: {
    next: LeadStatus.GUTSCHEIN_APPROVED,
    action: "Gutschein bewilligt",
    headline: "Gutschein in Bearbeitung",
    hint: "Sobald der Gutschein bewilligt ist, hier bestätigen.",
    tone: "wait",
  },
  [LeadStatus.GUTSCHEIN_APPROVED]: {
    next: LeadStatus.ENROLLED,
    action: "Vertrag bestätigen",
    headline: "Gutschein bewilligt",
    hint: "Vertrag mit dem Lead schließen — sobald unterschrieben, hier bestätigen.",
    tone: "done",
  },
  [LeadStatus.ENROLLED]: {
    next: LeadStatus.STARTED,
    action: "Ausbildungsstart bestätigen",
    headline: "Vertrag unterzeichnet",
    hint: "Sobald die Ausbildung tatsächlich startet, hier markieren.",
    tone: "done",
  },
  [LeadStatus.STARTED]: {
    next: LeadStatus.CLOSED,
    action: "Vorgang abschließen",
    headline: "Ausbildung läuft",
    hint: "Wenn der Lead-Prozess komplett erledigt ist, hier final abschließen.",
    tone: "done",
  },
  [LeadStatus.CLOSED]: {
    next: null,
    action: "",
    headline: "Erfolgreich abgeschlossen",
    hint: "Dieser Vorgang ist erfolgreich abgeschlossen.",
    tone: "done",
  },
  [LeadStatus.LOST]: {
    next: null,
    action: "",
    headline: "Verloren",
    hint: "Dieser Lead ist abgesprungen oder hat sich nicht mehr gemeldet.",
    tone: "stopped",
  },
  [LeadStatus.REJECTED]: {
    next: null,
    action: "",
    headline: "Abgelehnt",
    hint: "Dieser Lead wurde abgelehnt.",
    tone: "stopped",
  },
  [LeadStatus.BLOCKED]: {
    next: null,
    action: "",
    headline: "Blockiert",
    hint: "Dieser Lead ist blockiert.",
    tone: "stopped",
  },
};
