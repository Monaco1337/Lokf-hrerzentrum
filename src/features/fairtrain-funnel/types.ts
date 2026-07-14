/**
 * Domain types and enum source-of-truth.
 *
 * SQLite has no native Prisma enums, so every enum-like column is a String
 * in the DB and is validated via zod + a TypeScript union at every boundary.
 * Repositories validate on read, write paths require the union type, and UI
 * + Server Actions consume the unions exclusively.
 * This file is the canonical source — nothing else may define its own enum.
 */
import { z } from "zod";

import type {
  LeadQualityStatus,
  LeadTemperature,
  MessageSentBy as MessageSentByT,
  MessageStatus as MessageStatusT,
  MessageStatusChange,
  MessageType as MessageTypeT,
  WhatsappReachability,
  WhatsappTrackingStatus,
} from "./messaging/types";

// ---------------------------------------------------------------------------
// FunnelPath
// ---------------------------------------------------------------------------
export const FunnelPath = {
  UNEMPLOYED: "UNEMPLOYED",
  EMPLOYED: "EMPLOYED",
} as const;
export type FunnelPath = (typeof FunnelPath)[keyof typeof FunnelPath];
export const FunnelPathSchema = z.enum(["UNEMPLOYED", "EMPLOYED"]);

// ---------------------------------------------------------------------------
// PreferredLocation
// ---------------------------------------------------------------------------
export const PreferredLocation = {
  BERLIN: "BERLIN",
  SAALFELD: "SAALFELD",
  UNDECIDED: "UNDECIDED",
} as const;
export type PreferredLocation =
  (typeof PreferredLocation)[keyof typeof PreferredLocation];
export const PreferredLocationSchema = z.enum(["BERLIN", "SAALFELD", "UNDECIDED"]);

// ---------------------------------------------------------------------------
// EmploymentStatus
// ---------------------------------------------------------------------------
export const EmploymentStatus = {
  UNEMPLOYED: "UNEMPLOYED",
  EMPLOYED_FULL: "EMPLOYED_FULL",
  EMPLOYED_PART: "EMPLOYED_PART",
  MARGINAL: "MARGINAL",
  OTHER: "OTHER",
} as const;
export type EmploymentStatus =
  (typeof EmploymentStatus)[keyof typeof EmploymentStatus];
export const EmploymentStatusSchema = z.enum([
  "UNEMPLOYED",
  "EMPLOYED_FULL",
  "EMPLOYED_PART",
  "MARGINAL",
  "OTHER",
]);

// ---------------------------------------------------------------------------
// LeadStatus
// Pipeline aus Phase 2 erweitert um Zwischenschritte für die Lead-Reise:
//   CONTACT_PENDING  — Kontakt geplant, noch nicht aufgenommen
//   CALL_SCHEDULED   — Telefontermin vereinbart
//   BRIEFING_SENT    — Eignungs-Briefing/Infomaterial verschickt
//   ENROLLED         — Vertrag/Eintritt verbindlich (vor Ausbildungsstart)
//   STARTED          — Ausbildung läuft
//   LOST             — verloren (Lead hat abgebrochen / sich nicht gemeldet)
// ---------------------------------------------------------------------------
export const LeadStatus = {
  NEW: "NEW",
  QUALIFIED: "QUALIFIED",
  HOT: "HOT",
  CONTACT_PENDING: "CONTACT_PENDING",
  CONTACTED: "CONTACTED",
  // Engagement lifecycle (event-driven, forward-only). Sits between first
  // contact and the document phase; every value is set by a REAL signal:
  //   REPLIED            — lead answered in Multichat (inbound webhook)
  //   FORWARDED          — we sent the Eignungscheck/Landingpage link
  //   LANDINGPAGE_OPENED — the lead opened the tokenised portal link
  //   FUNNEL_STARTED     — the lead started the funnel/portal wizard
  //   FUNNEL_COMPLETED   — the lead finished the Eignungscheck/portal
  REPLIED: "REPLIED",
  FORWARDED: "FORWARDED",
  LANDINGPAGE_OPENED: "LANDINGPAGE_OPENED",
  FUNNEL_STARTED: "FUNNEL_STARTED",
  FUNNEL_COMPLETED: "FUNNEL_COMPLETED",
  CALL_SCHEDULED: "CALL_SCHEDULED",
  BRIEFING_SENT: "BRIEFING_SENT",
  DOC_PENDING: "DOC_PENDING",
  DOC_READY: "DOC_READY",
  AA_APPOINTMENT_PENDING: "AA_APPOINTMENT_PENDING",
  AA_APPOINTMENT_DONE: "AA_APPOINTMENT_DONE",
  GUTSCHEIN_PENDING: "GUTSCHEIN_PENDING",
  GUTSCHEIN_APPROVED: "GUTSCHEIN_APPROVED",
  ENROLLED: "ENROLLED",
  STARTED: "STARTED",
  CLOSED: "CLOSED",
  LOST: "LOST",
  REJECTED: "REJECTED",
  BLOCKED: "BLOCKED",
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];
export const LeadStatusSchema = z.enum(
  Object.values(LeadStatus) as [LeadStatus, ...LeadStatus[]],
);

