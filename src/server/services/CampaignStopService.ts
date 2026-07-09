/**
 * CampaignStopService — the single place that stops a reactivation campaign.
 *
 * A stop is triggered by any real engagement signal: WhatsApp reply, quick-reply
 * button, link click (magic-link consume), Eignungscheck started/completed,
 * appointment booked, or a manual takeover. On stop we mark the lead completed,
 * pause automation, set the campaign status and cancel every still-queued job so
 * no further follow-up is ever sent after a reaction.
 */
import type { CampaignStatus } from "@/features/fairtrain-funnel/campaign/types";
import { REACTIVATION_CAMPAIGN_KEY } from "@/features/fairtrain-funnel/campaign/types";
import type { LeadSummary } from "@/features/fairtrain-funnel/types";

import { auditLogService } from "./AuditLogService";
import { campaignRepository } from "../repositories/CampaignRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { AuditAction } from "@/features/fairtrain-funnel/types";

export type CampaignStopTrigger =
  | "whatsapp_reply"
  | "quick_reply"
  | "link_click"
  | "eignungscheck_started"
  | "eignungscheck_completed"
  | "appointment_booked"
  | "manual_takeover";

export interface CampaignStopResult {
  stopped: boolean;
  canceledJobs: number;
}

/** Is this lead currently an active participant of the reactivation campaign? */
export function isActiveCampaignLead(lead: {
  leadType: string;
  campaign: string | null;
  campaignCompleted: boolean;
}): boolean {
  return (
    lead.leadType === "alt_lead" &&
    lead.campaign === REACTIVATION_CAMPAIGN_KEY &&
    !lead.campaignCompleted
  );
}

export class CampaignStopService {
  /**
   * Stop the campaign for a lead. Idempotent: a lead that is already completed
   * is left untouched (but a fresh status hint is still applied when provided).
   */
  async stop(
    leadId: string,
    trigger: CampaignStopTrigger,
    status: CampaignStatus = "reagiert",
  ): Promise<CampaignStopResult> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) return { stopped: false, canceledJobs: 0 };
    if (!isActiveCampaignLead(lead)) {
      return { stopped: false, canceledJobs: 0 };
    }

    const canceled = await campaignRepository.cancelQueuedJobsForLead(
      leadId,
      `stop:${trigger}`,
    );

    await leadRepository.update(leadId, {
      campaignCompleted: true,
      automationPaused: true,
      campaignStatus: status,
    });

    await auditLogService.append({
      actor: "system",
      action: AuditAction.MESSAGE_RECEIVED,
      entityType: "Lead",
      entityId: leadId,
      details: { campaignStop: trigger, status, canceledJobs: canceled },
    });

    return { stopped: true, canceledJobs: canceled };
  }

  /** Convenience wrapper for the inbound WhatsApp reply hook. */
  async stopOnInboundReply(lead: LeadSummary): Promise<CampaignStopResult> {
    return this.stop(lead.id, "whatsapp_reply", "reagiert");
  }
}

export const campaignStopService = new CampaignStopService();
