/**
 * Automation domain types — canonical source for automation enums/interfaces.
 *
 * Covers two related but distinct concepts:
 *   - Message TEMPLATES (admin-managed, reusable, channel-scoped blocks)
 *   - Automation RULES (trigger → conditions → actions, simulated only)
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Triggers — shared by rules (and the legacy template auto-send).
// Stored UPPER_SNAKE; the UI renders dotted German-friendly labels.
// ---------------------------------------------------------------------------
export const AutomationTrigger = {
  LEAD_CREATED: "LEAD_CREATED",
  LEAD_STATUS_CHANGED: "LEAD_STATUS_CHANGED",
  LEAD_OWNER_ASSIGNED: "LEAD_OWNER_ASSIGNED",
  FUNNEL_STARTED: "FUNNEL_STARTED",
  FUNNEL_COMPLETED: "FUNNEL_COMPLETED",
  MESSAGE_INBOUND: "MESSAGE_INBOUND",
  MESSAGE_FAILED: "MESSAGE_FAILED",
  DOCUMENT_REQUESTED: "DOCUMENT_REQUESTED",
  DOCUMENT_UPLOADED: "DOCUMENT_UPLOADED",
  DOCUMENT_APPROVED: "DOCUMENT_APPROVED",
  APPOINTMENT_CREATED: "APPOINTMENT_CREATED",
  APPOINTMENT_MISSED: "APPOINTMENT_MISSED",
  TASK_OVERDUE: "TASK_OVERDUE",
  SLA_EXCEEDED: "SLA_EXCEEDED",
  MANUAL: "MANUAL",
} as const;
export type AutomationTrigger =
  (typeof AutomationTrigger)[keyof typeof AutomationTrigger];
export const AutomationTriggerSchema = z.enum(
  Object.values(AutomationTrigger) as [AutomationTrigger, ...AutomationTrigger[]],
);

export const TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  LEAD_CREATED: "Lead erstellt",
  LEAD_STATUS_CHANGED: "Lead-Status geändert",
  LEAD_OWNER_ASSIGNED: "Bearbeiter zugewiesen",
  FUNNEL_STARTED: "Funnel gestartet",
  FUNNEL_COMPLETED: "Funnel abgeschlossen",
  MESSAGE_INBOUND: "Eingehende Nachricht",
  MESSAGE_FAILED: "Nachricht fehlgeschlagen",
  DOCUMENT_REQUESTED: "Unterlagen angefordert",
  DOCUMENT_UPLOADED: "Unterlagen hochgeladen",
  DOCUMENT_APPROVED: "Unterlagen freigegeben",
  APPOINTMENT_CREATED: "Termin erstellt",
  APPOINTMENT_MISSED: "Termin verpasst",
  TASK_OVERDUE: "Aufgabe überfällig",
  SLA_EXCEEDED: "SLA überschritten",
  MANUAL: "Manuell / Vorlage",
};

// ---------------------------------------------------------------------------
// AutomationLog status (legacy send attempts) — unchanged.
// ---------------------------------------------------------------------------
export const AutomationLogStatus = {
  SENT: "SENT",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
  SKIPPED_MISSING_PROVIDER_CONFIG: "SKIPPED_MISSING_PROVIDER_CONFIG",
  SKIPPED_NO_CONSENT: "SKIPPED_NO_CONSENT",
} as const;
export type AutomationLogStatus =
  (typeof AutomationLogStatus)[keyof typeof AutomationLogStatus];
export const AutomationLogStatusSchema = z.enum([
  "SENT",
  "FAILED",
  "SKIPPED",
  "SKIPPED_MISSING_PROVIDER_CONFIG",
  "SKIPPED_NO_CONSENT",
]);

// ---------------------------------------------------------------------------
// Template enums.
// ---------------------------------------------------------------------------
export const TemplateChannel = {
  WHATSAPP: "WHATSAPP",
  EMAIL: "EMAIL",
  INTERNAL: "INTERNAL",
} as const;
export type TemplateChannel =
  (typeof TemplateChannel)[keyof typeof TemplateChannel];
export const TemplateChannelSchema = z.enum(["WHATSAPP", "EMAIL", "INTERNAL"]);

export const TEMPLATE_CHANNEL_LABEL: Record<TemplateChannel, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-Mail",
  INTERNAL: "Intern",
};

export const TemplateCategory = {
  WELCOME: "welcome",
  DOCUMENTS: "documents",
  REMINDER: "reminder",
  APPOINTMENT: "appointment",
  FOLLOWUP: "followup",
  ESCALATION: "escalation",
  REACTIVATION: "reactivation",
  REJECTION: "rejection",
} as const;
export type TemplateCategory =
  (typeof TemplateCategory)[keyof typeof TemplateCategory];
export const TemplateCategorySchema = z.enum(
  Object.values(TemplateCategory) as [TemplateCategory, ...TemplateCategory[]],
);
export const TEMPLATE_CATEGORY_LABEL: Record<TemplateCategory, string> = {
  welcome: "Willkommen",
  documents: "Unterlagen",
  reminder: "Reminder",
  appointment: "Termin",
  followup: "Follow-up",
  escalation: "Eskalation",
  reactivation: "Reaktivierung",
  rejection: "Absage",
};

export const TemplateStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;
export type TemplateStatus =
  (typeof TemplateStatus)[keyof typeof TemplateStatus];
export const TemplateStatusSchema = z.enum(["draft", "active", "inactive"]);
export const TEMPLATE_STATUS_LABEL: Record<TemplateStatus, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  inactive: "Inaktiv",
};

export const MetaApprovalStatus = {
  NOT_SUBMITTED: "not_submitted",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;
export type MetaApprovalStatus =
  (typeof MetaApprovalStatus)[keyof typeof MetaApprovalStatus];
export const MetaApprovalStatusSchema = z.enum([
  "not_submitted",
  "pending",
  "approved",
  "rejected",
]);
export const META_APPROVAL_STATUS_LABEL: Record<MetaApprovalStatus, string> = {
  not_submitted: "Nicht eingereicht",
  pending: "In Prüfung",
  approved: "Freigegeben",
  rejected: "Abgelehnt",
};

// ---------------------------------------------------------------------------
// Meta WhatsApp template buttons — the interactive component of an approved
// template. Mirrors the three button kinds the Cloud API supports. Stored as
// JSON on the template; rendered into `template.components` at send time.
// ---------------------------------------------------------------------------
export const META_BUTTON_TYPES = ["quick_reply", "url", "phone_number"] as const;
export type MetaTemplateButtonType = (typeof META_BUTTON_TYPES)[number];

export const META_BUTTON_TYPE_LABEL: Record<MetaTemplateButtonType, string> = {
  quick_reply: "Schnellantwort",
  url: "Website (URL)",
  phone_number: "Anruf",
};

export interface MetaTemplateButton {
  type: MetaTemplateButtonType;
  /** Button label shown on the device (Meta limit: 25 chars). */
  text: string;
  /** URL button destination. May contain a single {{variable}} dynamic suffix. */
  url?: string | undefined;
  /** Call button target in E.164 (e.g. "+491701234567"). */
  phoneNumber?: string | undefined;
  /** Quick-reply payload returned when tapped. May contain a {{variable}}. */
  payload?: string | undefined;
}

