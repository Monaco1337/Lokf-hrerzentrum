/**
 * AutomationService — orchestrates lead.created (and future) automations.
 *
 * Flow per template:
 *   1. Consent gate (when requiresConsent is set)
 *   2. Render DB template via TemplateRenderer
 *   3. Provider config check → skip with SKIPPED_MISSING_PROVIDER_CONFIG
 *   4. Send via EmailProvider / WhatsAppProvider (never from frontend)
 *   5. Append AutomationLog (+ CommunicationEvent on success/failure)
 */
import {
  renderEmailHtml,
  buildTemplateContext,
  renderTemplate,
} from "@/features/fairtrain-funnel/automation/TemplateRenderer";
import { createEmailProvider } from "@/features/fairtrain-funnel/automation/email/factory";
import type { EmailProvider } from "@/features/fairtrain-funnel/automation/email/EmailProvider";
import { createWhatsAppProvider } from "@/features/fairtrain-funnel/automation/whatsapp/factory";
import type { WhatsAppProvider } from "@/features/fairtrain-funnel/automation/whatsapp/WhatsAppProvider";
import {
  AuditAction,
  AutomationLogStatus,
  AutomationTrigger,
  CommunicationChannel,
  type AutomationLogEntry,
  type AutomationTemplateEntry,
  type ConsentState,
  type ConsentType,
  type LeadDetail,
  type TemplateChannelType,
  type TemplateRenderContext,
  FunnelPath,
  EmploymentStatus,
  PreferredLocation,
  LeadPriority,
  LeadStatus,
} from "@/features/fairtrain-funnel/types";

import { serverEnv } from "../env";
import { NotFoundError, ValidationError } from "../errors";
import { auditLogRepository } from "../repositories/AuditLogRepository";
import { automationLogRepository } from "../repositories/AutomationLogRepository";
import { automationRuleRepository } from "../repositories/AutomationRuleRepository";
import { automationRunLogRepository } from "../repositories/AutomationRunLogRepository";
import { automationTemplateRepository } from "../repositories/AutomationTemplateRepository";
import { demoSeedRepository } from "../repositories/DemoSeedRepository";
import { leadRepository } from "../repositories/LeadRepository";
import {
  executeEmailSend,
  executeWhatsappSend,
} from "./AutomationExecutor";
import { consentService } from "./ConsentService";

export interface AutomationPreviewResult {
  subject: string | null;
  body: string;
  html: string | null;
}

export class AutomationService {
  constructor(
    private readonly emailProvider: EmailProvider = createEmailProvider(),
    private readonly whatsAppProvider: WhatsAppProvider = createWhatsAppProvider(),
  ) {}

