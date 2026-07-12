/**
 * MessageLedgerService — orchestrates the communication ledger.
 *
 * Responsibilities:
 *  - Send a template (real via the active adapter, or simulated in demo) and
 *    record a ledger message + audit + optional follow-up/task by category.
 *  - Send free text (real/demo).
 *  - Log a manual message.
 *  - Simulate an inbound reply (demo) and refresh the lead's next action.
 *  - Advance the delivery lifecycle (queued → sent → delivered → read).
 *  - Simulate a failed delivery (with reason + follow-up task).
 *
 * Live WhatsApp sends require BOTH an approved Meta template (for templates)
 * AND a granted WhatsApp consent; otherwise a fallback task is created and the
 * send is refused. The demo adapter simulates everything and is never gated, so
 * the simulation flow stays fully intact.
 */
import {
  AuditAction,
  CommunicationChannel,
  CommunicationDirection,
  ConsentType,
  type CommunicationEntry,
  MESSAGE_STATUS_FLOW,
  type MessageSentByT,
  MessageStatus,
  TemplateChannel,
} from "@/features/fairtrain-funnel/types";
import {
  buildTemplateContext,
  extractVariables,
  renderTemplate,
} from "@/features/fairtrain-funnel/automation/TemplateRenderer";

type TemplateRenderContext = ReturnType<typeof buildTemplateContext>;

import {
  ConsentMissingError,
  NotFoundError,
  ValidationError,
} from "../errors";
import type { LeadSummary } from "@/features/fairtrain-funnel/types";

import { auditLogService } from "./AuditLogService";
import { classifyOutboundSend } from "./LeadWhatsAppClassifier";
import { consentService } from "./ConsentService";
import { automationTemplateRepository } from "../repositories/AutomationTemplateRepository";
import { communicationRepository } from "../repositories/CommunicationRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { taskRepository } from "../repositories/TaskRepository";
import { whatsAppNumberRepository } from "../repositories/WhatsAppNumberRepository";
import { whatsappService } from "./messaging/whatsappService";

// Punycode form of the IDN production domain `lokführerzentrum.de` so any link
// this builds resolves in every email client.
const SOURCE_DOMAIN = "xn--lokfhrerzentrum-2vb.de";

/** Map a template channel onto a ledger communication channel. */
function templateChannelToComm(channel: string): CommunicationChannel {
  if (channel === TemplateChannel.EMAIL) return CommunicationChannel.EMAIL;
  if (channel === TemplateChannel.INTERNAL) return CommunicationChannel.INTERNAL;
  return CommunicationChannel.WHATSAPP;
}

