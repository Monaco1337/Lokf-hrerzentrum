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
import { auditLogService } from "./AuditLogService";
import { consentService } from "./ConsentService";
import { automationTemplateRepository } from "../repositories/AutomationTemplateRepository";
import { communicationRepository } from "../repositories/CommunicationRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { taskRepository } from "../repositories/TaskRepository";
import { whatsappService } from "./messaging/whatsappService";

const SOURCE_DOMAIN = "lokfuehrerzentrum.de";

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

    if (live) {
      // Real WhatsApp: only approved Meta templates, only with consent.
      if (template.metaApprovalStatus !== "approved") {
        throw new ValidationError(
          "Echter WhatsApp-Versand erfordert eine von Meta freigegebene Vorlage (Status: approved).",
        );
      }
      await this.assertWhatsappConsent(lead.id, args.actorId);
    }

    const now = new Date();
    const delivery = await this.dispatchWhatsapp({
      isWhatsapp,
      live,
      to: lead.phone,
      templateName: template.metaTemplateName ?? template.name,
      body,
      variables,
      isInternal: channel === CommunicationChannel.INTERNAL,
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

    if (delivery.status !== MessageStatus.FAILED) {
      await this.applyTemplateSideEffect(template.category, lead.id, args.actorId);
    }
    return entry;
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
    if (isWhatsapp) {
      const result = await whatsappService.sendText({
        to: lead.phone,
        body: args.body,
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
    return entry;
  }

  private async dispatchWhatsapp(args: {
    isWhatsapp: boolean;
    live: boolean;
    to: string;
    templateName: string;
    body: string;
    variables: Record<string, string>;
    isInternal: boolean;
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