  async onLeadCreated(leadId: string): Promise<AutomationLogEntry[]> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);

    const templates = await automationTemplateRepository.listEnabledForTrigger(
      AutomationTrigger.LEAD_CREATED,
    );
    const consents = await consentService.currentStates(leadId);
    const logs: AutomationLogEntry[] = [];

    for (const template of templates) {
      const log = await this.executeTemplate({
        lead,
        template,
        consents,
        triggeredBy: "system",
        isTest: false,
      });
      logs.push(log);
    }

    return logs;
  }

  async resendForLead(
    leadId: string,
    templateId: string,
    actor: string,
  ): Promise<AutomationLogEntry> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);

    const template = await automationTemplateRepository.findById(templateId);
    if (!template) throw new NotFoundError("AutomationTemplate", templateId);

    const consents = await consentService.currentStates(leadId);
    return this.executeTemplate({
      lead,
      template,
      consents,
      triggeredBy: actor,
      isTest: false,
      force: true,
    });
  }

  async sendTest(
    templateId: string,
    recipient: string,
    actor: string,
  ): Promise<AutomationLogEntry> {
    const template = await automationTemplateRepository.findById(templateId);
    if (!template) throw new NotFoundError("AutomationTemplate", templateId);

    const sampleLead = this.sampleLead(recipient, template.channel);
    const consents = Object.values(
      ["PRIVACY", "EMAIL", "WHATSAPP", "PHONE", "MARKETING"] as ConsentType[],
    ).map((type) => ({ type, granted: true, lastChangeAt: new Date() }));

    return this.executeTemplate({
      lead: sampleLead,
      template,
      consents,
      triggeredBy: actor,
      isTest: true,
      force: true,
      testRecipient: recipient,
    });
  }

  async previewTemplate(
    templateId: string,
    leadId?: string,
  ): Promise<AutomationPreviewResult> {
    const template = await automationTemplateRepository.findById(templateId);
    if (!template) throw new NotFoundError("AutomationTemplate", templateId);

    const lead =
      leadId != null
        ? await leadRepository.findById(leadId)
        : this.sampleLead("max@example.com", template.channel);
    if (!lead) throw new NotFoundError("Lead", leadId ?? "sample");

    const ctx = this.buildContext(lead);
    const body = renderTemplate(template.body, ctx);
    const subject =
      template.subject != null
        ? renderTemplate(template.subject, ctx)
        : null;

    return {
      subject,
      body,
      html:
        template.channel === CommunicationChannel.EMAIL
          ? renderEmailHtml(body)
          : null,
    };
  }

  async listTemplates() {
    return automationTemplateRepository.list();
  }

  async listRules() {
    return automationRuleRepository.list();
  }

  async listRunLogs(limit = 100) {
    return automationRunLogRepository.listRecent(limit);
  }

  /**
   * Pre-built render contexts for a handful of demo leads — powers the live
   * template preview + the rule-simulation lead picker without extra round-trips.
   */
  async previewLeadContexts(
    limit = 8,
  ): Promise<Array<{ id: string; label: string; ctx: Record<string, string> }>> {
    const ids = (await demoSeedRepository.listByType("Lead")).slice(0, limit);
    const out: Array<{ id: string; label: string; ctx: Record<string, string> }> = [];
    for (const id of ids) {
      const lead = await leadRepository.findById(id);
      if (!lead) continue;
      out.push({
        id,
        label: `${lead.firstName} ${lead.lastName}`,
        ctx: this.buildContext(lead) as unknown as Record<string, string>,
      });
    }
    return out;
  }

  async updateTemplate(
    id: string,
    patch: {
      name?: string;
      subject?: string | null;
      body?: string;
      category?: import("@/features/fairtrain-funnel/types").TemplateCategoryType;
      status?: import("@/features/fairtrain-funnel/types").TemplateStatusType;
      requiresConsent?: ConsentType | null;
      metaTemplateName?: string | null;
      metaApprovalStatus?:
        | import("@/features/fairtrain-funnel/types").MetaApprovalStatusType
        | null;
    },
    actor: string,
  ) {
    const updated = await automationTemplateRepository.update(id, patch);
    await auditLogRepository.append({
      actor,
      action: AuditAction.AUTOMATION_TEMPLATE_UPDATED,
      entityType: "AutomationTemplate",
      entityId: id,
      details: JSON.stringify({ slug: updated.slug, status: updated.status }),
    });
    return updated;
  }

  async createTemplate(
    input: {
      name: string;
      channel: TemplateChannelType;
      category: import("@/features/fairtrain-funnel/types").TemplateCategoryType;
      status: import("@/features/fairtrain-funnel/types").TemplateStatusType;
      language: string;
      subject: string | null;
      body: string;
      requiresConsent: ConsentType | null;
      metaTemplateName: string | null;
      metaApprovalStatus:
        | import("@/features/fairtrain-funnel/types").MetaApprovalStatusType
        | null;
    },
    actor: string,
  ) {
    const created = await automationTemplateRepository.create({
      slug: this.slugify(input.name),
      trigger: AutomationTrigger.MANUAL,
      ...input,
    });
    await auditLogRepository.append({
      actor,
      action: AuditAction.AUTOMATION_TEMPLATE_CREATED,
      entityType: "AutomationTemplate",
      entityId: created.id,
      details: JSON.stringify({ slug: created.slug, channel: created.channel }),
    });
    return created;
  }

  async duplicateTemplate(id: string, actor: string) {
    const source = await automationTemplateRepository.findById(id);
    if (!source) throw new NotFoundError("AutomationTemplate", id);
    const created = await automationTemplateRepository.create({
      slug: this.slugify(`${source.name} kopie`),
      trigger: source.trigger,
      channel: source.channel,
      category: source.category,
      status: "draft",
      language: source.language,
      name: `${source.name} (Kopie)`,
      subject: source.subject,
      body: source.body,
      requiresConsent:
        (source.requiresConsent as ConsentType | null) ?? null,
      metaTemplateName: source.metaTemplateName,
      metaApprovalStatus: source.metaApprovalStatus,
    });
    await auditLogRepository.append({
      actor,
      action: AuditAction.AUTOMATION_TEMPLATE_CREATED,
      entityType: "AutomationTemplate",
      entityId: created.id,
      details: JSON.stringify({ duplicatedFrom: id, slug: created.slug }),
    });
    return created;
  }

  async deleteTemplate(id: string, actor: string) {
    const existing = await automationTemplateRepository.findById(id);
    if (!existing) throw new NotFoundError("AutomationTemplate", id);
    await automationTemplateRepository.delete(id);
    await auditLogRepository.append({
      actor,
      action: AuditAction.AUTOMATION_TEMPLATE_DELETED,
      entityType: "AutomationTemplate",
      entityId: id,
      details: JSON.stringify({ slug: existing.slug, name: existing.name }),
    });
  }

  private slugify(name: string): string {
    const base =
      name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "vorlage";
    return `${base}-${Math.random().toString(36).slice(2, 7)}`;
  }

  async listRecentLogs(limit = 50) {
    return automationLogRepository.listRecent(limit);
  }

  async listLogsForLead(leadId: string) {
    return automationLogRepository.listForLead(leadId);
  }

  private async executeTemplate(args: {
    lead: LeadDetail;
    template: AutomationTemplateEntry;
    consents: ConsentState[];
    triggeredBy: string;
    isTest: boolean;
    force?: boolean;
    testRecipient?: string;
  }): Promise<AutomationLogEntry> {
    const { lead, template, consents, triggeredBy, isTest, force, testRecipient } =
      args;
    if (template.channel === "INTERNAL") {
      throw new ValidationError(
        `Vorlage "${template.name}" ist intern und kann nicht versendet werden.`,
      );
    }
    const ctx = this.buildContext(lead);
    const renderedBody = renderTemplate(template.body, ctx);
    const renderedSubject =
      template.subject != null
        ? renderTemplate(template.subject, ctx)
        : null;

    if (!force && template.requiresConsent) {
      const granted = consents.find(
        (c) => c.type === template.requiresConsent,
      )?.granted;
      if (!granted) {
        return automationLogRepository.append({
          leadId: lead.id,
          templateId: template.id,
          trigger: template.trigger,
          channel: template.channel,
          status: AutomationLogStatus.SKIPPED_NO_CONSENT,
          renderedSubject,
          renderedBody,
          errorCode: "NO_CONSENT",
          errorMessage: `Consent ${template.requiresConsent} not granted`,
          isTest,
          triggeredBy,
        });
      }
    }

    if (template.channel === CommunicationChannel.EMAIL) {
      return executeEmailSend({
        emailProvider: this.emailProvider,
        lead,
        template,
        renderedSubject: renderedSubject ?? "Nachricht von Lokführerzentrum",
        renderedBody,
        triggeredBy,
        isTest,
        ...(testRecipient !== undefined ? { testRecipient } : {}),
      });
    }

    if (template.channel === CommunicationChannel.WHATSAPP) {
      return executeWhatsappSend({
        whatsAppProvider: this.whatsAppProvider,
        lead,
        template,
        renderedBody,
        triggeredBy,
        isTest,
        ...(testRecipient !== undefined ? { testRecipient } : {}),
      });
    }

    // INTERNAL templates are operator-facing notes, not sendable messages.
    throw new ValidationError(
      `Vorlage "${template.name}" hat den Kanal ${template.channel} und kann nicht versendet werden.`,
    );
  }

  private buildContext(lead: LeadDetail): TemplateRenderContext {
    let sourceDomain = "lokfuehrerzentrum.de";
    try {
      sourceDomain = new URL(serverEnv.APP_BASE_URL).hostname;
    } catch {
      // keep default
    }
    return buildTemplateContext(lead, sourceDomain);
  }

  private sampleLead(
    recipient: string,
    channel: TemplateChannelType,
  ): LeadDetail {
    const now = new Date();
    const base: LeadDetail = {
      id: "sample-preview",
      firstName: "Max",
      lastName: "Mustermann",
      email: channel === CommunicationChannel.EMAIL ? recipient : "max@example.com",
      phone: channel === CommunicationChannel.WHATSAPP ? recipient : "+491701234567",
      city: "Berlin",
      funnelPath: FunnelPath.UNEMPLOYED,
      employmentStatus: EmploymentStatus.UNEMPLOYED,
      preferredLocation: PreferredLocation.BERLIN,
      acceptsShiftWork: true,
      score: 80,
      priority: LeadPriority.WARM,
      status: LeadStatus.NEW,
      slaBreachedAt: null,
      nextFollowUpAt: null,
      assignedTo: null,
      assignedToId: null,
      assignedToUser: null,
      assignedAt: null,
      source: "preview",
      createdAt: now,
      updatedAt: now,
      motivationText: "Ich möchte Lokführer werden.",
      utm: null,
      birthDate: null,
      birthPlace: null,
      street: null,
      houseNumber: null,
      postalCode: null,
      addressCity: null,
      nationality: null,
      agencyCity: null,
      agencyCustomerNumber: null,
      agencyCaseWorker: null,
      unemployedSince: null,
      careerHistory: null,
      schoolEducation: null,
      graduationYear: null,
      languages: null,
      computerSkills: null,
      interests: null,
      acceptsTravelHotel: null,
      acceptsPsychLoad: null,
      hasNoKbaDrugEntries: null,
      availability: null,
      agencyStatus: null,
      hasEducationVoucher: null,
      hasDrivingLicense: null,
    };
    return base;
  }
}

export const automationService = new AutomationService();