// ---------------------------------------------------------------------------
// ContactInquiryStatus - lightweight inbox lifecycle for "Noch eine Frage?"
// form submissions. Stays orthogonal to LeadStatus on purpose.
// ---------------------------------------------------------------------------
export const ContactInquiryStatus = {
  NEW: "NEW",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  SPAM: "SPAM",
} as const;
export type ContactInquiryStatus =
  (typeof ContactInquiryStatus)[keyof typeof ContactInquiryStatus];
export const ContactInquiryStatusSchema = z.enum([
  "NEW",
  "IN_PROGRESS",
  "DONE",
  "SPAM",
]);

/**
 * UI-facing shape of a ContactInquiry. Mirrors the repository row but is
 * defined here so the UI layer never has to reach into @/server/*.
 */
export interface ContactInquirySummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  message: string;
  status: ContactInquiryStatus;
  source: string | null;
  utm: string | null;
  ipHash: string | null;
  userAgent: string | null;
  handledBy: string | null;
  handledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// LeadPriority
// ---------------------------------------------------------------------------
export const LeadPriority = {
  HOT: "HOT",
  WARM: "WARM",
  COLD: "COLD",
  BLOCKED: "BLOCKED",
} as const;
export type LeadPriority = (typeof LeadPriority)[keyof typeof LeadPriority];
export const LeadPrioritySchema = z.enum(["HOT", "WARM", "COLD", "BLOCKED"]);

// ---------------------------------------------------------------------------
// DocumentType
// ---------------------------------------------------------------------------
export const DocumentType = {
  CV: "CV",
  AA_REASONING: "AA_REASONING",
  AA_GUIDE: "AA_GUIDE",
  LOCATION_INFO: "LOCATION_INFO",
  HOUSING_SAALFELD: "HOUSING_SAALFELD",
  WEITERBILDUNG_INFO: "WEITERBILDUNG_INFO",
  MASTER_BUNDLE: "MASTER_BUNDLE",
} as const;
export type DocumentType = (typeof DocumentType)[keyof typeof DocumentType];
export const DocumentTypeSchema = z.enum([
  "CV",
  "AA_REASONING",
  "AA_GUIDE",
  "LOCATION_INFO",
  "HOUSING_SAALFELD",
  "WEITERBILDUNG_INFO",
  "MASTER_BUNDLE",
]);

// ---------------------------------------------------------------------------
// DocumentStatus
// ---------------------------------------------------------------------------
export const DocumentStatus = {
  MISSING_DATA: "MISSING_DATA",
  READY_TO_GENERATE: "READY_TO_GENERATE",
  GENERATED: "GENERATED",
  SENT: "SENT",
  UPDATED: "UPDATED",
} as const;
export type DocumentStatus =
  (typeof DocumentStatus)[keyof typeof DocumentStatus];
export const DocumentStatusSchema = z.enum([
  "MISSING_DATA",
  "READY_TO_GENERATE",
  "GENERATED",
  "SENT",
  "UPDATED",
]);

