/**
 * Channel send execution for AutomationService — keeps service under line limit.
 */
import { renderEmailHtml } from "@/features/fairtrain-funnel/automation/TemplateRenderer";
import {
  isValidE164,
  normalizePhoneForWhatsApp,
} from "@/features/fairtrain-funnel/automation/PhoneNormalizer";
import type { EmailProvider } from "@/features/fairtrain-funnel/automation/email/EmailProvider";
import type { WhatsAppProvider } from "@/features/fairtrain-funnel/automation/whatsapp/WhatsAppProvider";
import {
  AuditAction,
  AutomationLogStatus,
  CommunicationChannel,
  CommunicationDirection,
  type AutomationLogEntry,
  type AutomationTemplateEntry,
  type LeadDetail,
} from "@/features/fairtrain-funnel/types";

import { auditLogRepository } from "../repositories/AuditLogRepository";
import { automationLogRepository } from "../repositories/AutomationLogRepository";
import { communicationRepository } from "../repositories/CommunicationRepository";

export async function executeEmailSend(args: {
  emailProvider: EmailProvider;
  lead: LeadDetail;
  template: AutomationTemplateEntry;
  renderedSubject: string;
  renderedBody: string;
  triggeredBy: string;
  isTest: boolean;
  testRecipient?: string;
}): Promise<AutomationLogEntry> {
  const {
    emailProvider,
    lead,
    template,
    renderedSubject,
    renderedBody,
    triggeredBy,
    isTest,
    testRecipient,
  } = args;

  if (!emailProvider.isConfigured()) {
    return automationLogRepository.append({
      leadId: lead.id,
      templateId: template.id,
      trigger: template.trigger,
      channel: CommunicationChannel.EMAIL,
      status: AutomationLogStatus.SKIPPED_MISSING_PROVIDER_CONFIG,
      renderedSubject,
      renderedBody,
      errorCode: "MISSING_PROVIDER_CONFIG",
      errorMessage: `Email provider "${emailProvider.name}" not configured`,
      isTest,
      triggeredBy,
    });
  }

  const to = testRecipient ?? lead.email;
  const html = renderEmailHtml(renderedBody);

  try {
    const result = await emailProvider.send(to, renderedSubject, html);
    const log = await automationLogRepository.append({
      leadId: lead.id,
      templateId: template.id,
      trigger: template.trigger,
      channel: CommunicationChannel.EMAIL,
      status: AutomationLogStatus.SENT,
      renderedSubject,
      renderedBody,
      providerMessageId: result.providerMessageId,
      isTest,
      triggeredBy,
    });

    if (!isTest) {
      await communicationRepository.append({
        leadId: lead.id,
        channel: CommunicationChannel.EMAIL,
        direction: CommunicationDirection.OUT,
        payload: result.rawPayload,
        providerMessageId: result.providerMessageId,
        errorCode: null,
        type: "TEMPLATE",
        templateId: template.id,
        templateName: template.name,
        status: "SENT",
        sentBy: "AUTOMATION",
        actorId: triggeredBy,
        isDemo: true,
        sentAt: new Date(),
      });
      await auditLogRepository.append({
        actor: triggeredBy,
        action: AuditAction.AUTOMATION_SENT,
        entityType: "Lead",
        entityId: lead.id,
        details: JSON.stringify({
          channel: "EMAIL",
          templateSlug: template.slug,
          logId: log.id,
        }),
      });
    }

    return log;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    const log = await automationLogRepository.append({
      leadId: lead.id,
      templateId: template.id,
      trigger: template.trigger,
      channel: CommunicationChannel.EMAIL,
      status: AutomationLogStatus.FAILED,
      renderedSubject,
      renderedBody,
      errorCode: "SEND_FAILED",
      errorMessage: message,
      isTest,
      triggeredBy,
    });

    if (!isTest) {
      await communicationRepository.append({
        leadId: lead.id,
        channel: CommunicationChannel.EMAIL,
        direction: CommunicationDirection.OUT,
        payload: JSON.stringify({ error: message }),
        providerMessageId: null,
        errorCode: "SEND_FAILED",
        type: "TEMPLATE",
        templateId: template.id,
        templateName: template.name,
        status: "FAILED",
        sentBy: "AUTOMATION",
        actorId: triggeredBy,
        isDemo: true,
        failedAt: new Date(),
        failedReason: message,
      });
      await auditLogRepository.append({
        actor: triggeredBy,
        action: AuditAction.AUTOMATION_FAILED,
        entityType: "Lead",
        entityId: lead.id,
        details: JSON.stringify({
          channel: "EMAIL",
          templateSlug: template.slug,
          error: message,
        }),
      });
    }

    return log;
  }
}

