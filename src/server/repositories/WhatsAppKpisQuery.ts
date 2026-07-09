/**
 * WhatsAppKpisQuery — real, DB-backed WhatsApp funnel counts for the dashboard.
 *
 * Every number is a live `prisma.lead.count`. Nothing is estimated or faked:
 * counts derive from the lead-level tracking fields that the webhook classifier
 * maintains from real provider events. Rates are computed from those counts.
 */
import type { WhatsAppKpis } from "@/features/fairtrain-funnel/messaging/types";

import { prisma } from "../db/prisma";

export type { WhatsAppKpis };

const notDeleted = { deletedAt: null } as const;
const ratio = (num: number, den: number): number =>
  den > 0 ? Math.round((num / den) * 1000) / 1000 : 0;

export async function aggregateWhatsAppKpis(): Promise<WhatsAppKpis> {
  const [
    sent,
    delivered,
    read,
    replied,
    failed,
    notRegistered,
    invalidNumbers,
    culled,
    hot,
    warm,
  ] = await Promise.all([
    prisma.lead.count({ where: { ...notDeleted, lastWhatsappMessageAt: { not: null } } }),
    prisma.lead.count({ where: { ...notDeleted, lastWhatsappDeliveredAt: { not: null } } }),
    prisma.lead.count({ where: { ...notDeleted, lastWhatsappReadAt: { not: null } } }),
    prisma.lead.count({ where: { ...notDeleted, lastWhatsappReplyAt: { not: null } } }),
    prisma.lead.count({ where: { ...notDeleted, whatsappStatus: "fehlgeschlagen" } }),
    prisma.lead.count({ where: { ...notDeleted, whatsappStatus: "nicht_registriert" } }),
    prisma.lead.count({ where: { ...notDeleted, whatsappStatus: "nummer_ungueltig" } }),
    prisma.lead.count({ where: { ...notDeleted, leadQualityStatus: "schrottlead" } }),
    prisma.lead.count({
      where: {
        ...notDeleted,
        OR: [{ leadScore: { gte: 25 } }, { whatsappStatus: "beantwortet" }],
      },
    }),
    prisma.lead.count({
      where: {
        ...notDeleted,
        NOT: { OR: [{ leadScore: { gte: 25 } }, { whatsappStatus: "beantwortet" }] },
        OR: [{ leadScore: { gte: 10 } }, { whatsappStatus: "gelesen" }],
      },
    }),
  ]);

  return {
    sent,
    delivered,
    read,
    replied,
    failed,
    notRegistered,
    invalidNumbers,
    culled,
    hot,
    warm,
    deliveryRate: ratio(delivered, sent),
    readRate: ratio(read, sent),
    replyRate: ratio(replied, sent),
  };
}
