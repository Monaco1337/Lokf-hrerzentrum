/**
 * /crm/campaigns/reaktivierung — Alt-Lead reactivation campaign overview,
 * manual release and KPIs. Gated on canManageLeads.
 */
import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import {
  deriveReactivationLeadState,
  REACTIVATION_LEAD_STATES,
  type ReactivationLeadRow,
  type ReactivationLeadState,
} from "@/features/fairtrain-funnel/campaign/reactivationLeadList";
import { REACTIVATION_CAMPAIGN_KEY } from "@/features/fairtrain-funnel/campaign/types";
import { ReactivationCampaign } from "@/features/fairtrain-funnel/crm/campaign/ReactivationCampaign";
import { ReactivationLeadList } from "@/features/fairtrain-funnel/crm/campaign/ReactivationLeadList";
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

const PAGE_SIZE = 25;

function parseState(v: unknown): ReactivationLeadState | undefined {
  return typeof v === "string" &&
    (REACTIVATION_LEAD_STATES as ReadonlyArray<string>).includes(v)
    ? (v as ReactivationLeadState)
    : undefined;
}

export default async function ReactivationCampaignPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireCrmUser();
  if (!can(user.role, "canManageLeads")) {
    redirect("/crm");
  }

  const sp = await searchParams;
  const state = parseState(sp.state);
  const search = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number.parseInt(String(sp.p ?? "1"), 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [
    overview,
    kpis,
    readyCount,
    dueCount,
    failedCount,
    failedReasons,
    templates,
    listPage,
    stateCounts,
  ] = await Promise.all([
    loadReactivationOverview(),
    aggregateCampaignKpis(REACTIVATION_CAMPAIGN_KEY),
    leadRepository.countReadyCampaignLeads(REACTIVATION_CAMPAIGN_KEY),
    campaignRepository.countDueJobs(new Date()),
    campaignRepository.countFailedJobs(REACTIVATION_CAMPAIGN_KEY),
    campaignRepository.failedReasonBreakdown(REACTIVATION_CAMPAIGN_KEY),
    campaignTemplateService.resolveTemplates(),
    leadRepository.listReactivationLeadRows({
      campaign: REACTIVATION_CAMPAIGN_KEY,
      state,
      search: search || undefined,
      skip,
      take: PAGE_SIZE,
    }),
    leadRepository.reactivationLeadStateCounts(
      REACTIVATION_CAMPAIGN_KEY,
      search || undefined,
    ),
  ]);

  const rows: ReactivationLeadRow[] = listPage.rows.map((l) => ({
    id: l.id,
    name: `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim() || "Unbenannt",
    phone: l.phone || null,
    city: l.city,
    state: deriveReactivationLeadState(l),
    contactedAt: l.firstContactSentAt,
    lastActivityAt:
      l.lastWhatsappReplyAt ?? l.firstContactSentAt ?? l.createdAt,
  }));

  return (
    <div className="space-y-6">
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
      <ReactivationLeadList
        rows={rows}
        total={listPage.total}
        counts={stateCounts}
        state={state}
        search={search}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