export async function executeWhatsappSend(args: {
  whatsAppProvider: WhatsAppProvider;
  lead: LeadDetail;
  template: AutomationTemplateEntry;
  renderedBody: string;
  triggeredBy: string;
  isTest: boolean;
  testRecipient?: string;
}): Promise<AutomationLogEntry> {
  const {
    whatsAppProvider,
    lead,
    template,
    renderedBody,
    triggeredBy,
    isTest,
    testRecipient,
  } = args;

  if (!whatsAppProvider.isConfigured()) {
    return automationLogRepository.append({
      leadId: lead.id,
      templateId: template.id,
      trigger: template.trigger,
      channel: CommunicationChannel.WHATSAPP,
      status: AutomationLogStatus.SKIPPED_MISSING_PROVIDER_CONFIG,
      renderedSubject: null,
      renderedBody,
      errorCode: "MISSING_PROVIDER_CONFIG",
      errorMessage: `WhatsApp provider "${whatsAppProvider.name}" not configured`,
      isTest,
      triggeredBy,
    });
  }

  const rawPhone = testRecipient ?? lead.phone;
  const to = normalizePhoneForWhatsApp(rawPhone);
  if (!isValidE164(to)) {
    return automationLogRepository.append({
      leadId: lead.id,
      templateId: template.id,
      trigger: template.trigger,
      channel: CommunicationChannel.WHATSAPP,
      status: AutomationLogStatus.FAILED,
      renderedSubject: null,
      renderedBody,
      errorCode: "INVALID_PHONE",
      errorMessage: `Invalid phone for WhatsApp: ${rawPhone}`,
      isTest,
      triggeredBy,
    });
  }

  try {
    const result = await whatsAppProvider.send(to, renderedBody);
    const log = await automationLogRepository.append({
      leadId: lead.id,
      templateId: template.id,
      trigger: template.trigger,
      channel: CommunicationChannel.WHATSAPP,
      status: AutomationLogStatus.SENT,
      renderedSubject: null,
      renderedBody,
      providerMessageId: result.providerMessageId,
      isTest,
      triggeredBy,
    });

    if (!isTest) {
      await communicationRepository.append({
        leadId: lead.id,
        channel: CommunicationChannel.WHATSAPP,
        direction: CommunicationDirection.OUT,
        payload: result.rawPayload,
        providerMessageId: result.providerMessageId,
        errorCode: null,
        type: "TEMPLATE",
        templateId: template.id,
        templateName: template.name,
        status: "SENT",
        sentBy: "AUTOMATION",
        actorId: triggeredBy,
        isDemo: true,
        sentAt: new Date(),
      });
      await auditLogRepository.append({
        actor: triggeredBy,
        action: AuditAction.AUTOMATION_SENT,
        entityType: "Lead",
        entityId: lead.id,
        details: JSON.stringify({
          channel: "WHATSAPP",
          templateSlug: template.slug,
          logId: log.id,
        }),
      });
    }

    return log;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    const log = await automationLogRepository.append({
      leadId: lead.id,
      templateId: template.id,
      trigger: template.trigger,
      channel: CommunicationChannel.WHATSAPP,
      status: AutomationLogStatus.FAILED,
      renderedSubject: null,
      renderedBody,
      errorCode: "SEND_FAILED",
      errorMessage: message,
      isTest,
      triggeredBy,
    });

    if (!isTest) {
      await communicationRepository.append({
        leadId: lead.id,
        channel: CommunicationChannel.WHATSAPP,
        direction: CommunicationDirection.OUT,
        payload: JSON.stringify({ error: message }),
        providerMessageId: null,
        errorCode: "SEND_FAILED",
        type: "TEMPLATE",
        templateId: template.id,
        templateName: template.name,
        status: "FAILED",
        sentBy: "AUTOMATION",
        actorId: triggeredBy,
        isDemo: true,
        failedAt: new Date(),
        failedReason: message,
      });
      await auditLogRepository.append({
        actor: triggeredBy,
        action: AuditAction.AUTOMATION_FAILED,
        entityType: "Lead",
        entityId: lead.id,
        details: JSON.stringify({
          channel: "WHATSAPP",
          templateSlug: template.slug,
          error: message,
        }),
      });
    }

    return log;
  }
}
