/**
 * WhatsAppWebhookService — turns provider webhook events into ledger writes.
 *
 * Parsing is delegated to the active adapter (`whatsappService.handleWebhook`)
 * so the demo and real adapters share one contract. This service then:
 *  - status events  → correlate by providerMessageId, persist status + history
 *  - inbound events → map sender phone → lead, append an inbound message
 *  - failed events  → MESSAGE_FAILED audit
 *  - inbound        → MESSAGE_RECEIVED audit + refresh next action
 *
 * Everything written here is real (isDemo: false). Unknown messages/leads are
 * skipped (returned in `skipped`) so a webhook never 500s on unrelated traffic.
 */
import {
  AuditAction,
  CommunicationChannel,
  CommunicationDirection,
  MessageStatus,
} from "@/features/fairtrain-funnel/types";
import { isWorkflowEngineEnabled } from "@/server/env";

import { auditLogService } from "./AuditLogService";
import { employmentSituationService } from "./EmploymentSituationService";
import { leadLifecycleService } from "./LeadLifecycleService";
import { whatsAppReplyClassificationService } from "./WhatsAppReplyClassificationService";
import { campaignInboundService } from "./CampaignInboundService";
import {
  isOptOutMessage,
  whatsAppOptOutService,
} from "./WhatsAppOptOutService";
import {
  classifyWhatsAppEvent,
  type WhatsAppClassifierEvent,
} from "./LeadWhatsAppClassifier";
import { communicationRepository } from "../repositories/CommunicationRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { whatsappEventRepository } from "../repositories/WhatsappEventRepository";
import { whatsAppNumberRepository } from "../repositories/WhatsAppNumberRepository";
import type {
  WebhookInboundEvent,
  WebhookStatusEvent,
} from "./messaging/whatsappPort";
import { whatsappService } from "./messaging/whatsappService";

export interface WebhookProcessResult {
  statusUpdates: number;
  inboundStored: number;
  skipped: number;
  /** Events that were re-deliveries of an already-processed event. */
  duplicates: number;
}

/** Compact, size-bounded raw payload for debugging (never the full body). */
function rawJson(event: unknown): string {
  try {
    return JSON.stringify(event).slice(0, 4000);
  } catch {
    return "";
  }
}

/** Map an outbound lifecycle status to the classifier event + idempotency key. */
function statusEventType(status: string): string {
  return status.toLowerCase();
}