/** Pull the resolved values for variables that the template actually uses. */
function resolveUsedVariables(
  body: string,
  subject: string | null,
  ctx: TemplateRenderContext,
): Record<string, string> {
  const keys = new Set([
    ...extractVariables(body),
    ...(subject ? extractVariables(subject) : []),
  ]);
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = ctx[key as keyof TemplateRenderContext];
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export interface SendTemplateArgs {
  leadId: string;
  templateId: string;
  actorId: string;
  sentBy?: MessageSentByT;
}

export interface LogManualArgs {
  leadId: string;
  channel: CommunicationChannel;
  body: string;
  actorId: string;
  direction?: "OUT" | "IN" | undefined;
}

export interface SimulateInboundArgs {
  leadId: string;
  channel: CommunicationChannel;
  body: string;
  actorId: string;
}

export interface SendTextArgs {
  leadId: string;
  body: string;
  actorId: string;
  channel?: CommunicationChannel;
}

interface DeliveryOutcome {
  providerMessageId: string | null;
  status: typeof MessageStatus[keyof typeof MessageStatus];
  failedReason: string | null;
  isDemo: boolean;
}

export class MessageLedgerService {
  /** Is the active WhatsApp adapter a real (non-simulated) provider? */
  get whatsappLive(): boolean {
    return !whatsappService.isSimulated;
  }

  /**
   * Which business number should an outbound message to this lead go out from?
   * Priority: (1) the number the thread already uses, (2) the assigned rep's
   * own number, (3) the first active number. Null = no number configured (the
   * adapter then surfaces a controlled failure).
   */
  private async resolveOutboundNumber(
    lead: LeadSummary,
  ): Promise<string | null> {
    const threadNumber = await communicationRepository.latestBusinessNumberForLead(
      lead.id,
    );
    if (threadNumber) return threadNumber;

    const active = await whatsAppNumberRepository.listActive();
    if (active.length === 0) return null;
    if (lead.assignedToId) {
      const owned = active.find((n) => n.assignedUserId === lead.assignedToId);
      if (owned) return owned.phoneNumberId;
    }
    return active[0]?.phoneNumberId ?? null;
  }

  /**
   * WhatsApp templates are sent FROM the number explicitly chosen on the
   * template ("Senden über"). That number is honoured EXACTLY — never
   * auto-picked. A missing or deactivated sender blocks the send with a clear,
   * user-facing error instead of silently falling back to another number.
   */
  private async resolveTemplateSender(
    senderPhoneNumberId: string | null,
  ): Promise<string> {
    const sender = senderPhoneNumberId?.trim();
    if (!sender) {
      throw new ValidationError(
        'Kein Absender ausgewählt. Bitte in der WhatsApp-Vorlage unter „Senden über" eine Nummer wählen.',
      );
    }
    const number = await whatsAppNumberRepository.findByPhoneNumberId(sender);
    if (!number || !number.active) {
      throw new ValidationError(
        "Die in der Vorlage gewählte Absender-Nummer ist nicht (mehr) aktiv. Bitte eine aktive WhatsApp-Nummer auswählen.",
      );
    }
    return sender;
  }

  private async assertWhatsappConsent(
    leadId: string,
    actorId: string,
  ): Promise<void> {
    const consents = await consentService.currentStates(leadId);
    const granted = consents.find((c) => c.type === ConsentType.WHATSAPP)?.granted;
    if (!granted) {
      await taskRepository.create({
        title: "WhatsApp-Einwilligung einholen (Versand blockiert)",
        leadId,
        createdById: actorId,
        dueAt: new Date(Date.now() + 24 * 3_600_000),
      });
      throw new ConsentMissingError(
        "WhatsApp-Einwilligung fehlt – es wurde keine echte Nachricht gesendet. Fallback-Aufgabe erstellt.",
      );
    }
  }

  async sendTemplate(args: SendTemplateArgs): Promise<CommunicationEntry> {
    const lead = await leadRepository.findById(args.leadId);
    if (!lead) throw new NotFoundError("Lead", args.leadId);
    const template = await automationTemplateRepository.findById(args.templateId);
    if (!template) throw new NotFoundError("Template", args.templateId);

    const ctx = buildTemplateContext(lead, SOURCE_DOMAIN, {
      ownerName: lead.assignedTo,
    });
    const body = renderTemplate(template.body, ctx);
    const subject = template.subject ? renderTemplate(template.subject, ctx) : null;
    const variables = resolveUsedVariables(template.body, template.subject, ctx);
    const channel = templateChannelToComm(template.channel);

    const validation = whatsappService.validateTemplate({ body, variables });
    if (!validation.ok) {
      throw new ValidationError(
        `Nicht aufgelöste Variablen: ${validation.unresolvedVariables.join(", ")}`,
      );
    }

    const isWhatsapp = channel === CommunicationChannel.WHATSAPP;
    const live = isWhatsapp && this.whatsappLive;

    // The sender is dictated by the template's "Senden über" selection and is
    // resolved (and validated) BEFORE any dispatch — missing/inactive blocks.
    const fromPhoneNumberId = isWhatsapp
      ? await this.resolveTemplateSender(template.senderPhoneNumberId)
      : null;

    if (live) {
      // Real WhatsApp: only approved Meta templates, only with consent.
      if (template.metaApprovalStatus !== "approved") {
        throw new ValidationError(
          "Echter WhatsApp-Versand erfordert eine von Meta freigegebene Vorlage (Status: approved).",
        );
      }
      // Business-initiated messages MUST reference a template that exists in
      // Meta by its exact name. Sending our internal display name almost always
      // fails ("template name does not exist"), so require an explicit
      // Meta-Template-Name for live sends.
      if (!template.metaTemplateName?.trim()) {
        throw new ValidationError(
          "Für den echten WhatsApp-Versand fehlt der Meta-Template-Name. Trage in der Vorlage den exakt in Meta freigegebenen Template-Namen ein (Feld Meta-Template-Name, z. B. willkommen_lead).",
        );
      }
      await this.assertWhatsappConsent(lead.id, args.actorId);
    }

    // Map our named variables onto Meta's numbered placeholders ({{1}}, {{2}},
    // …) exactly as configured on the template. Rendered in order; an empty
    // mapping means a static Meta template (no body parameters).
    const metaBodyParams = template.metaBodyParams.map((token) =>
      renderTemplate(token, ctx),
    );

    const now = new Date();
    const delivery = await this.dispatchWhatsapp({
      isWhatsapp,
      live,
      to: lead.phone,
      // Meta template names are ALWAYS lowercase [a-z0-9_]; a stray capital letter
      // makes Meta reject the send with (#132001) "template name does not exist in
      // the translation". Normalise defensively for any legacy data.
      templateName: template.metaTemplateName?.trim().toLowerCase() || template.name,
      body,
      variables,
      bodyParams: metaBodyParams,
      languageCode: template.language,
      isInternal: channel === CommunicationChannel.INTERNAL,
      fromPhoneNumberId,
    });

    const entry = await communicationRepository.appendEntry({
      leadId: lead.id,
      channel,
      direction: CommunicationDirection.OUT,
      payload: subject ? `${subject}\n\n${body}` : body,
      providerMessageId: delivery.providerMessageId,
      errorCode: delivery.failedReason ? "PROVIDER_SEND_FAILED" : null,
      type: "TEMPLATE",
      templateId: template.id,
      templateName: template.name,
      variablesResolved: variables,
      status: delivery.status,
      statusHistory: this.buildHistory(delivery.status, now),
      sentBy: args.sentBy ?? "ADMIN",
      actorId: args.actorId,
      isDemo: delivery.isDemo,
      sentAt: delivery.status === MessageStatus.FAILED ? null : now,
      failedAt: delivery.status === MessageStatus.FAILED ? now : null,
      failedReason: delivery.failedReason,
      businessPhoneNumberId: fromPhoneNumberId,
    });

    await automationTemplateRepository.recordUsage(template.id);
    await auditLogService.append({
      actor: args.actorId,
      action:
        delivery.status === MessageStatus.FAILED
          ? AuditAction.MESSAGE_FAILED
          : AuditAction.MESSAGE_SENT,
      entityType: "Lead",
      entityId: lead.id,
      details: {
        channel,
        templateId: template.id,
        templateName: template.name,
        simulated: delivery.isDemo,
      },
    });

    if (isWhatsapp) {
      await this.trackOutboundWhatsapp(lead, delivery, now);
    }
    if (delivery.status !== MessageStatus.FAILED) {
      await this.applyTemplateSideEffect(template.category, lead.id, args.actorId);
    }
    return entry;
  }

  /**
   * Reflect a WhatsApp send on the lead's tracking fields immediately, so a lead
   * never stays "offen" after we actually dispatched a message. Real delivery
   * signals (delivered/read/replied) still arrive via webhooks and advance it.
   */
  private async trackOutboundWhatsapp(
    lead: LeadSummary,
    delivery: DeliveryOutcome,
    at: Date,
  ): Promise<void> {
    const ack =
      delivery.status === MessageStatus.FAILED
        ? "FAILED"
        : delivery.status === MessageStatus.QUEUED
          ? "QUEUED"
          : "SENT";
    const fields = classifyOutboundSend(lead, ack, at, delivery.failedReason);
    await leadRepository.update(lead.id, fields);
  }

  async sendText(args: SendTextArgs): Promise<CommunicationEntry> {
    const lead = await leadRepository.findById(args.leadId);
    if (!lead) throw new NotFoundError("Lead", args.leadId);
    const channel = args.channel ?? CommunicationChannel.WHATSAPP;
    const isWhatsapp = channel === CommunicationChannel.WHATSAPP;
    const live = isWhatsapp && this.whatsappLive;

    if (live) await this.assertWhatsappConsent(lead.id, args.actorId);

    const now = new Date();
    let delivery: DeliveryOutcome;
    let fromPhoneNumberId: string | null = null;
    if (isWhatsapp) {
      fromPhoneNumberId = await this.resolveOutboundNumber(lead);
      const result = await whatsappService.sendText({
        to: lead.phone,
        body: args.body,
        ...(fromPhoneNumberId ? { fromPhoneNumberId } : {}),
      });
      delivery = {
        providerMessageId: result.providerMessageId || null,
        status: result.status === MessageStatus.FAILED ? MessageStatus.FAILED : MessageStatus.SENT,
        failedReason: result.failedReason ?? null,
        isDemo: !live,
      };
    } else {
      delivery = {
        providerMessageId: null,
        status: MessageStatus.SENT,
        failedReason: null,
        isDemo: true,
      };
    }

    const entry = await communicationRepository.appendEntry({
      leadId: lead.id,
      channel,
      direction: CommunicationDirection.OUT,
      payload: args.body,
      providerMessageId: delivery.providerMessageId,
      errorCode: delivery.failedReason ? "PROVIDER_SEND_FAILED" : null,
      type: "TEXT",
      status: delivery.status,
      statusHistory: this.buildHistory(delivery.status, now),
      sentBy: "ADMIN",
      actorId: args.actorId,
      isDemo: delivery.isDemo,
      sentAt: delivery.status === MessageStatus.FAILED ? null : now,
      failedAt: delivery.status === MessageStatus.FAILED ? now : null,
      failedReason: delivery.failedReason,
      businessPhoneNumberId: fromPhoneNumberId,
    });

    await auditLogService.append({
      actor: args.actorId,
      action:
        delivery.status === MessageStatus.FAILED
          ? AuditAction.MESSAGE_FAILED
          : AuditAction.MESSAGE_SENT,
      entityType: "Lead",
      entityId: lead.id,
      details: { channel, manual: false, simulated: delivery.isDemo },
    });
    if (isWhatsapp) {
      await this.trackOutboundWhatsapp(lead, delivery, now);
    }
    return entry;
  }

  private async dispatchWhatsapp(args: {
    isWhatsapp: boolean;
    live: boolean;
    to: string;
    templateName: string;
    body: string;
    variables: Record<string, string>;
    bodyParams?: string[];
    languageCode?: string;
    isInternal: boolean;
    fromPhoneNumberId?: string | null;
  }): Promise<DeliveryOutcome> {
    if (!args.isWhatsapp) {
      // Email/internal are recorded here, not sent through the WA provider.
      return {
        providerMessageId: null,
        status: MessageStatus.SENT,
        failedReason: null,
        isDemo: true,
      };
    }
    const result = await whatsappService.sendTemplate({
      to: args.to,
      templateName: args.templateName,
      body: args.body,
      variables: args.variables,
      ...(args.bodyParams !== undefined ? { bodyParams: args.bodyParams } : {}),
      ...(args.languageCode ? { languageCode: args.languageCode } : {}),
      ...(args.fromPhoneNumberId ? { fromPhoneNumberId: args.fromPhoneNumberId } : {}),
    });
    return {
      providerMessageId: result.providerMessageId || null,
      status:
        result.status === MessageStatus.FAILED
          ? MessageStatus.FAILED
          : MessageStatus.SENT,
      failedReason: result.failedReason ?? null,
      isDemo: !args.live,
    };
  }

  private buildHistory(
    status: typeof MessageStatus[keyof typeof MessageStatus],
    at: Date,
  ): Array<{ status: typeof MessageStatus[keyof typeof MessageStatus]; at: string }> {
    const iso = at.toISOString();
    if (status === MessageStatus.FAILED) {
      return [
        { status: MessageStatus.QUEUED, at: iso },
        { status: MessageStatus.FAILED, at: iso },
      ];
    }
    return [
      { status: MessageStatus.QUEUED, at: iso },
      { status: MessageStatus.SENT, at: iso },
    ];
  }

  async logManual(args: LogManualArgs): Promise<CommunicationEntry> {
    const lead = await leadRepository.findById(args.leadId);
    if (!lead) throw new NotFoundError("Lead", args.leadId);
    const direction =
      args.direction === "IN"
        ? CommunicationDirection.IN
        : CommunicationDirection.OUT;
    const now = new Date();

    const entry = await communicationRepository.appendEntry({
      leadId: lead.id,
      channel: args.channel,
      direction,
      payload: args.body,
      providerMessageId: null,
      errorCode: null,
      type: "TEXT",
      status: direction === "OUT" ? MessageStatus.SENT : MessageStatus.DELIVERED,
      sentBy: "ADMIN",
      actorId: args.actorId,
      isDemo: true,
      sentAt: direction === "OUT" ? now : null,
      deliveredAt: direction === "IN" ? now : null,
    });

    await auditLogService.append({
      actor: args.actorId,
      action:
        direction === "IN"
          ? AuditAction.MESSAGE_RECEIVED
          : AuditAction.MESSAGE_SENT,
      entityType: "Lead",
      entityId: lead.id,
      details: { channel: args.channel, manual: true },
    });
    return entry;
  }

  async simulateInbound(args: SimulateInboundArgs): Promise<CommunicationEntry> {
    const lead = await leadRepository.findById(args.leadId);
    if (!lead) throw new NotFoundError("Lead", args.leadId);
    const now = new Date();

    const entry = await communicationRepository.appendEntry({
      leadId: lead.id,
      channel: args.channel,
      direction: CommunicationDirection.IN,
      payload: args.body,
      providerMessageId: null,
      errorCode: null,
      type: "TEXT",
      status: MessageStatus.DELIVERED,
      sentBy: "SYSTEM",
      actorId: null,
      isDemo: true,
      deliveredAt: now,
    });

    await auditLogService.append({
      actor: "applicant",
      action: AuditAction.MESSAGE_RECEIVED,
      entityType: "Lead",
      entityId: lead.id,
      details: { channel: args.channel, simulated: true },
    });

    // A fresh inbound reply means a fresh action is due soon — refresh the
    // lead's next-action timestamp if nothing sooner is scheduled.
    const soon = new Date(now.getTime() + 2 * 3_600_000);
    if (!lead.nextFollowUpAt || lead.nextFollowUpAt.getTime() > soon.getTime()) {
      await leadRepository.update(lead.id, { nextFollowUpAt: soon });
    }
    return entry;
  }

  async advanceStatus(messageId: string): Promise<CommunicationEntry> {
    const msg = await communicationRepository.findById(messageId);
    if (!msg) throw new NotFoundError("Message", messageId);
    if (msg.direction !== CommunicationDirection.OUT) {
      throw new ValidationError("Nur ausgehende Nachrichten haben einen Versandstatus");
    }
    const idx = MESSAGE_STATUS_FLOW.indexOf(msg.status);
    const next = idx >= 0 ? MESSAGE_STATUS_FLOW[idx + 1] : MessageStatus.SENT;
    if (!next) return msg; // already READ
    const updated = await communicationRepository.setStatus(messageId, next);
    return updated ?? msg;
  }

  async failMessage(
    messageId: string,
    reason: string,
    actorId: string,
  ): Promise<CommunicationEntry> {
    const msg = await communicationRepository.findById(messageId);
    if (!msg) throw new NotFoundError("Message", messageId);
    const updated = await communicationRepository.setStatus(
      messageId,
      MessageStatus.FAILED,
      { failedReason: reason },
    );

    await auditLogService.append({
      actor: actorId,
      action: AuditAction.MESSAGE_FAILED,
      entityType: "Lead",
      entityId: msg.leadId,
      details: { reason, simulated: true },
    });

    await taskRepository.create({
      title: "Alternativkontakt prüfen (Zustellung fehlgeschlagen)",
      leadId: msg.leadId,
      createdById: actorId,
      dueAt: new Date(Date.now() + 24 * 3_600_000),
    });
    return updated ?? msg;
  }

  private async applyTemplateSideEffect(
    category: string,
    leadId: string,
    actorId: string,
  ): Promise<void> {
    // Documents/reminder templates schedule a follow-up; appointment templates
    // create a confirmation task. Everything else has no side effect.
    if (category === "documents" || category === "reminder" || category === "followup") {
      const when = new Date(Date.now() + 2 * 24 * 3_600_000);
      await leadRepository.update(leadId, { nextFollowUpAt: when });
      await auditLogService.append({
        actor: actorId,
        action: AuditAction.FOLLOW_UP_SCHEDULED,
        entityType: "Lead",
        entityId: leadId,
        details: { when: when.toISOString(), viaTemplate: category },
      });
    } else if (category === "appointment") {
      await taskRepository.create({
        title: "Terminbestätigung nachfassen",
        leadId,
        createdById: actorId,
        dueAt: new Date(Date.now() + 24 * 3_600_000),
      });
    }
  }
}

export const messageLedgerService = new MessageLedgerService();
