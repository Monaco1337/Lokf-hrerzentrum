/**
 * Messaging / communication ledger domain types.
 *
 * The CommunicationEvent row IS the message ledger. These enums describe the
 * lifecycle and provenance of every message so the UI can render rich status
 * chips, delivery history and provenance without knowing whether a message was
 * simulated or sent through a future real WhatsApp Cloud API adapter.
 */
import { z } from "zod";

import type { ContactState } from "../contactState";

// ---------------------------------------------------------------------------
// Message type.
// ---------------------------------------------------------------------------
export const MessageType = {
  TEMPLATE: "TEMPLATE",
  TEXT: "TEXT",
  SYSTEM: "SYSTEM",
  MEDIA: "MEDIA",
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];
export const MessageTypeSchema = z.enum(["TEMPLATE", "TEXT", "SYSTEM", "MEDIA"]);
export const MESSAGE_TYPE_LABEL: Record<MessageType, string> = {
  TEMPLATE: "Vorlage",
  TEXT: "Freitext",
  SYSTEM: "System",
  MEDIA: "Medien",
};

// ---------------------------------------------------------------------------
// Message status lifecycle.
// ---------------------------------------------------------------------------
export const MessageStatus = {
  DRAFT: "DRAFT",
  QUEUED: "QUEUED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  READ: "READ",
  FAILED: "FAILED",
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];
export const MessageStatusSchema = z.enum([
  "DRAFT",
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
]);
export const MESSAGE_STATUS_LABEL: Record<MessageStatus, string> = {
  DRAFT: "Entwurf",
  QUEUED: "In Warteschlange",
  SENT: "Gesendet",
  DELIVERED: "Zugestellt",
  READ: "Gelesen",
  FAILED: "Fehlgeschlagen",
};

/** Forward order of the outbound delivery lifecycle (excluding terminal FAILED). */
export const MESSAGE_STATUS_FLOW: ReadonlyArray<MessageStatus> = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
];

// ---------------------------------------------------------------------------
// Lead-level WhatsApp tracking (driven by REAL provider webhook events only).
// These live on the Lead, not the message row, and describe the last known
// WhatsApp reachability/engagement state of that lead.
// ---------------------------------------------------------------------------
export const WhatsappTrackingStatus = {
  OFFEN: "offen", // no WhatsApp attempt yet (import default)
  GEPLANT: "geplant", // queued for sending
  GESENDET: "gesendet", // one grey check
  ZUGESTELLT: "zugestellt", // two grey checks
  GELESEN: "gelesen", // two blue checks
  BEANTWORTET: "beantwortet", // inbound reply received
  FEHLGESCHLAGEN: "fehlgeschlagen", // generic send failure
  NUMMER_UNGUELTIG: "nummer_ungueltig", // provider: invalid number
  NICHT_REGISTRIERT: "nicht_registriert", // provider: not a WhatsApp user
  BLOCKIERT: "blockiert", // manual only — Meta does NOT emit a block signal
  NICHT_ERREICHBAR: "nicht_erreichbar", // undeliverable, reason not disambiguated
} as const;
export type WhatsappTrackingStatus =
  (typeof WhatsappTrackingStatus)[keyof typeof WhatsappTrackingStatus];
export const WhatsappTrackingStatusSchema = z.enum([
  "offen",
  "geplant",
  "gesendet",
  "zugestellt",
  "gelesen",
  "beantwortet",
  "fehlgeschlagen",
  "nummer_ungueltig",
  "nicht_registriert",
  "blockiert",
  "nicht_erreichbar",
]);
export const WHATSAPP_TRACKING_LABEL: Record<WhatsappTrackingStatus, string> = {
  offen: "Offen",
  geplant: "Versand geplant",
  gesendet: "Gesendet",
  zugestellt: "Zugestellt",
  gelesen: "Gelesen",
  beantwortet: "Beantwortet",
  fehlgeschlagen: "Fehlgeschlagen",
  nummer_ungueltig: "Nummer ungültig",
  nicht_registriert: "WhatsApp nicht registriert",
  blockiert: "Blockiert",
  nicht_erreichbar: "Nicht erreichbar",
};

export const WhatsappReachability = {
  UNBEKANNT: "unbekannt",
  ERREICHBAR: "erreichbar", // delivered at least once
  AKTIV: "aktiv", // read/replied
  NICHT_ERREICHBAR: "nicht_erreichbar",
} as const;
export type WhatsappReachability =
  (typeof WhatsappReachability)[keyof typeof WhatsappReachability];
