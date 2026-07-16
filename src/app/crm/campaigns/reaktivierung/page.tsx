/**
 * /crm/campaigns/reaktivierung — Alt-Lead reactivation campaign overview,
 * manual release and KPIs. Gated on canManageLeads.
 */
import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { REACTIVATION_CAMPAIGN_KEY } from "@/features/fairtrain-funnel/campaign/types";
import { ReactivationCampaign } from "@/features/fairtrain-funnel/crm/campaign/ReactivationCampaign";
import { requireCrmUser } from "@/server/actions/_helpers";
import {
  aggregateCampaignKpis,
  loadReactivationOverview,
} from "@/server/repositories/CampaignKpisQuery";
import { campaignRepository } from "@/server/repositories/CampaignRepository";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { campaignTemplateService } from "@/server/services/CampaignTemplateService";
import { messageLedgerService } from "@/server/services/MessageLedgerService";

export const dynamic = "force-dynamic";
// Release auto-sends the queued Tag-0 messages; give that room before Vercel
// times the server action out (the cron drains any remainder either way).
export const maxDuration = 60;

export default async function ReactivationCampaignPage() {
  const user = await requireCrmUser();
  if (!can(user.role, "canManageLeads")) {
    redirect("/crm");
  }

  const [
    overview,
    kpis,
    readyCount,
    dueCount,
    failedCount,
    failedReasons,
    templates,
  ] = await Promise.all([
    loadReactivationOverview(),
    aggregateCampaignKpis(REACTIVATION_CAMPAIGN_KEY),
    leadRepository.countReadyCampaignLeads(REACTIVATION_CAMPAIGN_KEY),
    campaignRepository.countDueJobs(new Date()),
    campaignRepository.countFailedJobs(REACTIVATION_CAMPAIGN_KEY),
    campaignRepository.failedReasonBreakdown(REACTIVATION_CAMPAIGN_KEY),
    campaignTemplateService.resolveTemplates(),
  ]);

  return (
    <ReactivationCampaign
      overview={overview}
      kpis={kpis}
      readyCount={readyCount}
      dueCount={dueCount}
      failedCount={failedCount}
      failedReasons={failedReasons}
      templates={templates}
      whatsappLive={messageLedgerService.whatsappLive}
    />
  );
}
