/**
 * Pipeline phase definitions for the Lead Control Center kanban.
 *
 * Lives in its own file (extracted from PipelineKanban.tsx) so the kanban
 * component stays focused on rendering while the phase grouping can be
 * reused by other modules (e.g. the lead list grouping in future phases).
 */
import { LeadStatus } from "../types";

export interface PipelinePhase {
  key: "ingress" | "hot" | "prep" | "agency" | "won";
  label: string;
  hint: string;
  /** Encouraging empty-state copy when the column is currently empty. */
  emptyHint: string;
  statuses: ReadonlyArray<LeadStatus>;
  tone: "ingress" | "qualified" | "prep" | "agency" | "won";
}

export const PIPELINE_PHASES: ReadonlyArray<PipelinePhase> = [
  {
    key: "ingress",
    label: "Eingang",
    hint: "Neu · Qualifiziert · Kontakt geplant",
    emptyHint: "Keine neuen Eingänge — Pipeline ist frisch.",
    statuses: [
      LeadStatus.NEW,
      LeadStatus.QUALIFIED,
      LeadStatus.CONTACT_PENDING,
    ],
    tone: "ingress",
  },
  {
    key: "hot",
    label: "Heiß",
    hint: "Sofortige Kontaktaufnahme",
    emptyHint: "Aktuell keine Hot-Leads im Eingang.",
    statuses: [LeadStatus.HOT],
    tone: "qualified",
  },
  {
    key: "prep",
    label: "Vorbereitung",
    hint: "Kontakt · Briefing · Dokumente",
    emptyHint: "Keine Vorgänge in Vorbereitung.",
    statuses: [
      LeadStatus.CONTACTED,
      LeadStatus.CALL_SCHEDULED,
      LeadStatus.BRIEFING_SENT,
      LeadStatus.DOC_PENDING,
      LeadStatus.DOC_READY,
    ],
    tone: "prep",
  },
  {
    key: "agency",
    label: "Behörde",
    hint: "AA-Termin · Gutschein",
    emptyHint: "Keine offenen Behörden-Vorgänge.",
    statuses: [
      LeadStatus.AA_APPOINTMENT_PENDING,
      LeadStatus.AA_APPOINTMENT_DONE,
      LeadStatus.GUTSCHEIN_PENDING,
      LeadStatus.GUTSCHEIN_APPROVED,
    ],
    tone: "agency",
  },
  {
    key: "won",
    label: "Erfolg",
    hint: "Vertrag · Ausbildung · Abschluss",
    emptyHint: "Noch keine Abschlüsse — bald.",
    statuses: [
      LeadStatus.ENROLLED,
      LeadStatus.STARTED,
      LeadStatus.CLOSED,
    ],
    tone: "won",
  },
];
