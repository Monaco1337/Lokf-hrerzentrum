/**
 * CampaignKpisQuery — aggregate KPIs for the reactivation campaign dashboard.
 *
 * All counts are REAL: Lead-level counts for status/tracking and
 * CampaignMessageJob counts for channel sends. Signals we do not yet track
 * (Eignungscheck started/completed) are returned as 0 and labelled in the UI.
 */
import type {
  CampaignKpis,
  ReactivationOverview,
} from "@/features/fairtrain-funnel/campaign/types";
import { REACTIVATION_CAMPAIGN_KEY } from "@/features/fairtrain-funnel/campaign/types";
import { FunnelPhase } from "@/features/fairtrain-funnel/funnelPhase";

import { prisma } from "../db/prisma";

/** Funnel phases that count as "Eignungscheck gestartet" (funnel handover). */
const ELIGIBILITY_PHASES: FunnelPhase[] = [
  FunnelPhase.WAITING_ELIGIBILITY,
  FunnelPhase.ELIGIBILITY_STARTED,
  FunnelPhase.ELIGIBILITY_COMPLETED,
  FunnelPhase.WAITING_DOCUMENTS,
  FunnelPhase.DOCUMENTS_RECEIVED,
  FunnelPhase.WAITING_APPOINTMENT,
  FunnelPhase.APPOINTMENT_SCHEDULED,
  FunnelPhase.QUALIFIED,
  FunnelPhase.COMPLETED,
];

const FAILED_WHATSAPP_STATUSES = [
  "fehlgeschlagen",
  "nummer_ungueltig",
  "nicht_registriert",
  "nicht_erreichbar",
];

/**
 * The 10 headline metrics for the redesigned Reaktivierung workspace. Uses the
 * same cohort as the Multichat live bar (still `alt_lead` OR converted via tag
 * "reaktiviert") so both surfaces always show consistent numbers.
 */
export async function loadReactivationOverview(): Promise<ReactivationOverview> {
  const cohortOr = [
    { source: REACTIVATION_CAMPAIGN_KEY },
    { campaign: REACTIVATION_CAMPAIGN_KEY },
    { tags: { has: "reaktiviert" } },
  ];
  const cohort = (extra?: Record<string, unknown>) => ({
    deletedAt: null,
    ...(extra ? { AND: [{ OR: cohortOr }, extra] } : { OR: cohortOr }),
  });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    imported,
    open,
    contactedToday,
    waitingReply,
    reminder24h,
    reminder48h,
    eligibilityStarted,
    inFunnel,
    completed,
    failed,
  ] = await Promise.all([
    prisma.lead.count({ where: cohort() }),
    prisma.lead.count({
      where: cohort({
        leadType: "alt_lead",
        communicationStarted: false,
        campaignCompleted: false,
      }),
    }),
    prisma.lead.count({
      where: cohort({ firstContactSentAt: { gte: startOfToday } }),
    }),
    prisma.lead.count({
      where: cohort({
        leadType: "alt_lead",
        communicationStarted: true,
        campaignCompleted: false,
        lastWhatsappReplyAt: null,
      }),
    }),
    prisma.lead.count({ where: cohort({ campaignStep: { gte: 2 } }) }),
    prisma.lead.count({ where: cohort({ campaignStep: { gte: 3 } }) }),
    prisma.lead.count({
      where: cohort({ funnelPhase: { in: ELIGIBILITY_PHASES } }),
    }),
    prisma.lead.count({ where: cohort({ leadType: "neu" }) }),
    prisma.lead.count({
      where: cohort({
        OR: [
          { campaignStatus: "inaktiv" },
          { funnelPhase: FunnelPhase.COMPLETED },
        ],
      }),
    }),
    prisma.lead.count({
      where: cohort({ whatsappStatus: { in: FAILED_WHATSAPP_STATUSES } }),
    }),
  ]);

  return {
    imported,
    open,
    contactedToday,
    waitingReply,
    reminder24h,
    reminder48h,
    eligibilityStarted,
    inFunnel,
    completed,
    failed,
  };
}

export async function aggregateCampaignKpis(
  campaign: string = REACTIVATION_CAMPAIGN_KEY,
): Promise<CampaignKpis> {
  const leadBase = { deletedAt: null, campaign, leadType: "alt_lead" } as const;

  const leadCount = (where: Record<string, unknown>): Promise<number> =>
    prisma.lead.count({ where: { ...leadBase, ...where } });
  const jobCount = (channel: string, status: string): Promise<number> =>
    prisma.campaignMessageJob.count({ where: { campaign, channel, status } });

  const [
    imported,
    versandbereit,
    erstkontaktGesendet,
    followup1Gesendet,
    followup2Gesendet,
    whatsappZugestellt,
    whatsappGelesen,
    antworten,
    jaInteresse,
    mehrInfos,
    keinInteresse,
    reagiert,
    qualifiziert,
    inaktiv,
    fehlerhafte,
    whatsappGesendet,
    emailGesendet,
  ] = await Promise.all([
    leadCount({}),
    leadCount({ communicationStarted: false, campaignCompleted: false }),
    leadCount({ campaignStep: { gte: 1 } }),
    leadCount({ campaignStep: { gte: 2 } }),
    leadCount({ campaignStep: { gte: 3 } }),
    leadCount({ lastWhatsappDeliveredAt: { not: null } }),
    leadCount({ lastWhatsappReadAt: { not: null } }),
    leadCount({ lastWhatsappReplyAt: { not: null } }),
    leadCount({ campaignStatus: "interessiert" }),
    leadCount({ campaignStatus: "informationswunsch" }),
    leadCount({ campaignStatus: "kein_interesse" }),
    leadCount({ campaignStatus: "reagiert" }),
    leadCount({ campaignStatus: "qualifiziert" }),
    leadCount({ campaignStatus: "inaktiv" }),
    leadCount({
      whatsappStatus: {
        in: [
          "fehlgeschlagen",
          "nummer_ungueltig",
          "nicht_registriert",
          "nicht_erreichbar",
        ],
      },
    }),
    jobCount("WHATSAPP", "sent"),
    jobCount("EMAIL", "sent"),
  ]);

  return {
    imported,
    versandbereit,
    erstkontaktGesendet,
    followup1Gesendet,
    followup2Gesendet,
    whatsappGesendet,
    whatsappZugestellt,
    whatsappGelesen,
    emailGesendet,
    antworten,
    jaInteresse,
    mehrInfos,
    keinInteresse,
    reagiert,
    qualifiziert,
    // Not yet tracked separately (WhatsApp-first) — surfaced as 0 in the UI.
    eignungscheckGestartet: 0,
    eignungscheckAbgeschlossen: 0,
    inaktiv,
    fehlerhafte,
  };
}