// ---------------------------------------------------------------------------
// CommunicationChannel
// ---------------------------------------------------------------------------
export const CommunicationChannel = {
  WHATSAPP: "WHATSAPP",
  EMAIL: "EMAIL",
  SMS: "SMS",
  INTERNAL: "INTERNAL",
} as const;
export type CommunicationChannel =
  (typeof CommunicationChannel)[keyof typeof CommunicationChannel];
export const CommunicationChannelSchema = z.enum([
  "WHATSAPP",
  "EMAIL",
  "SMS",
  "INTERNAL",
]);
export const COMMUNICATION_CHANNEL_LABEL: Record<CommunicationChannel, string> =
  {
    WHATSAPP: "WhatsApp",
    EMAIL: "E-Mail",
    SMS: "SMS",
    INTERNAL: "Intern",
  };

// ---------------------------------------------------------------------------
// CommunicationDirection
// ---------------------------------------------------------------------------
export const CommunicationDirection = {
  OUT: "OUT",
  IN: "IN",
} as const;
export type CommunicationDirection =
  (typeof CommunicationDirection)[keyof typeof CommunicationDirection];
export const CommunicationDirectionSchema = z.enum(["OUT", "IN"]);

export {
  AutomationTrigger,
  AutomationTriggerSchema,
  TRIGGER_LABEL,
  AutomationLogStatus,
  AutomationLogStatusSchema,
  TemplateChannel,
  TemplateChannelSchema,
  TEMPLATE_CHANNEL_LABEL,
  TemplateCategory,
  TemplateCategorySchema,
  TEMPLATE_CATEGORY_LABEL,
  TemplateStatus,
  TemplateStatusSchema,
  TEMPLATE_STATUS_LABEL,
  MetaApprovalStatus,
  MetaApprovalStatusSchema,
  META_APPROVAL_STATUS_LABEL,
  META_BUTTON_TYPES,
  META_BUTTON_TYPE_LABEL,
  MetaTemplateButtonSchema,
  RuleConditionType,
  CONDITION_LABEL,
  CONDITIONS_WITH_VALUE,
  RuleActionType,
  ACTION_LABEL,
  RuleConditionSchema,
  RuleActionSchema,
  RuleStatus,
  RuleStatusSchema,
  RULE_STATUS_LABEL,
  RunMode,
  RunModeSchema,
  RUN_MODE_LABEL,
  RunLogStatus,
} from "./automation/types";
export type {
  AutomationTrigger as AutomationTriggerType,
  AutomationLogStatus as AutomationLogStatusType,
  AutomationTemplateEntry,
  AutomationLogEntry,
  TemplateChannel as TemplateChannelType,
  TemplateCategory as TemplateCategoryType,
  TemplateStatus as TemplateStatusType,
  MetaApprovalStatus as MetaApprovalStatusType,
  MetaTemplateButton,
  MetaTemplateButtonType,
  RuleConditionType as RuleConditionTypeT,
  RuleActionType as RuleActionTypeT,
  RuleCondition,
  RuleAction,
  RuleStatus as RuleStatusType,
  RunMode as RunModeType,
  AutomationRuleEntry,
  AutomationRunLogEntry,
  RunLogStatus as RunLogStatusType,
  WorkflowTraceCondition,
  WorkflowTraceAction,
  WorkflowSimulationResult,
  TemplateRenderContext,
} from "./automation/types";

// Applicant portal — link lifecycle, document checklist, form contract.
export * from "./portal/types";

// Messaging / communication ledger lifecycle types.
export {
  MessageType,
  MessageTypeSchema,
  MESSAGE_TYPE_LABEL,
  MessageStatus,
  MessageStatusSchema,
  MESSAGE_STATUS_LABEL,
  MESSAGE_STATUS_FLOW,
  MessageSentBy,
  MessageSentBySchema,
  MESSAGE_SENT_BY_LABEL,
  MessageStatusChangeSchema,
  WhatsappTrackingStatus,
  WhatsappTrackingStatusSchema,
  WHATSAPP_TRACKING_LABEL,
  WhatsappReachability,
  WhatsappReachabilitySchema,
  LeadQualityStatus,
  LeadQualityStatusSchema,
  LEAD_QUALITY_LABEL,
  leadTemperature,
} from "./messaging/types";
export type {
  MessageType as MessageTypeT,
  MessageStatus as MessageStatusT,
  MessageSentBy as MessageSentByT,
  MessageStatusChange,
  LeadTemperature,
} from "./messaging/types";

