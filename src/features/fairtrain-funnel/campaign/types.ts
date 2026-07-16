/**
 * Reactivation campaign domain types.
 *
 * Additive to the pipeline `LeadStatus`. `CampaignStatus` is a SEPARATE German
 * lifecycle used only for the Alt-Lead reactivation flow and never touches the
 * 19-value pipeline status/state-machine. UI-safe: no server imports.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Lead type (pipeline lead vs. imported reactivation lead).
// ---------------------------------------------------------------------------
export const LeadType = {
  NEU: "neu",
  ALT_LEAD: "alt_lead",
} as const;
export type LeadType = (typeof LeadType)[keyof typeof LeadType];
export const LeadTypeSchema = z.enum(["neu", "alt_lead"]);
export const LEAD_TYPE_LABEL: Record<LeadType, string> = {
  neu: "Neuer Lead",
  alt_lead: "Alt-Lead",
};

// ---------------------------------------------------------------------------
// Campaign lifecycle status (German, separate from LeadStatus).
// ---------------------------------------------------------------------------
export const CampaignStatus = {
  ALT_LEAD_IMPORTIERT: "alt_lead_importiert",
  VERSANDBEREIT: "versandbereit",
  ERSTKONTAKT_VERSENDET: "erstkontakt_versendet",
  FOLLOWUP_1_VERSENDET: "followup_1_versendet",
  FOLLOWUP_2_VERSENDET: "followup_2_versendet",
  REAGIERT: "reagiert",
  QUALIFIZIERT: "qualifiziert",
  INTERESSIERT: "interessiert",
  INFORMATIONSWUNSCH: "informationswunsch",
  KEIN_INTERESSE: "kein_interesse",
  INAKTIV: "inaktiv",
} as const;
export type CampaignStatus =
  (typeof CampaignStatus)[keyof typeof CampaignStatus];
export const CampaignStatusSchema = z.enum([
  "alt_lead_importiert",
  "versandbereit",
  "erstkontakt_versendet",
  "followup_1_versendet",
  "followup_2_versendet",
  "reagiert",
  "qualifiziert",
  "interessiert",
  "informationswunsch",
  "kein_interesse",
  "inaktiv",
]);
export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  alt_lead_importiert: "Importiert",
  versandbereit: "Versandbereit",
  erstkontakt_versendet: "Erstkontakt versendet",
  followup_1_versendet: "Follow-up 1 versendet",
  followup_2_versendet: "Follow-up 2 versendet",
  reagiert: "Reagiert",
  qualifiziert: "Qualifiziert",
  interessiert: "Interessiert",
  informationswunsch: "Informationswunsch",
  kein_interesse: "Kein Interesse",
  inaktiv: "Inaktiv",
};

/** Tolerant parse: unknown values map to undefined (never throws). */
export function parseCampaignStatus(
  value: string | null | undefined,
): CampaignStatus | undefined {
  if (!value) return undefined;
  const r = CampaignStatusSchema.safeParse(value);
  return r.success ? r.data : undefined;
}

// ---------------------------------------------------------------------------
// Campaign message job (send queue) — UI-safe status enum.
// ---------------------------------------------------------------------------
export const CampaignJobStatus = {
  QUEUED: "queued",
  SENT: "sent",
  SKIPPED: "skipped",
  FAILED: "failed",
  CANCELED: "canceled",
} as const;
export type CampaignJobStatus =
  (typeof CampaignJobStatus)[keyof typeof CampaignJobStatus];
export const CampaignJobStatusSchema = z.enum([
  "queued",
  "sent",
  "skipped",
  "failed",
  "canceled",
]);

export const CampaignChannel = {
  WHATSAPP: "WHATSAPP",
  EMAIL: "EMAIL",
} as const;
export type CampaignChannel =
  (typeof CampaignChannel)[keyof typeof CampaignChannel];

// ---------------------------------------------------------------------------
// Release tiers for the controlled campaign launch.
// ---------------------------------------------------------------------------
export const ReleaseTier = {
  TEST5: "test5",
  T10: "10",
  T50: "50",
  T100: "100",
  T300: "300",
  T500: "500",
  ALL: "all",
} as const;
export type ReleaseTier = (typeof ReleaseTier)[keyof typeof ReleaseTier];
export const ReleaseTierSchema = z.enum([
  "test5",
  "10",
  "50",
  "100",
  "300",
  "500",
  "all",
]);
export const RELEASE_TIER_LABEL: Record<ReleaseTier, string> = {
  test5: "Testversand (5 Leads)",
  "10": "10 Leads",
  "50": "50 Leads",
  "100": "100 Leads",
  "300": "300 Leads",
  "500": "500 Leads",
  all: "Alle versandbereiten Leads",
};
/** Numeric cap for a tier ("all" => Infinity, "test5" => 5). */
export function releaseTierLimit(tier: ReleaseTier): number {
  switch (tier) {
    case "test5":
      return 5;
    case "10":
      return 10;
    case "50":
      return 50;
    case "100":
      return 100;
    case "300":
      return 300;
    case "500":
      return 500;
    case "all":
      return Number.POSITIVE_INFINITY;
  }
}

// ---------------------------------------------------------------------------
// Quick-reply button payload IDs (must match the approved Meta templates).
// ---------------------------------------------------------------------------
export const CAMPAIGN_QUICK_REPLY = {
  INTERESSE: "alt_lead_interesse",
  MEHR_INFOS: "alt_lead_mehr_infos",
  KEIN_INTERESSE: "alt_lead_kein_interesse",
} as const;

