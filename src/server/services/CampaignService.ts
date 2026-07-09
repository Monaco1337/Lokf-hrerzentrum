/**
 * CampaignService — enqueue, send and advance the Alt-Lead reactivation flow.
 *
 * Sequence (per released lead): Tag 0 Erstkontakt → (no reaction) Tag 3
 * Follow-up 1 → (no reaction) Tag 7 Follow-up 2 → finalize "inaktiv".
 * WhatsApp goes through MessageLedgerService (consent + Meta-approval guards +
 * WA tracking); Email goes through AutomationService (Resend). Idempotency is
 * guaranteed by the unique (leadId, step, channel) key on CampaignMessageJob.
 */
import {
  campaignStepConfig,
  REACTIVATION_CAMPAIGN,
  REACTIVATION_CAMPAIGN_KEY,
} from "@/features/fairtrain-funnel/campaign/types";
import { MessageStatus } from "@/features/fairtrain-funnel/messaging/types";
import type { LeadSummary } from "@/features/fairtrain-funnel/types";

import {
  campaignRepository,
  type CampaignJobRecord,
} from "../repositories/CampaignRepository";
import { automationTemplateRepository } from "../repositories/AutomationTemplateRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { userRepository } from "../repositories/UserRepository";
import { automationService } from "./AutomationService";
import { campaignTemplateService } from "./CampaignTemplateService";
import { isActiveCampaignLead } from "./CampaignStopService";
import { messageLedgerService } from "./MessageLedgerService";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface EnqueueResult {
  enqueued: number;
  skipped: number;
}

export interface RunSummary {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  finalized: number;
}

export class CampaignService {
  private cachedActorId: string | null = null;

  private async systemActorId(): Promise<string> {
    if (this.cachedActorId) return this.cachedActorId;
    const id = await userRepository.findSystemActorId();
    if (!id) {
      throw new Error(
        "Kein aktiver Benutzer für den Kampagnen-Versand gefunden.",
      );
    }
    this.cachedActorId = id;
    return id;
  }

  /**
   * Release leads into the campaign: enqueue the Tag-0 Erstkontakt (WhatsApp +
   * Email) for each lead, un-pause automation and mark them "versandbereit".
   * Idempotent — re-enqueuing an already-queued job is a no-op.
   */
  async enqueueTag0(leadIds: string[]): Promise<EnqueueResult> {
    await campaignTemplateService.ensureTemplates();
    let enqueued = 0;
    let skipped = 0;
    const now = new Date();

    for (const leadId of leadIds) {
      const lead = await leadRepository.findById(leadId);
      if (!lead || !isActiveCampaignLead(lead) || lead.communicationStarted) {
        skipped += 1;
        continue;
      }

      let did = false;
      if (lead.phone) {
        await campaignRepository.enqueueJob({
          leadId,
          campaign: REACTIVATION_CAMPAIGN_KEY,
          step: 1,
          channel: "WHATSAPP",
          scheduledFor: now,
        });
        did = true;
      }
      if (lead.email) {
        await campaignRepository.enqueueJob({
          leadId,
          campaign: REACTIVATION_CAMPAIGN_KEY,
          step: 1,
          channel: "EMAIL",
          scheduledFor: now,
        });
        did = true;
      }

      if (did) {
        await leadRepository.update(leadId, {
          automationPaused: false,
          campaignStatus: "versandbereit",
          nextCampaignActionAt: now,
        });
        enqueued += 1;
      } else {
        skipped += 1;
      }
    }

    return { enqueued, skipped };
  }

  /**
   * Process every due job (cron + manual button). Each send is re-checked
   * against the stop-rules first, then dispatched. On a successful send we
   * advance the lead and enqueue the next step. Finally, stale leads at the
   * last step are finalized to "inaktiv".
   */
  async runDueJobs(now: Date = new Date()): Promise<RunSummary> {
    const summary: RunSummary = {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      finalized: 0,
    };

    const jobs = await campaignRepository.findDueJobs(now);
    for (const job of jobs) {
      summary.processed += 1;
      const outcome = await this.sendJob(job);
      summary[outcome] += 1;
    }

    summary.finalized = await this.finalizeStale(now);
    return summary;
  }

