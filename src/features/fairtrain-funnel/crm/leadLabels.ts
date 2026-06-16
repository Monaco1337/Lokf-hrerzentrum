/**
 * German-facing labels, tones and the guided workflow map for the CRM.
 *
 * One source of truth so the Lead detail, Lead list and dashboards all speak
 * the same plain German ("Kontaktiert", "Blockiert", …) and share the same
 * colour language. No technical enum codes ever reach the screen.
 */
import {
  EmploymentStatus,
  FunnelPath,
  LeadPriority,
  LeadStatus,
  PreferredLocation,
} from "../types";

export interface Tone {
  label: string;
  /** small status dot */
  dot: string;
  /** pill background + text + ring */
  pill: string;
}

// ---------------------------------------------------------------------------
// Lead status
// ---------------------------------------------------------------------------
export const STATUS_TONE: Record<LeadStatus, Tone> = {
  [LeadStatus.NEW]: {
    label: "Neu",
    dot: "bg-brand-500",
    pill: "bg-brand-50 text-brand-700 ring-brand-100",
  },
  [LeadStatus.QUALIFIED]: {
    label: "Qualifiziert",
    dot: "bg-brand-500",
    pill: "bg-brand-50 text-brand-700 ring-brand-100",
  },
  [LeadStatus.HOT]: {
    label: "Heiß",
    dot: "bg-accent-500",
    pill: "bg-accent-50 text-accent-700 ring-accent-100",
  },
  [LeadStatus.CONTACT_PENDING]: {
    label: "Kontakt geplant",
    dot: "bg-brand-500",
    pill: "bg-brand-50 text-brand-700 ring-brand-100",
  },
  [LeadStatus.CONTACTED]: {
    label: "Kontaktiert",
    dot: "bg-brand-600",
    pill: "bg-brand-50 text-brand-700 ring-brand-100",
  },
  [LeadStatus.CALL_SCHEDULED]: {
    label: "Telefonat geplant",
    dot: "bg-brand-600",
    pill: "bg-brand-50 text-brand-700 ring-brand-100",
  },
  [LeadStatus.BRIEFING_SENT]: {
    label: "Briefing versendet",
    dot: "bg-brand-600",
    pill: "bg-brand-50 text-brand-700 ring-brand-100",
  },
  [LeadStatus.DOC_PENDING]: {
    label: "Dokumente offen",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-800 ring-amber-100",
  },
  [LeadStatus.DOC_READY]: {
    label: "Dokumente vollständig",
    dot: "bg-brand-600",
    pill: "bg-brand-50 text-brand-700 ring-brand-100",
  },
  [LeadStatus.AA_APPOINTMENT_PENDING]: {
    label: "AA-Termin offen",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-800 ring-amber-100",
  },
  [LeadStatus.AA_APPOINTMENT_DONE]: {
    label: "AA-Termin erledigt",
    dot: "bg-indigo-500",
    pill: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  },
  [LeadStatus.GUTSCHEIN_PENDING]: {
    label: "Gutschein beantragt",
    dot: "bg-indigo-500",
    pill: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  },
  [LeadStatus.GUTSCHEIN_APPROVED]: {
    label: "Gutschein bewilligt",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  [LeadStatus.ENROLLED]: {
    label: "Vertrag unterzeichnet",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  [LeadStatus.STARTED]: {
    label: "Ausbildung läuft",
    dot: "bg-emerald-600",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  [LeadStatus.CLOSED]: {
    label: "Erfolgreich abgeschlossen",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  [LeadStatus.LOST]: {
    label: "Verloren",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  [LeadStatus.REJECTED]: {
    label: "Abgelehnt",
    dot: "bg-red-500",
    pill: "bg-red-50 text-red-700 ring-red-100",
  },
  [LeadStatus.BLOCKED]: {
    label: "Blockiert",
    dot: "bg-slate-500",
    pill: "bg-slate-200 text-slate-700 ring-slate-300",
  },
};

export function statusLabel(status: LeadStatus): string {
  return STATUS_TONE[status].label;
}

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------
export const PRIORITY_TONE: Record<LeadPriority, Tone> = {
  [LeadPriority.HOT]: {
    label: "Heiß",
    dot: "bg-accent-500",
    pill: "bg-accent-50 text-accent-700 ring-accent-100",
  },
  [LeadPriority.WARM]: {
    label: "Warm",
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-800 ring-amber-100",
  },
  [LeadPriority.COLD]: {
    label: "Kalt",
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-600 ring-slate-200",
  },
  [LeadPriority.BLOCKED]: {
    label: "Blockiert",
    dot: "bg-slate-500",
    pill: "bg-slate-200 text-slate-700 ring-slate-300",
  },
};

// ---------------------------------------------------------------------------
// Other enums
// ---------------------------------------------------------------------------
export const FUNNEL_LABEL: Record<FunnelPath, string> = {
  [FunnelPath.UNEMPLOYED]: "Arbeitssuchend",
  [FunnelPath.EMPLOYED]: "Berufstätig",
};

export const EMPLOYMENT_LABEL: Record<EmploymentStatus, string> = {
  [EmploymentStatus.UNEMPLOYED]: "Arbeitslos",
  [EmploymentStatus.EMPLOYED_FULL]: "Vollzeit angestellt",
  [EmploymentStatus.EMPLOYED_PART]: "Teilzeit angestellt",
  [EmploymentStatus.MARGINAL]: "Minijob",
  [EmploymentStatus.OTHER]: "Sonstiges",
};

export const LOCATION_LABEL: Record<PreferredLocation, string> = {
  [PreferredLocation.BERLIN]: "Berlin",
  [PreferredLocation.SAALFELD]: "Saalfeld",
  [PreferredLocation.UNDECIDED]: "Noch offen",
};

export const CONSENT_LABEL: Record<string, string> = {
  PRIVACY: "Datenschutz",
  EMAIL: "E-Mail",
  WHATSAPP: "WhatsApp",
  PHONE: "Telefon",
  MARKETING: "Marketing",
  SMS: "SMS",
};

export const CHANNEL_LABEL: Record<string, string> = {
  EMAIL: "E-Mail",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  PHONE: "Telefon",
};

export function channelLabel(channel: string): string {
  return CHANNEL_LABEL[channel] ?? channel;
}

export function consentLabel(type: string): string {
  return CONSENT_LABEL[type] ?? type;
}

export const DOCUMENT_LABEL: Record<string, string> = {
  CV: "Lebenslauf",
  AA_REASONING: "AA-Begründung",
  AA_GUIDE: "AA-Leitfaden",
  LOCATION_INFO: "Standort-Infos",
  HOUSING_SAALFELD: "Wohnen Saalfeld",
  WEITERBILDUNG_INFO: "Weiterbildungs-Infos",
  MASTER_BUNDLE: "Gesamt-Paket",
};

export function documentLabel(type: string): string {
  return DOCUMENT_LABEL[type] ?? type;
}

/** Turn a raw source (often a URL) into something a human wants to read. */
export function humanizeSource(source: string | null): string {
  if (!source) return "Unbekannt";
  if (source.includes("eligibility")) return "Eignungs-Check (Website)";
  if (source.includes("kontakt") || source.includes("contact"))
    return "Kontaktformular";
  try {
    const url = new URL(source);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return source;
  }
}

// ---------------------------------------------------------------------------
// Guided workflow — what to do next, in plain German.
// Moved to ./leadWorkflow.ts in Phase 2 (16+ status entries pushed this file
// past its max-lines guard). Re-exported here so existing callers keep
// importing `WORKFLOW`, `WorkflowStep`, `WorkflowTone` from leadLabels.
// ---------------------------------------------------------------------------
export { WORKFLOW } from "./leadWorkflow";
export type { WorkflowStep, WorkflowTone } from "./leadWorkflow";