// ---------------------------------------------------------------------------
// Campaign config — typed constant (no DB campaign builder).
// ---------------------------------------------------------------------------
export interface CampaignStepConfig {
  /** 1=Erstkontakt (Tag 0), 2=Follow-up 1 (Tag 3), 3=Follow-up 2 (Tag 7). */
  step: 1 | 2 | 3;
  dayOffset: number;
  label: string;
  whatsappTemplateSlug: string;
  emailTemplateSlug: string;
}

export interface CampaignConfig {
  key: string;
  name: string;
  steps: ReadonlyArray<CampaignStepConfig>;
  /** Grace period (days) after the last step before finalizing to "inaktiv". */
  finalizeGraceDays: number;
}

export const REACTIVATION_CAMPAIGN_KEY = "reaktivierung_alt_leads";

export const REACTIVATION_CAMPAIGN: CampaignConfig = {
  key: REACTIVATION_CAMPAIGN_KEY,
  name: "Reaktivierung Alt-Leads Beschäftigte",
  finalizeGraceDays: 3,
  steps: [
    {
      step: 1,
      dayOffset: 0,
      label: "Erstkontakt",
      whatsappTemplateSlug: "alt_leads_erstkontakt",
      emailTemplateSlug: "alt_leads_erstkontakt_email",
    },
    {
      step: 2,
      dayOffset: 3,
      label: "Follow-up 1",
      whatsappTemplateSlug: "alt_leads_followup_1",
      emailTemplateSlug: "alt_leads_followup_1_email",
    },
    {
      step: 3,
      dayOffset: 7,
      label: "Follow-up 2",
      whatsappTemplateSlug: "alt_leads_followup_2",
      emailTemplateSlug: "alt_leads_followup_2_email",
    },
  ],
};

/** All six template slugs seeded for this campaign. */
export const REACTIVATION_TEMPLATE_SLUGS: ReadonlyArray<string> =
  REACTIVATION_CAMPAIGN.steps.flatMap((s) => [
    s.whatsappTemplateSlug,
    s.emailTemplateSlug,
  ]);

export function campaignStepConfig(step: number): CampaignStepConfig | undefined {
  return REACTIVATION_CAMPAIGN.steps.find((s) => s.step === step);
}

// ---------------------------------------------------------------------------
// Import UI DTOs (serialisable — safe to pass from server actions to client).
// ---------------------------------------------------------------------------
export interface ImportCounters {
  totalRows: number;
  imported: number;
  duplicates: number;
  invalid: number;
  alreadyContacted: number;
  whatsappAvailable: number;
  emailAvailable: number;
}

export interface ImportPreviewRowDto {
  rowIndex: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  status: "imported" | "duplicate" | "invalid";
  errorReason: string | null;
  hasWhatsapp: boolean;
  hasEmail: boolean;
}

export interface ImportPreviewDto {
  headers: string[];
  mapping: Record<string, string>;
  counters: ImportCounters;
  sample: ImportPreviewRowDto[];
}

export interface ImportCommitDto {
  batchId: string;
  counters: ImportCounters;
}

// ---------------------------------------------------------------------------
// Campaign dashboard KPIs (UI-safe; real DB counts filled server-side).
// ---------------------------------------------------------------------------
export interface CampaignKpis {
  imported: number;
  versandbereit: number;
  erstkontaktGesendet: number;
  followup1Gesendet: number;
  followup2Gesendet: number;
  whatsappGesendet: number;
  whatsappZugestellt: number;
  whatsappGelesen: number;
  emailGesendet: number;
  antworten: number;
  jaInteresse: number;
  mehrInfos: number;
  keinInteresse: number;
  reagiert: number;
  qualifiziert: number;
  eignungscheckGestartet: number;
  eignungscheckAbgeschlossen: number;
  inaktiv: number;
  fehlerhafte: number;
}

/**
 * Live reactivation overview — the 10 headline metrics for the redesigned
 * Reaktivierung workspace. The cohort is every lead that entered via the
 * reactivation import (still `alt_lead` OR already converted, tag "reaktiviert"),
 * so the numbers stay consistent with the Multichat live bar.
 */
export interface ReactivationOverview {
  /** Insgesamt importierte Alt-Leads (offen + bearbeitet + konvertiert). */
  imported: number;
  /** Noch offen: importiert, aber noch nicht angeschrieben. */
  open: number;
  /** Heute erstkontaktiert. */
  contactedToday: number;
  /** Angeschrieben, wartet noch auf eine Antwort. */
  waitingReply: number;
  /** In der 24-Stunden-Erinnerung (Follow-up 1). */
  reminder24h: number;
  /** In der 48-Stunden-Erinnerung (Follow-up 2). */
  reminder48h: number;
  /** Eignungscheck gestartet (Übergang in den Funnel). */
  eligibilityStarted: number;
  /** Bereits als normaler Funnel-Lead übernommen. */
  inFunnel: number;
  /** Reaktivierung abgeschlossen (inaktiv / Funnel abgeschlossen). */
  completed: number;
  /** Versand fehlgeschlagen (ungültige/nicht erreichbare Nummer o. Ä.). */
  failed: number;
}

export interface CampaignTemplateInfo {
  slug: string;
  name: string;
  channel: "WHATSAPP" | "EMAIL" | "INTERNAL";
  step: number;
  exists: boolean;
  metaApprovalStatus: string | null;
  /** True when this template can actually be sent live (WA needs approval). */
  sendable: boolean;
  /**
   * WhatsApp only: whether a sender number ("Senden über") is chosen. A template
   * can be Meta-approved but still fail every send without a sender — surfaced so
   * operators spot the missing number before blasting a campaign.
   */
  senderConfigured: boolean;
}

