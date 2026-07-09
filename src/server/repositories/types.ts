/**
 * Repository-level helper types and zod parsers for enum-validated string columns.
 *
 * Every read from the database goes through these parsers so that the rest of
 * the codebase never sees raw strings for enum-shaped fields.
 */
import {
  AuditAction,
  AuditActionSchema,
  CallOutcome,
  CallOutcomeSchema,
  CommunicationChannel,
  CommunicationChannelSchema,
  CommunicationDirection,
  CommunicationDirectionSchema,
  ConsentAction,
  ConsentActionSchema,
  ConsentType,
  ConsentTypeSchema,
  DocumentStatus,
  DocumentStatusSchema,
  DocumentType,
  DocumentTypeSchema,
  EmploymentStatus,
  EmploymentStatusSchema,
  FunnelPath,
  FunnelPathSchema,
  LeadPriority,
  LeadPrioritySchema,
  LeadStatus,
  LeadStatusSchema,
  MagicLinkScope,
  MagicLinkScopeSchema,
  PreferredLocation,
  PreferredLocationSchema,
  Role,
  RoleSchema,
  UploadedFileKind,
  UploadedFileKindSchema,
  AutomationTriggerSchema,
  AutomationLogStatusSchema,
  type LeadQualityStatus,
  LeadQualityStatusSchema,
  type WhatsappReachability,
  WhatsappReachabilitySchema,
  type WhatsappTrackingStatus,
  WhatsappTrackingStatusSchema,
} from "@/features/fairtrain-funnel/types";

export const parseLeadStatus = (v: string): LeadStatus =>
  LeadStatusSchema.parse(v);
export const parseLeadPriority = (v: string): LeadPriority =>
  LeadPrioritySchema.parse(v);
export const parseFunnelPath = (v: string): FunnelPath =>
  FunnelPathSchema.parse(v);
export const parsePreferredLocation = (v: string): PreferredLocation =>
  PreferredLocationSchema.parse(v);
export const parseEmploymentStatus = (v: string): EmploymentStatus =>
  EmploymentStatusSchema.parse(v);
export const parseDocumentType = (v: string): DocumentType =>
  DocumentTypeSchema.parse(v);
export const parseDocumentStatus = (v: string): DocumentStatus =>
  DocumentStatusSchema.parse(v);
export const parseCommunicationChannel = (v: string): CommunicationChannel =>
  CommunicationChannelSchema.parse(v);
export const parseCommunicationDirection = (
  v: string,
): CommunicationDirection => CommunicationDirectionSchema.parse(v);
export const parseConsentType = (v: string): ConsentType =>
  ConsentTypeSchema.parse(v);
export const parseConsentAction = (v: string): ConsentAction =>
  ConsentActionSchema.parse(v);
export const parseMagicLinkScope = (v: string): MagicLinkScope =>
  MagicLinkScopeSchema.parse(v);
export const parseUploadedFileKind = (v: string): UploadedFileKind =>
  UploadedFileKindSchema.parse(v);

export const parseAutomationTrigger = (v: string) =>
  AutomationTriggerSchema.parse(v);
export const parseAutomationLogStatus = (v: string) =>
  AutomationLogStatusSchema.parse(v);

export const parseNullableLeadStatus = (v: string | null): LeadStatus | null =>
  v === null ? null : parseLeadStatus(v);

// WhatsApp tracking columns always carry a DB default, but read defensively so
// a legacy/odd value can never crash a lead read.
export const parseWhatsappStatus = (v: string): WhatsappTrackingStatus => {
  const r = WhatsappTrackingStatusSchema.safeParse(v);
  return r.success ? r.data : "offen";
};
export const parseWhatsappReachability = (v: string): WhatsappReachability => {
  const r = WhatsappReachabilitySchema.safeParse(v);
  return r.success ? r.data : "unbekannt";
};
export const parseLeadQuality = (v: string): LeadQualityStatus => {
  const r = LeadQualityStatusSchema.safeParse(v);
  return r.success ? r.data : "unbewertet";
};

export const parseRole = (v: string): Role => RoleSchema.parse(v);
export const parseCallOutcome = (v: string): CallOutcome =>
  CallOutcomeSchema.parse(v);
export const parseAuditAction = (v: string): AuditAction =>
  AuditActionSchema.parse(v);