// ---------------------------------------------------------------------------
// ConsentType + ConsentAction
// ---------------------------------------------------------------------------
export const ConsentType = {
  PRIVACY: "PRIVACY",
  EMAIL: "EMAIL",
  WHATSAPP: "WHATSAPP",
  PHONE: "PHONE",
  MARKETING: "MARKETING",
} as const;
export type ConsentType = (typeof ConsentType)[keyof typeof ConsentType];
export const ConsentTypeSchema = z.enum([
  "PRIVACY",
  "EMAIL",
  "WHATSAPP",
  "PHONE",
  "MARKETING",
]);

export const ConsentAction = {
  GRANT: "GRANT",
  REVOKE: "REVOKE",
} as const;
export type ConsentAction = (typeof ConsentAction)[keyof typeof ConsentAction];
export const ConsentActionSchema = z.enum(["GRANT", "REVOKE"]);

// ---------------------------------------------------------------------------
// MagicLinkScope
// ---------------------------------------------------------------------------
export const MagicLinkScope = {
  COMPLETE_PROFILE: "COMPLETE_PROFILE",
  UPLOAD_DOCS: "UPLOAD_DOCS",
} as const;
export type MagicLinkScope =
  (typeof MagicLinkScope)[keyof typeof MagicLinkScope];
export const MagicLinkScopeSchema = z.enum(["COMPLETE_PROFILE", "UPLOAD_DOCS"]);

// ---------------------------------------------------------------------------
// UploadedFileKind
// ---------------------------------------------------------------------------
export const UploadedFileKind = {
  CV: "CV",
  CERTIFICATE: "CERTIFICATE",
  ID: "ID",
  OTHER: "OTHER",
} as const;
export type UploadedFileKind =
  (typeof UploadedFileKind)[keyof typeof UploadedFileKind];
export const UploadedFileKindSchema = z.enum(["CV", "CERTIFICATE", "ID", "OTHER"]);

// User, Role, CallOutcome, AuditAction live in dedicated modules to keep this
// file under the per-file max-lines budget. Re-export so existing call sites
// (`import { Role, ... } from "../types"`) keep working unchanged.
export {
  AuditAction,
  AuditActionSchema,
  CALL_OUTCOME_LABEL,
  CallOutcome,
  CallOutcomeSchema,
  ROLE_LABEL,
  Role,
  RoleSchema,
} from "./userTypes";
import type { UserRef } from "./userTypes";
export type {
  AuditLogEntry,
  CallLogEntry,
  UserRef,
  UserSummary,
} from "./userTypes";

// ---------------------------------------------------------------------------
// Domain types used by services and UI (NOT identical to Prisma row shape)
// ---------------------------------------------------------------------------

export type BlockReasonCode =
  | "MPU_ISSUE"
  | "DRUG_ISSUE"
  | "NO_SHIFT_WORK"
  | "NO_PROGRAM_INTEREST"
  | "KBA_DRUG_ENTRY"
  | "NO_TRAVEL_HOTEL"
  | "PSYCH_LOAD_REFUSED";

export interface ScoringInput {
  funnelPath: FunnelPath;
  preferredLocation: PreferredLocation;
  acceptsShiftWork: boolean;
  hasMpuIssue: boolean;
  hasDrugIssue: boolean;
  motivationText: string | null;
  isInterestedInProgram: boolean;
  isProfileComplete: boolean;
}

export interface ScoringResult {
  score: number;
  priority: LeadPriority;
  blockedReasons: BlockReasonCode[];
}