  private async sendJob(
    job: CampaignJobRecord,
  ): Promise<"sent" | "failed" | "skipped"> {
    const lead = await leadRepository.findById(job.leadId);
    if (!lead) {
      await campaignRepository.updateJob(job.id, {
        status: "skipped",
        reason: "Lead nicht gefunden",
      });
      return "skipped";
    }

    // Stop-rule re-check: never contact a lead that already reacted.
    if (lead.campaignCompleted || !isActiveCampaignLead(lead)) {
      await campaignRepository.updateJob(job.id, {
        status: "canceled",
        reason: "Kampagne gestoppt (Reaktion/Übernahme)",
      });
      return "skipped";
    }

    const step = campaignStepConfig(job.step);
    if (!step) {
      await campaignRepository.updateJob(job.id, {
        status: "failed",
        reason: "Unbekannter Kampagnenschritt",
      });
      return "failed";
    }

    const slug =
      job.channel === "WHATSAPP"
        ? step.whatsappTemplateSlug
        : step.emailTemplateSlug;
    const template = await automationTemplateRepository.findBySlug(slug);
    if (!template) {
      await campaignRepository.updateJob(job.id, {
        status: "failed",
        reason: `Vorlage fehlt: ${slug}`,
      });
      return "failed";
    }

    const actorId = await this.systemActorId();

    try {
      if (job.channel === "WHATSAPP") {
        const entry = await messageLedgerService.sendTemplate({
          leadId: lead.id,
          templateId: template.id,
          actorId,
          sentBy: "AUTOMATION",
        });
        if (entry.status === MessageStatus.FAILED) {
          await campaignRepository.updateJob(job.id, {
            status: "failed",
            reason: entry.failedReason ?? "WhatsApp-Versand fehlgeschlagen",
          });
          return "failed";
        }
        await campaignRepository.updateJob(job.id, {
          status: "sent",
          sentAt: new Date(),
          providerMessageId: entry.providerMessageId,
        });
      } else {
        const log = await automationService.resendForLead(
          lead.id,
          template.id,
          actorId,
        );
        if (log.status !== "SENT") {
          await campaignRepository.updateJob(job.id, {
            status: "failed",
            reason: log.errorMessage ?? `E-Mail-Status: ${log.status}`,
          });
          return "failed";
        }
        await campaignRepository.updateJob(job.id, {
          status: "sent",
          sentAt: new Date(),
          providerMessageId: log.providerMessageId,
        });
      }
    } catch (err) {
      // Controlled skip: e.g. WA template not approved or consent missing.
      // Email on the same step still runs as its own job.
      await campaignRepository.updateJob(job.id, {
        status: "failed",
        reason: err instanceof Error ? err.message : "Versandfehler",
      });
      return "failed";
    }

    await this.advance(lead, job.step);
    return "sent";
  }

  /**
   * Advance the lead after a successful step send and enqueue the next step.
   * Guarded so processing the second channel of the same step is a no-op.
   */
  private async advance(lead: LeadSummary, step: number): Promise<void> {
    if (lead.campaignStep >= step) return; // already advanced by the other channel

    const now = new Date();
    const firstContactSentAt =
      step === 1 ? lead.firstContactSentAt ?? now : lead.firstContactSentAt;

    const campaignStatus =
      step === 1
        ? "erstkontakt_versendet"
        : step === 2
          ? "followup_1_versendet"
          : "followup_2_versendet";

    await leadRepository.update(lead.id, {
      campaignStep: step,
      campaignStatus,
      communicationStarted: true,
      ...(step === 1 ? { firstContactSentAt } : {}),
      nextCampaignActionAt: now,
    });

    // Enqueue the next step, anchored on the first-contact date.
    const next = campaignStepConfig(step + 1);
    if (next && firstContactSentAt) {
      const scheduledFor = new Date(
        firstContactSentAt.getTime() + next.dayOffset * DAY_MS,
      );
      if (lead.phone) {
        await campaignRepository.enqueueJob({
          leadId: lead.id,
          campaign: REACTIVATION_CAMPAIGN_KEY,
          step: next.step,
          channel: "WHATSAPP",
          scheduledFor,
        });
      }
      if (lead.email) {
        await campaignRepository.enqueueJob({
          leadId: lead.id,
          campaign: REACTIVATION_CAMPAIGN_KEY,
          step: next.step,
          channel: "EMAIL",
          scheduledFor,
        });
      }
    }
  }

  /**
   * Finalize leads that reached the last step and passed the grace period
   * without a reaction → campaignStatus "inaktiv", campaignCompleted true.
   */
  private async finalizeStale(now: Date): Promise<number> {
    const lastStep = REACTIVATION_CAMPAIGN.steps[REACTIVATION_CAMPAIGN.steps.length - 1];
    const graceMs =
      ((lastStep?.dayOffset ?? 7) + REACTIVATION_CAMPAIGN.finalizeGraceDays) *
      DAY_MS;
    const cutoff = new Date(now.getTime() - graceMs);

    const leads = await leadRepository.findCampaignLeadsToFinalize(
      REACTIVATION_CAMPAIGN_KEY,
      cutoff,
    );
    for (const lead of leads) {
      await leadRepository.update(lead.id, {
        campaignStatus: "inaktiv",
        campaignCompleted: true,
        automationPaused: true,
        nextCampaignActionAt: null,
      });
    }
    return leads.length;
  }
}

export const campaignService = new CampaignService();
