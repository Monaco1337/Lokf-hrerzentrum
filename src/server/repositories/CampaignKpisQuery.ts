/**
 * CampaignKpisQuery — aggregate KPIs for the reactivation campaign dashboard.
 *
 * All counts are REAL: Lead-level counts for status/tracking and
 * CampaignMessageJob counts for channel sends. Signals we do not yet track
 * (Eignungscheck started/completed) are returned as 0 and labelled in the UI.
 */
import type { CampaignKpis } from "@/features/fairtrain-funnel/campaign/types";
import { REACTIVATION_CAMPAIGN_KEY } from "@/features/fairtrain-funnel/campaign/types";

import { prisma } from "../db/prisma";

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
