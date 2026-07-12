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
import { portalService } from "./PortalService";

export interface AutomationPreviewResult {
  subject: string | null;
  body: string;
  html: string | null;
}

/** Stable slugs for the two standard transactional lead templates. */
export const WELCOME_EMAIL_SLUG = "lead_welcome_email";
export const UPLOAD_REQUEST_EMAIL_SLUG = "lead_upload_request_email";

const WELCOME_EMAIL_BODY = `Guten Tag {{firstName}},

vielen Dank für Ihre Anfrage beim Lokführerzentrum.

Wir haben Ihre Angaben erhalten und prüfen jetzt die nächsten Schritte für Ihre geförderte Weiterbildung zum Lokführer.

Falls noch Unterlagen fehlen, können Sie diese hier ergänzen:

{{uploadLink}}

Ihre Vorgangsnummer:
{{leadId}}

Mit freundlichen Grüßen
Ihr Lokführerzentrum-Team`;

const UPLOAD_REQUEST_EMAIL_BODY = `Guten Tag {{firstName}},

wir melden uns bezüglich Ihrer Anfrage zur geförderten Weiterbildung zum Lokführer.

Damit wir Ihren Vorgang sauber prüfen und vorbereiten können, können Sie Ihre fehlenden Unterlagen über den folgenden sicheren Link hochladen:

{{uploadLink}}

Ihre Vorgangsnummer:
{{leadId}}

Falls Sie Fragen haben, antworten Sie einfach auf diese E-Mail.

Mit freundlichen Grüßen
Ihr Lokführerzentrum-Team`;

/** Templates that must NOT mint a portal link (skip the extra DB write). */
const UPLOAD_LINK_PATTERN =
  /\{\{\s*(upload_link|uploadlink|magic_link|magiclink)\s*\}\}/i;

export class AutomationService {
  constructor(
    private readonly emailProvider: EmailProvider = createEmailProvider(),
    private readonly whatsAppProvider: WhatsAppProvider = createWhatsAppProvider(),
  ) {}

  async onLeadCreated(leadId: string): Promise<AutomationLogEntry[]> {
    await this.ensureTransactionalTemplates();

    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);