export interface LeadSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string | null;
  funnelPath: FunnelPath;
  employmentStatus: EmploymentStatus;
  preferredLocation: PreferredLocation;
  acceptsShiftWork: boolean;
  score: number;
  priority: LeadPriority;
  status: LeadStatus;
  slaBreachedAt: Date | null;
  nextFollowUpAt: Date | null;
  /** Legacy free-text assignee (kept for migration). */
  assignedTo: string | null;
  /** Canonical assignee reference — resolved via Prisma include. */
  assignedToId: string | null;
  assignedToUser: UserRef | null;
  assignedAt: Date | null;
  source: string | null;
  // WhatsApp status tracking (real provider signals only).
  whatsappStatus: WhatsappTrackingStatus;
  whatsappReachability: WhatsappReachability;
  leadQualityStatus: LeadQualityStatus;
  leadScore: number;
  lastWhatsappMessageAt: Date | null;
  lastWhatsappDeliveredAt: Date | null;
  lastWhatsappReadAt: Date | null;
  lastWhatsappReplyAt: Date | null;
  lastWhatsappErrorAt: Date | null;
  lastWhatsappErrorReason: string | null;
  lastInboundMessage: string | null;
  lastInboundMessageAt: Date | null;
  // WhatsApp opt-out (real inbound stop keywords only). When true the lead is
  // never contacted via WhatsApp again, but stays fully in the CRM.
  optOut: boolean;
  optOutAt: Date | null;
  whatsappMarketing: boolean;
  /** Free-form label set (incl. `whatsapp_opt_out`). */
  tags: string[];
  // Reactivation campaign layer (additive; separate from pipeline `status`).
  leadType: string;
  campaign: string | null;
  campaignStatus: string | null;
  campaignStep: number;
  communicationStarted: boolean;
  firstContactSentAt: Date | null;
  automationPaused: boolean;
  campaignCompleted: boolean;
  employmentSnapshot: string | null;
  nextCampaignActionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadDetail extends LeadSummary {
  motivationText: string | null;
  utm: string | null;

  // extended person data
  birthDate: Date | null;
  birthPlace: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  addressCity: string | null;
  nationality: string | null;

  // agency data
  agencyCity: string | null;
  agencyCustomerNumber: string | null;
  agencyCaseWorker: string | null;

  // CV / interview
  unemployedSince: string | null;
  careerHistory: string | null;
  schoolEducation: string | null;
  graduationYear: string | null;
  languages: string | null;
  computerSkills: string | null;
  interests: string | null;

  // K.O. snapshot
  acceptsTravelHotel: boolean | null;
  acceptsPsychLoad: boolean | null;
  hasNoKbaDrugEntries: boolean | null;

  // applicant self-service portal fields
  availability: string | null;
  agencyStatus: string | null;
  hasEducationVoucher: boolean | null;
  hasDrivingLicense: boolean | null;
}

export interface UploadedFileEntry {
  id: string;
  kind: UploadedFileKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  sha256: string;
  uploadedAt: Date;
  deletedAt: Date | null;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  changedBy: string;
  reason: string | null;
  createdAt: Date;
}

export interface NoteEntry {
  id: string;
  body: string;
  author: string;
  createdAt: Date;
  editedAt: Date | null;
}

export interface DocumentEntry {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  storageKey: string | null;
  generatedAt: Date | null;
  sentAt: Date | null;
  updatedAt: Date;
}

export interface CommunicationEntry {
  id: string;
  leadId: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  payload: string;
  providerMessageId: string | null;
  errorCode: string | null;
  // Message ledger fields.
  type: MessageTypeT;
  templateId: string | null;
  templateName: string | null;
  variablesResolved: Record<string, string> | null;
  status: MessageStatusT;
  statusHistory: MessageStatusChange[];
  sentBy: MessageSentByT;
  actorId: string | null;
  isDemo: boolean;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
  failedReason: string | null;
  /** Which of our WhatsApp business numbers handled this message (or null). */
  businessPhoneNumberId: string | null;
  /** Set on an outbound message when the lead replied to it. */
  repliedAt: Date | null;
  /** Last raw provider event JSON for this message (debugging only). */
  rawWebhookPayload: string | null;
  createdAt: Date;
}

export interface ConsentState {
  type: ConsentType;
  granted: boolean;
  lastChangeAt: Date | null;
}

export interface ConsentInput {
  type: ConsentType;
  granted: boolean;
}