export const WhatsappReachabilitySchema = z.enum([
  "unbekannt",
  "erreichbar",
  "aktiv",
  "nicht_erreichbar",
]);

export const LeadQualityStatus = {
  UNBEWERTET: "unbewertet",
  NEUTRAL: "neutral",
  WARM: "warm",
  HOT: "hot", // strong buying signal (e.g. "Ja, Interesse" quick-reply)
  REAGIERT: "reagiert",
  SCHROTTLEAD: "schrottlead",
  AUSGESCHLOSSEN: "ausgeschlossen", // opted out / "Kein Interesse"
  NICHT_KONTAKTIERBAR: "nicht_kontaktierbar",
} as const;
export type LeadQualityStatus =
  (typeof LeadQualityStatus)[keyof typeof LeadQualityStatus];
export const LeadQualityStatusSchema = z.enum([
  "unbewertet",
  "neutral",
  "warm",
  "hot",
  "reagiert",
  "schrottlead",
  "ausgeschlossen",
  "nicht_kontaktierbar",
]);
export const LEAD_QUALITY_LABEL: Record<LeadQualityStatus, string> = {
  unbewertet: "Unbewertet",
  neutral: "Neutral",
  warm: "Warm",
  hot: "Hot",
  reagiert: "Reagiert",
  schrottlead: "Schrottlead",
  ausgeschlossen: "Ausgeschlossen",
  nicht_kontaktierbar: "Nicht kontaktierbar",
};

/**
 * Derived lead temperature (HOT/WARM/COLD) from engagement — never stored,
 * always computed so it stays consistent with the underlying real signals.
 */
export type LeadTemperature = "HOT" | "WARM" | "COLD";
export function leadTemperature(input: {
  leadScore: number;
  whatsappStatus: WhatsappTrackingStatus | string;
  leadQualityStatus: LeadQualityStatus | string;
}): LeadTemperature {
  if (
    input.leadQualityStatus === "hot" ||
    input.leadQualityStatus === "reagiert" ||
    input.whatsappStatus === "beantwortet" ||
    input.leadScore >= 25
  ) {
    return "HOT";
  }
  if (
    input.leadQualityStatus === "warm" ||
    input.whatsappStatus === "gelesen" ||
    input.leadScore >= 10
  ) {
    return "WARM";
  }
  return "COLD";
}

// ---------------------------------------------------------------------------
// Who sent the message.
// ---------------------------------------------------------------------------
export const MessageSentBy = {
  AUTOMATION: "AUTOMATION",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
} as const;
export type MessageSentBy = (typeof MessageSentBy)[keyof typeof MessageSentBy];
export const MessageSentBySchema = z.enum(["AUTOMATION", "ADMIN", "SYSTEM"]);
export const MESSAGE_SENT_BY_LABEL: Record<MessageSentBy, string> = {
  AUTOMATION: "Automation",
  ADMIN: "Mitarbeiter",
  SYSTEM: "System",
};

// ---------------------------------------------------------------------------
// Status history entry.
// ---------------------------------------------------------------------------
export interface MessageStatusChange {
  status: MessageStatus;
  at: string; // ISO timestamp
}
export const MessageStatusChangeSchema = z.object({
  status: MessageStatusSchema,
  at: z.string(),
});

// ---------------------------------------------------------------------------
// WhatsApp adapter configuration health (UI-safe; booleans only, no secrets).
// ---------------------------------------------------------------------------
export type WhatsAppConfigStatus =
  | "configured" // meta selected + all required secrets present → live
  | "missing_env" // meta selected but secrets incomplete → falls back to demo
  | "disabled" // explicitly turned off
  | "demo_only"; // simulation adapter (default)

export interface WhatsAppConfigInfo {
  providerName: string;
  status: WhatsAppConfigStatus;
  isLive: boolean;
  adapter: string;
  hasToken: boolean;
  hasPhoneNumberId: boolean;
  hasVerifyToken: boolean;
  hasAppSecret: boolean;
  /** How many active sender numbers are configured in the DB. */
  activeNumberCount?: number;
}

// ---------------------------------------------------------------------------
// WhatsApp sender numbers (multi-number Multichat). UI-safe: never a secret.
// ---------------------------------------------------------------------------