export const MetaTemplateButtonSchema = z.object({
  type: z.enum(META_BUTTON_TYPES),
  text: z.string().min(1).max(40),
  url: z.string().max(2000).optional(),
  phoneNumber: z.string().max(30).optional(),
  payload: z.string().max(500).optional(),
});

/**
 * Result of retroactively classifying unhandled WhatsApp replies (backfill).
 * Lives in the shared feature types so the CRM UI can display it without
 * importing from the server (which is restricted).
 */
export interface BackfillSummary {
  /** Leads examined (had a WhatsApp reply). */
  total: number;
  /** Newly classified + follow-up started. */
  processed: number;
  /** Already classified / no reply body → left untouched. */
  skipped: number;
  /** Leads that errored during processing. */
  errors: number;
  employed: number;
  job_seeking: number;
  other: number;
}

export interface AutomationTemplateEntry {
  id: string;
  slug: string;
  trigger: AutomationTrigger;
  channel: TemplateChannel;
  category: TemplateCategory;
  status: TemplateStatus;
  language: string;
  name: string;
  subject: string | null;
  body: string;
  enabled: boolean;
  requiresConsent: string | null;
  metaTemplateName: string | null;
  metaApprovalStatus: MetaApprovalStatus | null;
  /** WhatsApp only: chosen sender number (Meta `phone_number_id`) to send FROM. */
  senderPhoneNumberId: string | null;
  /**
   * WhatsApp only: ordered body parameters mapping our named variables onto
   * Meta's numbered placeholders ({{1}}, {{2}}, …). Each entry is a template
   * token (e.g. "{{first_name}}") or literal text. Empty = static template.
   */
  metaBodyParams: string[];
  /**
   * WhatsApp only: interactive Meta template buttons (Quick Reply / URL / Call),
   * in the exact order they appear in the approved Meta template. Rendered into
   * `template.components` at send time. Empty = no buttons.
   */
  metaButtons: MetaTemplateButton[];
  usageCount: number;
  lastUsedAt: Date | null;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationLogEntry {
  id: string;
  leadId: string;
  templateId: string | null;
  templateSlug: string | null;
  trigger: AutomationTrigger;
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  status: AutomationLogStatus;
  renderedSubject: string | null;
  renderedBody: string;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  isTest: boolean;
  triggeredBy: string;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Rule condition + action vocabulary.
// ---------------------------------------------------------------------------
export const RuleConditionType = {
  hasWhatsappConsent: "hasWhatsappConsent",
  hasEmailConsent: "hasEmailConsent",
  leadStatus: "leadStatus",
  funnelStage: "funnelStage",
  priority: "priority",
  scoreGreaterThan: "scoreGreaterThan",
  missingDocuments: "missingDocuments",
  noInboundReplyForHours: "noInboundReplyForHours",
  noFormOpenedForHours: "noFormOpenedForHours",
  noUploadForHours: "noUploadForHours",
  businessHoursOnly: "businessHoursOnly",
  ownerAssigned: "ownerAssigned",
  isDemo: "isDemo",
  // Inbound-reply conditions (evaluated against the triggering WhatsApp reply on
  // the MESSAGE_INBOUND trigger). Without an inbound event in context they are
  // simply not met — existing rules are unaffected.
  whatsappReplyReceived: "whatsappReplyReceived",
  quickReplySelection: "quickReplySelection",
  replyTextEquals: "replyTextEquals",
  replyTextContains: "replyTextContains",
  detectedSituation: "detectedSituation",
  // Funnel-Phase (process step) — separate axis from the communication status.
  funnelPhase: "funnelPhase",
  // AI reply analysis ("Antwort analysieren (KI)") — evaluated against the
  // triggering inbound reply's classification. Without an inbound event these
  // simply evaluate to "not met", so existing rules are unaffected. All flags
  // are combinable via the rule's UND/ODER logic.
  analyzeReply: "analyzeReply",
  aiInterestDetected: "aiInterestDetected",
  aiEmployed: "aiEmployed",
  aiJobSeeking: "aiJobSeeking",
  aiCareerChange: "aiCareerChange",
  aiJobInsecure: "aiJobInsecure",
  aiGeneralInterest: "aiGeneralInterest",
  aiCallback: "aiCallback",
  aiQuestion: "aiQuestion",
  aiStop: "aiStop",
  aiNoInterest: "aiNoInterest",
} as const;
export type RuleConditionType =
  (typeof RuleConditionType)[keyof typeof RuleConditionType];

export const CONDITION_LABEL: Record<RuleConditionType, string> = {
  hasWhatsappConsent: "Hat WhatsApp-Einwilligung",
  hasEmailConsent: "Hat E-Mail-Einwilligung",
  leadStatus: "Lead-Status ist",
  funnelStage: "Funnel-Phase ist",
  priority: "Priorität ist",
  scoreGreaterThan: "Score größer als",
  missingDocuments: "Unterlagen fehlen",
  noInboundReplyForHours: "Keine Antwort seit (Std.)",
  noFormOpenedForHours: "Formular nicht geöffnet seit (Std.)",
  noUploadForHours: "Kein Upload seit (Std.)",
  businessHoursOnly: "Nur während Geschäftszeiten",
  ownerAssigned: "Bearbeiter zugewiesen",
  isDemo: "Ist Demo-Lead",
  whatsappReplyReceived: "WhatsApp-Antwort erhalten",
  quickReplySelection: "Quick-Reply-Auswahl ist",
  replyTextEquals: "Antworttext entspricht",
  replyTextContains: "Antworttext enthält",
  detectedSituation: "Erkannte berufliche Situation",
  funnelPhase: "Funnel-Phase ist",
  analyzeReply: "Antwort analysieren (KI)",
  aiInterestDetected: "Interesse erkannt",
  aiEmployed: "Beschäftigt erkannt",
  aiJobSeeking: "Arbeitssuchend erkannt",
  aiCareerChange: "Berufliche Veränderung erkannt",
  aiJobInsecure: "Arbeitsplatz unsicher erkannt",
  aiGeneralInterest: "Allgemeines Interesse erkannt",
  aiCallback: "Rückruf erkannt",
  aiQuestion: "Frage erkannt",
  aiStop: "STOPP erkannt",
  aiNoInterest: "Kein Interesse erkannt",
};

/** Conditions that carry a value (others are boolean flags). */
export const CONDITIONS_WITH_VALUE: ReadonlyArray<RuleConditionType> = [
  "leadStatus",
  "funnelStage",
  "priority",
  "scoreGreaterThan",
  "noInboundReplyForHours",
  "noFormOpenedForHours",
  "noUploadForHours",
  "quickReplySelection",
  "replyTextEquals",
  "replyTextContains",
  "detectedSituation",
  "funnelPhase",
];

export const RuleActionType = {
  sendTemplateSimulation: "sendTemplateSimulation",
  createTask: "createTask",
  createFollowUp: "createFollowUp",
  changeLeadStatus: "changeLeadStatus",
  assignOwner: "assignOwner",
  addActivityLog: "addActivityLog",
  notifyAdminSimulation: "notifyAdminSimulation",
  markEscalated: "markEscalated",
  // Enterprise workflow actions (2026-07-14).
  changeFunnelPhase: "changeFunnelPhase",
  addTag: "addTag",
  removeTag: "removeTag",
  changeScore: "changeScore",
  pauseAutomation: "pauseAutomation",
  resumeAutomation: "resumeAutomation",
  delay: "delay",
  branch: "branch",
  addNote: "addNote",
  notifyInternal: "notifyInternal",
  endWorkflow: "endWorkflow",
} as const;
export type RuleActionType =
  (typeof RuleActionType)[keyof typeof RuleActionType];

export const ACTION_LABEL: Record<RuleActionType, string> = {
  sendTemplateSimulation: "WhatsApp-/E-Mail-Vorlage senden",
  createTask: "Aufgabe erstellen",
  createFollowUp: "Follow-up planen",
  changeLeadStatus: "Lead-Status ändern",
  assignOwner: "Bearbeiter zuweisen",
  addActivityLog: "Aktivitätslog schreiben",
  notifyAdminSimulation: "Admin benachrichtigen (Simulation)",
  markEscalated: "Als eskaliert markieren",
  changeFunnelPhase: "Funnel-Phase ändern",
  addTag: "Tag hinzufügen",
  removeTag: "Tag entfernen",
  changeScore: "Lead-Score ändern",
  pauseAutomation: "Automation pausieren",
  resumeAutomation: "Automation fortsetzen",
  delay: "Warten (Delay)",
  branch: "Verzweigung (Wenn/Sonst)",
  addNote: "Notiz zur Timeline hinzufügen",
  notifyInternal: "Interne Benachrichtigung",
  endWorkflow: "Workflow beenden",
};

export interface RuleCondition {
  type: RuleConditionType;
  value?: string | number | boolean | undefined;
}

export interface RuleAction {
  type: RuleActionType;
  /** Template for sendTemplateSimulation. */
  templateId?: string | undefined;
  /** Title for createTask. */
  taskTitle?: string | undefined;
  /** Target status for changeLeadStatus. */
  status?: string | undefined;
  /** Target owner id for assignOwner. */
  ownerId?: string | undefined;
  /** Free-text note for createFollowUp / addActivityLog / notify / escalate. */
  note?: string | undefined;
  /** Hours offset for createFollowUp (default 24). */
  hours?: number | undefined;
  /** Target funnel phase for changeFunnelPhase. */
  funnelPhase?: string | undefined;
  /** Tag value for addTag / removeTag. */
  tag?: string | undefined;
  /** Score delta (may be negative) for changeScore. */
  score?: number | undefined;
  /** Amount for the delay action. */
  delayValue?: number | undefined;
  /** Unit for the delay action. */
  delayUnit?: "minutes" | "hours" | "days" | undefined;
  /** Guard condition type for the branch action. */
  branchCondition?: RuleConditionType | undefined;
  /** Guard condition value for the branch action. */
  branchValue?: string | undefined;
}

export const RuleConditionSchema: z.ZodType<RuleCondition> = z.object({
  type: z.enum(
    Object.values(RuleConditionType) as [RuleConditionType, ...RuleConditionType[]],
  ),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

export const RuleActionSchema: z.ZodType<RuleAction> = z.object({
  type: z.enum(
    Object.values(RuleActionType) as [RuleActionType, ...RuleActionType[]],
  ),
  templateId: z.string().optional(),
  taskTitle: z.string().optional(),
  status: z.string().optional(),
  ownerId: z.string().optional(),
  note: z.string().optional(),
  hours: z.number().optional(),
  funnelPhase: z.string().optional(),
  tag: z.string().max(60).optional(),
  score: z.number().optional(),
  delayValue: z.number().optional(),
  delayUnit: z.enum(["minutes", "hours", "days"]).optional(),
  branchCondition: z
    .enum(
      Object.values(RuleConditionType) as [
        RuleConditionType,
        ...RuleConditionType[],
      ],
    )
    .optional(),
  branchValue: z.string().optional(),
});

/**
 * How a rule's conditions are combined. "all" = UND (default, backward
 * compatible), "any" = ODER. Persisted on the rule; absent → "all".
 */
export const ConditionLogic = {
  ALL: "all",
  ANY: "any",
} as const;
export type ConditionLogic = (typeof ConditionLogic)[keyof typeof ConditionLogic];
export const ConditionLogicSchema = z.enum(["all", "any"]);
export const CONDITION_LOGIC_LABEL: Record<ConditionLogic, string> = {
  all: "UND – alle Bedingungen müssen zutreffen",
  any: "ODER – mindestens eine Bedingung muss zutreffen",
};

export const RuleStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;
export type RuleStatus = (typeof RuleStatus)[keyof typeof RuleStatus];
export const RuleStatusSchema = z.enum(["draft", "active", "inactive"]);
export const RULE_STATUS_LABEL: Record<RuleStatus, string> = {
  draft: "Entwurf",
  active: "Aktiv",
  inactive: "Inaktiv",
};

export const RunMode = {
  DEMO: "demo",
  SIMULATION: "simulation",
  PRODUCTION_READY: "production_ready",
} as const;
export type RunMode = (typeof RunMode)[keyof typeof RunMode];
export const RunModeSchema = z.enum(["demo", "simulation", "production_ready"]);
export const RUN_MODE_LABEL: Record<RunMode, string> = {
  demo: "Demo",
  simulation: "Simulation",
  production_ready: "Produktionsbereit",
};

export interface AutomationRuleEntry {
  id: string;
  name: string;
  description: string | null;
  trigger: AutomationTrigger;
  conditions: RuleCondition[];
  /** UND/ODER combination of the conditions. Defaults to "all" (UND). */
  conditionLogic: ConditionLogic;
  actions: RuleAction[];
  status: RuleStatus;
  runMode: RunMode;
  lastRunAt: Date | null;
  runCount: number;
  errorCount: number;
  isDemo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const RunLogStatus = {
  SIMULATED: "SIMULATED",
  EXECUTED: "EXECUTED",
  SKIPPED: "SKIPPED",
  ERROR: "ERROR",
} as const;
export type RunLogStatus = (typeof RunLogStatus)[keyof typeof RunLogStatus];

export interface AutomationRunLogEntry {
  id: string;
  ruleId: string;
  leadId: string | null;
  status: RunLogStatus;
  summary: string;
  detail: {
    conditions?: Array<{ type: string; passed: boolean; note?: string }>;
    actions?: Array<{ type: string; result: string }>;
  };
  isTest: boolean;
  triggeredBy: string;
  createdAt: Date;
}

// ── Workflow draft simulation (Testmodus) ───────────────────────────────────
// Read-only, non-persisting dry run of an (unsaved) workflow draft against a
// real lead. Never mutates data and never sends messages.

export interface WorkflowTraceCondition {
  type: string;
  passed: boolean;
  note?: string;
}

export interface WorkflowTraceAction {
  type: string;
  result: string;
}

export interface WorkflowSimulationResult {
  triggerType: string;
  recipient: {
    id: string;
    name: string;
    status: string;
    whatsappConsent: boolean;
    emailConsent: boolean;
  };
  conditions: WorkflowTraceCondition[];
  /** True when every condition passed (or there are none). */
  allPassed: boolean;
  /** Simulated action results — empty when conditions did not pass. */
  actions: WorkflowTraceAction[];
}

export interface TemplateRenderContext {
  first_name: string;
  last_name: string;
  full_name: string;
  name: string;
  phone: string;
  telefon: string;
  email: string;
  city: string;
  standort: string;
  location: string;
  secure_form_link: string;
  upload_link: string;
  booking_link: string;
  missing_documents: string;
  owner_name: string;
  company_name: string;
  appointment_date: string;
  appointment_time: string;
  interesse: string;
  interest: string;
  nachricht: string;
  message: string;
  source_domain: string;
  datum: string;
  // camelCase aliases (rendered lowercase) for the transactional lead templates.
  firstname: string;
  lastname: string;
  fullname: string;
  leadid: string;
  uploadlink: string;
  magiclink: string;
  supportemail: string;
}