export interface EligibilityAnswerEntry {
  questionId: string;
  answer: string;
  score: number;
}

export interface SensitiveAnswersData {
  hasMpuIssue: boolean;
  hasDrugIssue: boolean;
  notesSensitive: string | null;
}

export interface LeadFilters {
  /**
   * Either a single status or a list of statuses. A list is used by the
   * pipeline kanban deep-links so clicking a phase filters all matching
   * statuses at once.
   */
  status?: LeadStatus | ReadonlyArray<LeadStatus> | undefined;
  priority?: LeadPriority | undefined;
  preferredLocation?: PreferredLocation | undefined;
  funnelPath?: FunnelPath | undefined;
  source?: string | undefined;
  slaBreachedOnly?: boolean | undefined;
  createdFrom?: Date | undefined;
  createdTo?: Date | undefined;
  /** Restrict to leads assigned to a specific user (used for scoping). */
  assignedToId?: string | undefined;
  /**
   * If true, also include leads with no assignment. Combined with
   * `assignedToId` this lets PARTNER_MANAGER see their leads + unassigned.
   */
  includeUnassigned?: boolean | undefined;
  /** Filter by WhatsApp tracking status (one value). */
  whatsappStatus?: WhatsappTrackingStatus | undefined;
  /** Filter by lead quality classification (e.g. schrottlead). */
  leadQualityStatus?: LeadQualityStatus | undefined;
  /** Only leads with an unanswered inbound reply (Inbox "neue Antworten"). */
  hasNewReply?: boolean | undefined;
  /** Derived HOT/WARM/COLD engagement bucket — applied in-page, not in SQL. */
  temperature?: LeadTemperature | undefined;
  /** Filter by lead type ("neu" | "alt_lead"). */
  leadType?: string | undefined;
  /** Filter by campaign key (e.g. "reaktivierung_alt_leads"). */
  campaign?: string | undefined;
  /** Filter by campaign lifecycle status. */
  campaignStatus?: string | undefined;
}

export interface LeadKpis {
  total: number;
  hot: number;
  newToday: number;
  followUpsOpen: number;
  docsOpen: number;
  gutscheinApproved: number;
  /** HOT leads whose response SLA window has already elapsed. */
  slaBreached: number;
  /** Lead count grouped by status — drives funnel visualisations. */
  byStatus: Record<LeadStatus, number>;

  // ---- Executive layer (Phase 1: Lead Control Center) ---------------------
  /** Gutscheine in Bearbeitung — beantragt aber noch nicht bewilligt. */
  gutscheinPending: number;
  /** Conversion-Rate: Anteil aller Leads, die einen Gutschein erhalten oder abgeschlossen wurden, von allen Leads, die das System aktiv durchlaufen (ohne BLOCKED/REJECTED). 0..1 */
  conversionRate: number;
  /** Förderquote: Anteil bewilligter Gutscheine an allen Gutschein-Anträgen. 0..1 */
  foerderquote: number;
  /** Durchschnittliche Bearbeitungszeit in Stunden, gemessen über die letzten 30 Tage erfolgreich abgeschlossener Leads. Null falls noch keine Daten. */
  avgProcessingHours: number | null;
  /** Vertragsstarts diesen Monat — abgeschlossene Leads (CLOSED) mit Abschluss-Datum im laufenden Monat. */
  ausbildungsstartsMonth: number;
  /** Leads without an assigned operator. */
  unassigned: number;
}

// Intelligence-layer types live in ./intelligence/types.ts so that this file
// stays under the max-lines guard and the funnel-domain types stay focused on
// persistent enums + entity shapes.
export type {
  DashboardIntelligence,
  EnrichedLeadSummary,
  LeadInsights,
  LeadUrgency,
  NextBestAction,
  PrioritySignal,
} from "./intelligence/types";

export type { LeadFullDetail } from "./leadDetailTypes";

// Task system — kept in its own module to stay below the file-size guard.
export {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TaskPriority,
  TaskPrioritySchema,
  TaskStatus,
  TaskStatusSchema,
} from "./taskTypes";
export type { TaskSummary } from "./taskTypes";