    // Safety net: imported Alt-Leads / paused leads never run new-lead
    // automation. Their contact is driven exclusively by the reactivation
    // campaign after a manual release.
    if (lead.leadType === "alt_lead" || lead.automationPaused) {
      return [];
    }

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
        // Re-triggering lead.created must never double-send the same template.
        skipIfAlreadySent: true,
      });
      logs.push(log);
    }

    return logs;
  }

  /**
   * Manually send the "Erstkontakt / Unterlagen anfordern" email to a lead
   * (e.g. an imported existing lead). Transactional — no marketing consent
   * required — but guarded against double-sends.
   */
  async sendFirstContact(
    leadId: string,
    actor: string,
  ): Promise<AutomationLogEntry> {
    await this.ensureTransactionalTemplates();

    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);

    const template = await automationTemplateRepository.findBySlug(
      UPLOAD_REQUEST_EMAIL_SLUG,
    );
    if (!template) {
      throw new NotFoundError("AutomationTemplate", UPLOAD_REQUEST_EMAIL_SLUG);
    }

    const consents = await consentService.currentStates(leadId);
    return this.executeTemplate({
      lead,
      template,
      consents,
      triggeredBy: actor,
      isTest: false,
      // Transactional response to the lead's own request — bypass consent gate.
      force: true,
      skipIfAlreadySent: true,
    });
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
      senderPhoneNumberId?: string | null;
      metaBodyParams?: string[];
      language?: string;
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
      senderPhoneNumberId?: string | null;
      metaBodyParams?: string[];
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
      senderPhoneNumberId: source.senderPhoneNumberId,
      metaBodyParams: source.metaBodyParams,
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
    skipIfAlreadySent?: boolean;
    testRecipient?: string;
  }): Promise<AutomationLogEntry> {
    const {
      lead,
      template,
      consents,
      triggeredBy,
      isTest,
      force,
      skipIfAlreadySent,
      testRecipient,
    } = args;
    if (template.channel === "INTERNAL") {
      throw new ValidationError(
        `Vorlage "${template.name}" ist intern und kann nicht versendet werden.`,
      );
    }

    // Double-send guard: if this template was already delivered to this lead,
    // log a skip instead of sending again.
    if (skipIfAlreadySent && !isTest) {
      const prior = await automationLogRepository.findSuccessfulSend(
        lead.id,
        template.id,
      );
      if (prior) {
        return automationLogRepository.append({
          leadId: lead.id,
          templateId: template.id,
          trigger: template.trigger,
          channel: template.channel,
          status: AutomationLogStatus.SKIPPED,
          renderedSubject: template.subject,
          renderedBody: template.body,
          errorCode: "ALREADY_SENT",
          errorMessage: `Bereits gesendet am ${prior.createdAt.toISOString()}`,
          isTest,
          triggeredBy,
        });
      }
    }

    const needsUploadLink =
      UPLOAD_LINK_PATTERN.test(template.body) ||
      (template.subject != null && UPLOAD_LINK_PATTERN.test(template.subject));
    const ctx = await this.buildSendContext(lead, isTest, needsUploadLink);
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

  private sourceDomain(): string {
    try {
      return new URL(serverEnv.APP_BASE_URL).hostname;
    } catch {
      // Punycode form of the IDN production domain `lokführerzentrum.de`.
      return "xn--lokfhrerzentrum-2vb.de";
    }
  }

  /** Synchronous context for previews (uses generic links, no DB writes). */
  private buildContext(lead: LeadDetail): TemplateRenderContext {
    return buildTemplateContext(lead, this.sourceDomain(), {
      supportEmail: serverEnv.EMAIL_REPLY_TO || null,
    });
  }

  /**
   * Context for a real send. Mints a lead-specific, token-secured portal upload
   * link (reusing PortalService) only when the template actually references it.
   */
  private async buildSendContext(
    lead: LeadDetail,
    isTest: boolean,
    needsUploadLink: boolean,
  ): Promise<TemplateRenderContext> {
    const sourceDomain = this.sourceDomain();
    const supportEmail = serverEnv.EMAIL_REPLY_TO || null;

    let uploadLink: string | null = null;
    const isRealLead =
      !isTest && Boolean(lead.id) && lead.id !== "sample-preview";
    if (needsUploadLink && isRealLead) {
      try {
        const { url } = await portalService.createLink(lead.id, "system", 30);
        uploadLink = url;
      } catch (err) {
        // Never let link creation break the send — fall back to a generic link.
        // eslint-disable-next-line no-console
        console.error("[automation] upload link creation failed", {
          leadId: lead.id,
          err,
        });
      }
    }

    return buildTemplateContext(lead, sourceDomain, {
      uploadLink,
      magicLink: uploadLink,
      supportEmail,
    });
  }

  private transactionalTemplatesPromise: Promise<void> | null = null;

  /**
   * Idempotently ensure the two standard transactional templates exist.
   * Cached per process; only creates when missing (never overwrites admin
   * edits). Safe to call on every lead.created / manual send.
   */
  async ensureTransactionalTemplates(): Promise<void> {
    if (!this.transactionalTemplatesPromise) {
      this.transactionalTemplatesPromise = this.seedTransactionalTemplates().catch(
        (err) => {
          // Reset so a later call can retry after a transient DB error.
          this.transactionalTemplatesPromise = null;
          throw err;
        },
      );
    }
    return this.transactionalTemplatesPromise;
  }

  private async seedTransactionalTemplates(): Promise<void> {
    const welcomeCreated = await this.ensureTemplateBySlug({
      slug: WELCOME_EMAIL_SLUG,
      trigger: AutomationTrigger.LEAD_CREATED,
      channel: CommunicationChannel.EMAIL,
      category: "welcome",
      status: "active",
      language: "de",
      name: "Neues Lead: Willkommensmail",
      subject: "Ihre Anfrage beim Lokführerzentrum ist eingegangen",
      body: WELCOME_EMAIL_BODY,
      // Transactional confirmation of the lead's own request — no consent gate.
      requiresConsent: null,
      metaTemplateName: null,
      metaApprovalStatus: null,
    });

    // One-time migration: on first creation of the canonical welcome email,
    // deactivate any legacy/demo LEAD_CREATED email templates so exactly one
    // welcome email fires per new lead (never a double-send).
    if (welcomeCreated) {
      await this.deactivateLegacyWelcomeEmails();
    }

    await this.ensureTemplateBySlug({
      slug: UPLOAD_REQUEST_EMAIL_SLUG,
      trigger: AutomationTrigger.MANUAL,
      channel: CommunicationChannel.EMAIL,
      category: "documents",
      status: "active",
      language: "de",
      name: "Bestandslead: Unterlagen anfordern",
      subject: "Ihre Unterlagen für die Lokführer-Weiterbildung",
      body: UPLOAD_REQUEST_EMAIL_BODY,
      requiresConsent: null,
      metaTemplateName: null,
      metaApprovalStatus: null,
    });
  }

  /** Returns true when the template was newly created (false if it existed). */
  private async ensureTemplateBySlug(input: {
    slug: string;
    trigger: AutomationTrigger;
    channel: TemplateChannelType;
    category: import("@/features/fairtrain-funnel/types").TemplateCategoryType;
    status: import("@/features/fairtrain-funnel/types").TemplateStatusType;
    language: string;
    name: string;
    subject: string | null;
    body: string;
    requiresConsent: ConsentType | null;
    metaTemplateName: string | null;
    metaApprovalStatus:
      | import("@/features/fairtrain-funnel/types").MetaApprovalStatusType
      | null;
  }): Promise<boolean> {
    const existing = await automationTemplateRepository.findBySlug(input.slug);
    if (existing) return false;
    await automationTemplateRepository.upsert(input);
    return true;
  }

  /** Deactivate other active LEAD_CREATED email templates (legacy/demo). */
  private async deactivateLegacyWelcomeEmails(): Promise<void> {
    const all = await automationTemplateRepository.list();
    const conflicting = all.filter(
      (t) =>
        t.slug !== WELCOME_EMAIL_SLUG &&
        t.trigger === AutomationTrigger.LEAD_CREATED &&
        t.channel === CommunicationChannel.EMAIL &&
        (t.enabled || t.status === "active"),
    );
    for (const t of conflicting) {
      await automationTemplateRepository.update(t.id, { status: "inactive" });
    }
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
      whatsappStatus: "offen",
      whatsappReachability: "unbekannt",
      leadQualityStatus: "unbewertet",
      leadScore: 0,
      lastWhatsappMessageAt: null,
      lastWhatsappDeliveredAt: null,
      lastWhatsappReadAt: null,
      lastWhatsappReplyAt: null,
      lastWhatsappErrorAt: null,
      lastWhatsappErrorReason: null,
      lastInboundMessage: null,
      lastInboundMessageAt: null,
      leadType: "neu",
      campaign: null,
      campaignStatus: null,
      campaignStep: 0,
      communicationStarted: false,
      firstContactSentAt: null,
      automationPaused: false,
      campaignCompleted: false,
      employmentSnapshot: null,
      nextCampaignActionAt: null,
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