/** A configured WhatsApp Business Cloud API sender number. */
export interface WhatsAppNumberRecord {
  id: string;
  /** Meta Cloud API `phone_number_id` (opaque id, not the phone number). */
  phoneNumberId: string;
  /** Human-readable E.164 number for display, e.g. "+4915112345678". */
  displayPhone: string;
  /** Free-text label, e.g. "Vertrieb Danijel". */
  label: string;
  /** Owning sales rep id (auto-assignment target) or null. */
  assignedUserId: string | null;
  /** Owning sales rep display name, resolved for the UI, or null. */
  assignedUserName: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// WhatsApp dashboard KPIs (UI-safe; real DB counts filled server-side).
// ---------------------------------------------------------------------------
export interface WhatsAppKpis {
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  notRegistered: number;
  invalidNumbers: number;
  /** aussortierte Schrottleads */
  culled: number;
  hot: number;
  warm: number;
  /** delivered / sent, 0..1 */
  deliveryRate: number;
  /** read / sent, 0..1 */
  readRate: number;
  /** replied / sent, 0..1 */
  replyRate: number;
}

// ---------------------------------------------------------------------------
// Multichat unified inbox — UI-ready, serialisable conversation shapes.
// ---------------------------------------------------------------------------

export interface MultichatMessage {
  id: string;
  direction: "IN" | "OUT";
  body: string;
  status: string;
  isDemo: boolean;
  businessPhoneNumberId: string | null;
  createdAt: string;
}

/**
 * Employment situation bucket for the Multichat overview filter. Derived from
 * the lead's classifier tags (authoritative) with a fallback to the stored
 * employmentStatus, so every conversation lands in exactly one bucket:
 *   • job_seeking → "Arbeitssuchend"
 *   • employed    → "Beschäftigt" (incl. befristet/Kurzarbeit/Gesundheit/sicher)
 *   • other       → "Sonstige Situation" (incl. unbekannt)
 */
export type EmploymentBucket = "job_seeking" | "employed" | "other";

export const EMPLOYMENT_BUCKET_LABEL: Record<EmploymentBucket, string> = {
  job_seeking: "Arbeitssuchend",
  employed: "Beschäftigt",
  other: "Sonstige Situation",
};

/**
 * Processing state of a reactivation chat, derived server-side from real
 * signals (unhandled inbound, contact-protection state, follow-up date). This
 * is the single "Bearbeitungsstatus" badge shown on every chat so an operator
 * sees at a glance what a conversation needs next.
 */
export type WorkStatus =
  | "new_reply" // neue, noch nicht bearbeitete Antwort
  | "callback" // Rückruf vereinbart / angefordert
  | "waiting" // wartet auf Rückmeldung des Bewerbers
  | "followup" // Wiedervorlage geplant
  | "no_interest" // kein Interesse / abgemeldet
  | "done" // erledigt, kein weiterer Kontakt
  | "open"; // offen, nächster Schritt zu wählen

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  new_reply: "Neue Antwort",
  callback: "Rückruf vereinbart",
  waiting: "Wartet auf Rückmeldung",
  followup: "Wiedervorlage",
  no_interest: "Kein Interesse",
  done: "Erledigt",
  open: "Offen",
};

/** Short tone key per work status → mapped to Tailwind classes in the UI. */
export const WORK_STATUS_TONE: Record<
  WorkStatus,
  "emerald" | "amber" | "sky" | "violet" | "rose" | "slate"
> = {
  new_reply: "emerald",
  callback: "violet",
  waiting: "amber",
  followup: "sky",
  no_interest: "rose",
  done: "slate",
  open: "slate",
};

/** Suggested "was ist als Nächstes zu tun" hint per work status. */
export const WORK_STATUS_NEXT_ACTION: Record<WorkStatus, string> = {
  new_reply: "Antwort lesen & beantworten",
  callback: "Rückruf durchführen",
  waiting: "Auf Rückmeldung des Bewerbers warten",
  followup: "Wiedervorlage fällig – erneut melden",
  no_interest: "Kein Interesse – ggf. archivieren",
  done: "Abgeschlossen – keine Aktion nötig",
  open: "Erstkontakt bzw. nächsten Schritt wählen",
};

/** WhatsApp template option for the inline template picker. */
export interface MultichatTemplateOption {
  id: string;
  name: string;
  category: string;
}