export class WhatsAppWebhookService {
  async processWebhook(payload: unknown): Promise<WebhookProcessResult> {
    const events = await whatsappService.handleWebhook(payload);
    const result: WebhookProcessResult = {
      statusUpdates: 0,
      inboundStored: 0,
      skipped: 0,
      duplicates: 0,
    };

    for (const event of events) {
      try {
        if (event.kind === "status") {
          await this.processStatus(event, result);
        } else {
          await this.processInbound(event, result);
        }
      } catch (err) {
        // One malformed/unexpected event must never fail the whole batch, or
        // the provider will retry the entire payload forever.
        result.skipped += 1;
        console.error("[whatsapp-webhook] event processing failed", {
          kind: event.kind,
          providerMessageId: event.providerMessageId,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }

    return result;
  }

  private async processStatus(
    event: WebhookStatusEvent,
    result: WebhookProcessResult,
  ): Promise<void> {
    const provider = whatsappService.name;
    const eventType = statusEventType(event.status);

    // Idempotency gate: skip re-delivered events before any scoring/history.
    const fresh = await whatsappEventRepository.recordOnce({
      provider,
      eventType,
      providerMessageId: event.providerMessageId,
      payload: rawJson(event),
    });
    if (!fresh) {
      result.duplicates += 1;
      return;
    }

    const opts: {
      at: Date;
      failedReason?: string;
      errorCode?: string;
      rawWebhookPayload?: string;
    } = { at: event.at, rawWebhookPayload: rawJson(event) };
    if (event.reason) opts.failedReason = event.reason;
    if (event.errorCode) opts.errorCode = event.errorCode;

    const updated = await communicationRepository.setStatusByProviderId(
      event.providerMessageId,
      event.status,
      opts,
    );
    if (!updated) {
      // No matching outbound message (e.g. status for a message we didn't send).
      result.skipped += 1;
      return;
    }
    result.statusUpdates += 1;

    await this.reclassifyFromStatus(updated.leadId, event);

    if (event.status === MessageStatus.FAILED) {
      await auditLogService.append({
        actor: "whatsapp-webhook",
        action: AuditAction.MESSAGE_FAILED,
        entityType: "Lead",
        entityId: updated.leadId,
        details: {
          channel: "WHATSAPP",
          providerMessageId: event.providerMessageId,
          reason: event.reason ?? null,
          errorCode: event.errorCode ?? null,
          failure: event.failure ?? null,
        },
      });
    }
  }

  /** Re-score/re-classify a lead from a delivery-lifecycle status event. */
  private async reclassifyFromStatus(
    leadId: string,
    event: WebhookStatusEvent,
  ): Promise<void> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) return;

    let classifierEvent: WhatsAppClassifierEvent | null = null;
    switch (event.status) {
      case MessageStatus.SENT:
        classifierEvent = { kind: "sent", at: event.at };
        break;
      case MessageStatus.DELIVERED:
        classifierEvent = { kind: "delivered", at: event.at };
        break;
      case MessageStatus.READ:
        classifierEvent = { kind: "read", at: event.at };
        break;
      case MessageStatus.FAILED:
        classifierEvent = {
          kind: "failed",
          at: event.at,
          failure: event.failure ?? "generic",
          reason: event.reason ?? null,
        };
        break;
      default:
        classifierEvent = null;
    }
    if (!classifierEvent) return;

    const { fields, note } = classifyWhatsAppEvent(lead, classifierEvent);
    if (Object.keys(fields).length === 0) return;
    await leadRepository.update(leadId, fields);
    await auditLogService.append({
      actor: "whatsapp-webhook",
      action: AuditAction.LEAD_UPDATED,
      entityType: "Lead",
      entityId: leadId,
      details: { via: "whatsapp-status", note },
    });
  }

  private async processInbound(
    event: WebhookInboundEvent,
    result: WebhookProcessResult,
  ): Promise<void> {
    const provider = whatsappService.name;

    const fresh = await whatsappEventRepository.recordOnce({
      provider,
      eventType: "inbound",
      providerMessageId: event.providerMessageId,
      payload: rawJson(event),
    });
    if (!fresh) {
      result.duplicates += 1;
      return;
    }

    const lead = await leadRepository.findByPhone(event.from);
    if (!lead) {
      // Unknown sender — do not auto-create (a Lead needs funnel data). Counted
      // so the webhook result stays observable.
      result.skipped += 1;
      return;
    }

    const businessNumber = event.businessPhoneNumberId
      ? await whatsAppNumberRepository.findByPhoneNumberId(
          event.businessPhoneNumberId,
        )
      : null;

    await communicationRepository.appendEntry({
      leadId: lead.id,
      channel: CommunicationChannel.WHATSAPP,
      direction: CommunicationDirection.IN,
      payload: event.body,
      providerMessageId: event.providerMessageId,
      errorCode: null,
      type: "TEXT",
      status: MessageStatus.DELIVERED,
      sentBy: "SYSTEM",
      actorId: null,
      isDemo: false,
      deliveredAt: event.at,
      businessPhoneNumberId: event.businessPhoneNumberId ?? null,
      rawWebhookPayload: rawJson(event),
    });
    result.inboundStored += 1;
    await communicationRepository.markLatestOutboundReplied(lead.id, event.at);

    await auditLogService.append({
      actor: "whatsapp-webhook",
      action: AuditAction.MESSAGE_RECEIVED,
      entityType: "Lead",
      entityId: lead.id,
      details: {
        channel: "WHATSAPP",
        providerMessageId: event.providerMessageId,
        businessPhoneNumberId: event.businessPhoneNumberId ?? null,
      },
    });

    // Opt-out ("Abmelden"): a stop keyword blocks ALL future WhatsApp contact
    // and stops every automation/campaign. Handled before any lead-warming
    // classification so an opt-out never marks the lead HOT or re-engages it.
    if (
      isOptOutMessage({ body: event.body, buttonTitle: event.buttonTitle })
    ) {
      await whatsAppOptOutService.applyOptOut(lead.id, {
        originalMessage: event.body,
        at: event.at,
        actor: "whatsapp-webhook",
      });
      return;
    }

    // Classify: reply received → beantwortet, quality reagiert, +25, priority HOT.
    const { fields, priorityHigh } = classifyWhatsAppEvent(lead, {
      kind: "replied",
      at: event.at,
      body: event.body,
    });
    if (priorityHigh) fields.priority = "HOT";
    await leadRepository.update(lead.id, fields);

    // Single source of truth: a reply is the "Antwort erhalten" event. Advances
    // the pipeline forward-only (no-op if already further along; never touches
    // terminal/closed leads) and writes the timeline + audit entry.
    await leadLifecycleService.record(lead.id, "REPLY_RECEIVED", {
      actor: "whatsapp-webhook",
    });

    // Reactivation campaign: an inbound reply / quick-reply button stops the
    // sequence (cancel follow-ups) and, for buttons, classifies the lead.
    // When the unified engine is live it OWNS reactivation, so we skip the
    // legacy stop/classify here (the engine's router handles the reply and the
    // active run abandons its pending reminder automatically).
    if (!isWorkflowEngineEnabled()) {
      await campaignInboundService.handleInbound(lead.id, {
        buttonId: event.buttonId,
        buttonTitle: event.buttonTitle,
        body: event.body,
        at: event.at,
      });
    }

    // Auto-assign: a message on a rep's number belongs to that rep. We only
    // claim UNASSIGNED leads, so we never steal an active handover.
    if (
      businessNumber?.assignedUserId &&
      !lead.assignedToId &&
      businessNumber.active
    ) {
      await leadRepository.update(lead.id, {
        assignedToId: businessNumber.assignedUserId,
        assignedTo: businessNumber.assignedUserName,
        assignedById: businessNumber.assignedUserId,
        assignedAt: event.at,
      });
      await auditLogService.append({
        actor: "whatsapp-webhook",
        action: AuditAction.LEAD_ASSIGNED,
        entityType: "Lead",
        entityId: lead.id,
        details: {
          assignedToId: businessNumber.assignedUserId,
          via: "whatsapp-number",
          numberLabel: businessNumber.label,
        },
      });
    }

    // A fresh inbound reply means a fresh action is due soon.
    const soon = new Date(event.at.getTime() + 2 * 3_600_000);
    const current = lead.nextFollowUpAt ?? null;
    if (!current || current.getTime() > soon.getTime()) {
      await leadRepository.update(lead.id, { nextFollowUpAt: soon });
    }

    // Classify the reply (Quick-Reply / free text → beschäftigt / arbeitssuchend
    // / sonstige) and run the "Antwort erhalten" (MESSAGE_INBOUND) workflow rules
    // WITH the reply context so they can branch on the concrete answer. Both are
    // idempotent per lead (a situation tag gates re-processing), so a repeated
    // webhook — or the retro/backfill run — never sends a duplicate message.
    // Best-effort so a failing rule never breaks webhook ingestion.
    try {
      const replyInput = {
        body: event.body,
        buttonId: event.buttonId,
        buttonTitle: event.buttonTitle,
      };

      // Unified engine ON: ONE entry point. The engine classifies the reply
      // (LLM + deterministic fallback), routes into exactly one path of the
      // lead's active run (or the standalone router) and sends the single
      // fitting follow-up — idempotent, never a duplicate.
      if (isWorkflowEngineEnabled()) {
        const { workflowEngine } = await import("./workflow/WorkflowEngine");
        await workflowEngine.onInbound(lead.id, replyInput, {
          at: event.at,
          inboundKey: event.providerMessageId,
        });
        return;
      }

      // First: the "Beschäftigten-Statusabfrage" router. It intercepts replies
      // that carry a concrete employment-situation signal (colour emoji, colour
      // word or matching free text) and routes them into the correct follow-up
      // (Vorab-Check / Rückruf / Beratung / Manuelle Klärung). Only when NO such
      // signal is present does it hand back control to the generic reply
      // classifier below — keeping every existing automation backward-compatible.
      const routed = await employmentSituationService.classifyAndRoute(
        lead.id,
        replyInput,
        { actor: "whatsapp-webhook", at: event.at },
      );

      if (!routed.handled) {
        await whatsAppReplyClassificationService.classifyAndApply(
          lead.id,
          replyInput,
          { actor: "whatsapp-webhook", at: event.at, runAutomation: true },
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[automation] reply classification / MESSAGE_INBOUND failed", {
        leadId: lead.id,
        err,
      });
    }
  }
}

export const whatsAppWebhookService = new WhatsAppWebhookService();
