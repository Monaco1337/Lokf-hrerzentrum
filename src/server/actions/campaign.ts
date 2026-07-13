"use server";
/**
 * Reactivation campaign actions — manual release (with staffing tiers) and the
 * manual "Fällige senden" trigger. Gated on `canManageLeads`. No message is
 * ever sent without an explicit release here.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  REACTIVATION_CAMPAIGN_KEY,
  ReleaseTierSchema,
  releaseTierLimit,
  type ReleaseTier,
} from "@/features/fairtrain-funnel/campaign/types";

import { ValidationError } from "../errors";
import { leadRepository } from "../repositories/LeadRepository";
import { campaignRepository } from "../repositories/CampaignRepository";
import { campaignService, type RunSummary } from "../services/CampaignService";
import { requirePermission, runAction, type Result } from "./_helpers";

function revalidate(): void {
  revalidatePath("/crm/campaigns/reaktivierung");
  revalidatePath("/crm/leads");
  revalidatePath("/crm");
}

const ReleaseSchema = z.object({
  tier: ReleaseTierSchema,
  whatsappOnly: z.boolean().optional(),
});

export interface ReleaseResult {
  tier: ReleaseTier;
  selected: number;
  enqueued: number;
  skipped: number;
}

export async function releaseCampaign(
  raw: unknown,
): Promise<Result<ReleaseResult>> {
  return runAction(async () => {
    const parsed = ReleaseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Freigabe-Stufe");
    }
    const user = await requirePermission("canManageLeads");
    const tier = parsed.data.tier;

    const limit = releaseTierLimit(tier);
    const leads = await leadRepository.listReadyCampaignLeads(
      REACTIVATION_CAMPAIGN_KEY,
      limit,
    );
    const result = await campaignService.enqueueTag0(
      leads.map((l) => l.id),
      { whatsappOnly: parsed.data.whatsappOnly ?? false },
    );

    // Mark the newest still-open import batch as released (best-effort audit).
    const batches = await campaignRepository.listBatches(
      REACTIVATION_CAMPAIGN_KEY,
    );
    const open = batches.find((b) => b.status === "imported");
    if (open) {
      await campaignRepository.markBatchReleased(
        open.id,
        tier,
        result.enqueued,
        user.id,
      );
    }

    revalidate();
    return {
      tier,
      selected: leads.length,
      enqueued: result.enqueued,
      skipped: result.skipped,
    };
  });
}

export async function sendDueCampaignJobs(): Promise<Result<RunSummary>> {
  return runAction(async () => {
    await requirePermission("canManageLeads");
    const summary = await campaignService.runDueJobs();
    revalidate();
    return summary;
  });
}

export async function requeueFailedCampaignJobs(): Promise<
  Result<{ requeued: number }>
> {
  return runAction(async () => {
    await requirePermission("canManageLeads");
    const requeued = await campaignService.requeueFailed();
    revalidate();
    return { requeued };
  });
}
