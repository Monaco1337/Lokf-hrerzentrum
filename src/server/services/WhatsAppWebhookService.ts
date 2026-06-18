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

import { auditLogService } from "./AuditLogService";
import { communicationRepository } from "../repositories/CommunicationRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { whatsappService } from "./messaging/whatsappService";

export interface WebhookProcessResult {
  statusUpdates: number;
  inboundStored: number;
  skipped: number;
}

export class WhatsAppWebhookService {
  async processWebhook(payload: unknown): Promise<WebhookProcessResult> {
    const events = await whatsappService.handleWebhook(payload);
    let statusUpdates = 0;
    let inboundStored = 0;
    let skipped = 0;

    for (const event of events) {
      if (event.kind === "status") {
        const opts: { at: Date; failedReason?: string; errorCode?: string } = {
          at: event.at,
        };
        if (event.reason) opts.failedReason = event.reason;
        if (event.errorCode) opts.errorCode = event.errorCode;
        const updated = await communicationRepository.setStatusByProviderId(
          event.providerMessageId,
          event.status,
          opts,
        );
        if (!updated) {
          skipped += 1;
          continue;
        }
        statusUpdates += 1;
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
            },
          });
        }
        continue;
      }

      // inbound
      const lead = await leadRepository.findByPhone(event.from);
      if (!lead) {
        skipped += 1;
        continue;
      }
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
      });
      inboundStored += 1;

      await auditLogService.append({
        actor: "whatsapp-webhook",
        action: AuditAction.MESSAGE_RECEIVED,
        entityType: "Lead",
        entityId: lead.id,
        details: {
          channel: "WHATSAPP",
          providerMessageId: event.providerMessageId,
        },
      });

      // A fresh inbound reply means a fresh action is due soon.
      const soon = new Date(event.at.getTime() + 2 * 3_600_000);
      const current = lead.nextFollowUpAt ?? null;
      if (!current || current.getTime() > soon.getTime()) {
        await leadRepository.update(lead.id, { nextFollowUpAt: soon });
      }
    }

    return { statusUpdates, inboundStored, skipped };
  }
}

export const whatsAppWebhookService = new WhatsAppWebhookService();
