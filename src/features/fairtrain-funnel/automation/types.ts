/**
 * Automation domain types — canonical source for automation enums/interfaces.
 */
import { z } from "zod";

export const AutomationTrigger = {
  LEAD_CREATED: "LEAD_CREATED",
} as const;
export type AutomationTrigger =
  (typeof AutomationTrigger)[keyof typeof AutomationTrigger];
export const AutomationTriggerSchema = z.enum(["LEAD_CREATED"]);

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

export interface AutomationTemplateEntry {
  id: string;
  slug: string;
  trigger: AutomationTrigger;
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  name: string;
  subject: string | null;
  body: string;
  enabled: boolean;
  requiresConsent: string | null;
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

export interface TemplateRenderContext {
  name: string;
  email: string;
  telefon: string;
  phone: string;
  standort: string;
  location: string;
  interesse: string;
  interest: string;
  nachricht: string;
  message: string;
  source_domain: string;
  datum: string;
}
