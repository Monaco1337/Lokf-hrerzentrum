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
import { whatsAppNumberRepository } from "../repositories/WhatsAppNumberRepository";
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
        // Unknown sender (no matching lead). We deliberately skip rather than
        // auto-create a lead, since a valid Lead requires funnel data. Counted
        // so the webhook result stays observable.
        skipped += 1;
        continue;
      }

      // Which of our numbers received this? Drives auto-assignment + threading.
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
          businessPhoneNumberId: event.businessPhoneNumberId ?? null,
        },
      });

      // Auto-assign: a message arriving on a rep's number belongs to that rep.
      // We only claim UNASSIGNED leads, so we never steal an active handover.
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
    }

    return { statusUpdates, inboundStored, skipped };
  }
}

export const whatsAppWebhookService = new WhatsAppWebhookService();