/**
 * Live reactivation funnel counters shown at the top of the Multichat work
 * surface, so every operator instantly sees the current state and priorities.
 */
export interface ReactivationStats {
  imported: number;
  contacted: number;
  replied: number;
  unread: number;
  waitingCallback: number;
  eligibilityStarted: number;
  applicationsCompleted: number;
}

export interface MultichatConversation {
  leadId: string;
  /**
   * Stable 1-based running number within the COMPLETE conversation list (never
   * affected by the active filter), so operators can immediately verify that
   * no chat is missing: the list runs #1 … #totalConversations with no gaps.
   */
  seq: number;
  /** Employment situation bucket for the overview filter. */
  employmentBucket: EmploymentBucket;
  /** Derived processing status (single "Bearbeitungsstatus" badge). */
  workStatus: WorkStatus;
  /** "neu" (converted / funnel lead) | "alt_lead" (still in reactivation). */
  leadType: string;
  /** Current funnel/process phase + its German label. */
  funnelPhase: string;
  funnelPhaseLabel: string;
  /** When a callback was requested/arranged (ISO) or null. */
  callbackRequestedAt: string | null;
  /** Wiedervorlage date (ISO) or null. */
  followUpAt: string | null;
  /** Timestamp of the last inbound message (ISO) or null. */
  lastInboundAt: string | null;
  email: string;
  leadName: string;
  phone: string;
  assignedUserId: string | null;
  assignedName: string | null;
  businessPhoneNumberId: string | null;
  numberLabel: string | null;
  /** WhatsApp engagement score for the lead. */
  leadScore: number;
  /** Lead-level WhatsApp tracking status. */
  whatsappStatus: WhatsappTrackingStatus;
  /** Lead source / campaign, for the inbox row. */
  source: string | null;
  /** True while an inbound reply is still flagged as unhandled on the lead. */
  hasNewReply: boolean;
  /** Lead has opted out of WhatsApp (stop keyword). No sends allowed. */
  optOut: boolean;
  /** Contact-protection handling state (Kontaktschutz). */
  contactState: ContactState;
  /** Whether automations are currently paused for this lead. */
  automationPaused: boolean;
  /** When the lead was last handled manually (call/Multichat), if ever. */
  lastManualContactAt: string | null;
  lastAt: string;
  preview: string;
  unread: number;
  total: number;
  messages: MultichatMessage[];
}

export interface MultichatNumberOption {
  phoneNumberId: string;
  label: string;
  displayPhone: string;
}

export interface MultichatData {
  conversations: MultichatConversation[];
  numbers: MultichatNumberOption[];
  whatsappLive: boolean;
  /** Total number of distinct conversations (== conversations.length). */
  totalConversations: number;
  /** Conversation counts per employment bucket, for the filter chips. */
  bucketCounts: Record<EmploymentBucket, number>;
  /** Conversation counts per work status, for the status filter chips. */
  workStatusCounts: Record<WorkStatus, number>;
  /** Live reactivation funnel counters for the overview bar. */
  reactivationStats: ReactivationStats;
  /** Active WhatsApp templates available for the inline template picker. */
  templates: MultichatTemplateOption[];
}

// ---------------------------------------------------------------------------
// "Rückrufe angefordert" — Alt-Lead callback requests (CallbackRequestService).
// Kept UI-safe/serialisable here (no server imports) so the client Inbox can
// import types without pulling server code into the client bundle.
// ---------------------------------------------------------------------------

export type CallbackNextStep =
  | "done"
  | "send_eligibility"
  | "consultation_required"
  | "appointment_scheduled";

export const CALLBACK_NEXT_STEP_LABEL: Record<CallbackNextStep, string> = {
  done: "Erledigt (keine weitere Aktion)",
  send_eligibility: "Eignungscheck senden",
  consultation_required: "Beratung erforderlich",
  appointment_scheduled: "Termin vereinbart",
};

export interface CallbackRequestItem {
  leadId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  callbackRequestedAt: string;
  funnelPhase: string;
  funnelPhaseLabel: string;
  lastInboundMessage: string | null;
  lastInboundMessageAt: string | null;
  conversation: MultichatConversation | null;
}

export interface CallbackRequestsData {
  items: CallbackRequestItem[];
  whatsappLive: boolean;
}
