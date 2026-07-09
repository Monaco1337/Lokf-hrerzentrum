/**
 * CampaignInboundService — react to inbound WhatsApp on reactivation leads.
 *
 * Any inbound (text reply OR quick-reply button) stops the campaign: queued
 * follow-ups are canceled, the lead is completed + paused. Quick-reply buttons
 * are additionally classified into interessiert / informationswunsch /
 * kein_interesse with score + quality + (for "Ja, Interesse") a sales task.
 * Only real webhook signals drive this — never simulated.
 */
import {
  CAMPAIGN_QUICK_REPLY,
  type CampaignStatus,
} from "@/features/fairtrain-funnel/campaign/types";
import { AuditAction, type LeadQualityStatus } from "@/features/fairtrain-funnel/types";

import { auditLogService } from "./AuditLogService";
import { isActiveCampaignLead } from "./CampaignStopService";
import { campaignRepository } from "../repositories/CampaignRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { taskRepository } from "../repositories/TaskRepository";
import { userRepository } from "../repositories/UserRepository";

export interface InboundReplyInput {
  buttonId?: string | undefined;
  buttonTitle?: string | undefined;
  body: string;
  at: Date;
}

interface QuickReplyClass {
  key: "interesse" | "mehr_infos" | "kein_interesse";
  campaignStatus: CampaignStatus;
  quality: LeadQualityStatus;
  scoreDelta: number;
  createTask: boolean;
}

function normalize(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Classify a quick-reply. Matches the stable Meta payload ids first, then a
 * tolerant keyword fallback on the button title / message body. Returns null
 * for a plain text reply (still a stop trigger, just no classification).
 */
export function classifyCampaignReply(
  input: InboundReplyInput,
): QuickReplyClass | null {
  const id = normalize(input.buttonId);
  const text = `${normalize(input.buttonTitle)} ${normalize(input.body)}`;

  const isInteresse =
    id === CAMPAIGN_QUICK_REPLY.INTERESSE ||
    /\bja\b/.test(text) ||
    text.includes("interesse");
  const isKein =
    id === CAMPAIGN_QUICK_REPLY.KEIN_INTERESSE ||
    text.includes("kein interesse") ||
    text.includes("nicht mehr aktuell") ||
    text.includes("kein bedarf");
  const isMehr =
    id === CAMPAIGN_QUICK_REPLY.MEHR_INFOS ||
    text.includes("mehr info") ||
    text.includes("mehr infos") ||
    text.includes("infos");

  // "kein Interesse" wins over the generic "interesse" substring.
  if (isKein) {
    return {
      key: "kein_interesse",
      campaignStatus: "kein_interesse",
      quality: "ausgeschlossen",
      scoreDelta: 0,
      createTask: false,
    };
  }
  if (isInteresse) {
    return {
      key: "interesse",
      campaignStatus: "interessiert",
      quality: "hot",
      scoreDelta: 30,
      createTask: true,
    };
  }
  if (isMehr) {
    return {
      key: "mehr_infos",
      campaignStatus: "informationswunsch",
      quality: "warm",
      scoreDelta: 20,
      createTask: false,
    };
  }
  return null;
}

export class CampaignInboundService {
  async handleInbound(leadId: string, input: InboundReplyInput): Promise<void> {
    const lead = await leadRepository.findById(leadId);
    if (!lead || !isActiveCampaignLead(lead)) return;

    const cls = classifyCampaignReply(input);
    await campaignRepository.cancelQueuedJobsForLead(
      leadId,
      cls ? `quick_reply:${cls.key}` : "whatsapp_reply",
    );

    if (!cls) {
      // Plain reply → reacted (generic stop). Quality/score already handled by
      // the WhatsApp classifier; here we only stop the campaign.
      await leadRepository.update(leadId, {
        campaignCompleted: true,
        automationPaused: true,
        campaignStatus: "reagiert",
      });
      await auditLogService.append({
        actor: "whatsapp-webhook",
        action: AuditAction.MESSAGE_RECEIVED,
        entityType: "Lead",
        entityId: leadId,
        details: { campaignStop: "whatsapp_reply", status: "reagiert" },
      });
      return;
    }

    await leadRepository.update(leadId, {
      campaignCompleted: true,
      automationPaused: true,
      campaignStatus: cls.campaignStatus,
      leadQualityStatus: cls.quality,
      leadScore: lead.leadScore + cls.scoreDelta,
    });

    if (cls.createTask) {
      const createdById =
        lead.assignedToId ?? (await userRepository.findSystemActorId());
      if (createdById) {
        await taskRepository.create({
          title: `Heißer Lead: ${lead.firstName} ${lead.lastName} hat Interesse (Reaktivierung)`,
          description:
            "Lead hat im Reaktivierungs-Flow auf „Ja, Interesse“ reagiert. Zeitnah kontaktieren.",
          leadId,
          assigneeId: lead.assignedToId ?? null,
          createdById,
          priority: "HIGH",
          dueAt: new Date(input.at.getTime() + 4 * 3_600_000),
        });
      }
    }

    await auditLogService.append({
      actor: "whatsapp-webhook",
      action: AuditAction.MESSAGE_RECEIVED,
      entityType: "Lead",
      entityId: leadId,
      details: {
        campaignQuickReply: cls.key,
        campaignStatus: cls.campaignStatus,
        scoreDelta: cls.scoreDelta,
      },
    });
  }
}

export const campaignInboundService = new CampaignInboundService();