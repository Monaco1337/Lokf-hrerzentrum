/**
 * LeadKpisQuery — Prisma aggregation pipeline for the dashboard KPIs.
 *
 * Extracted from LeadRepository to keep that file under the max-lines cap.
 * Pure data-access; the service layer wraps this and adds caching later.
 */
import {
  LeadStatus,
  type LeadKpis,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";

export async function aggregateLeadKpis(): Promise<LeadKpis> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    total,
    hot,
    newToday,
    followUpsOpen,
    docsOpen,
    gutscheinApproved,
    gutscheinPending,
    slaBreached,
    statusGroups,
    ausbildungsstartsMonth,
    closedSample,
    unassigned,
  ] = await Promise.all([
    prisma.lead.count({ where: { deletedAt: null } }),
    prisma.lead.count({ where: { deletedAt: null, priority: "HOT" } }),
    prisma.lead.count({
      where: { deletedAt: null, createdAt: { gte: startOfDay } },
    }),
    prisma.lead.count({
      where: { deletedAt: null, nextFollowUpAt: { lte: new Date() } },
    }),
    prisma.document.count({
      where: {
        OR: [{ status: "MISSING_DATA" }, { status: "READY_TO_GENERATE" }],
      },
    }),
    prisma.lead.count({
      where: { deletedAt: null, status: LeadStatus.GUTSCHEIN_APPROVED },
    }),
    prisma.lead.count({
      where: { deletedAt: null, status: LeadStatus.GUTSCHEIN_PENDING },
    }),
    prisma.lead.count({
      where: {
        deletedAt: null,
        priority: "HOT",
        slaBreachedAt: { not: null },
        status: { in: [LeadStatus.NEW, LeadStatus.QUALIFIED, LeadStatus.HOT] },
      },
    }),
    prisma.lead.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.lead.count({
      where: {
        deletedAt: null,
        status: {
          in: [LeadStatus.ENROLLED, LeadStatus.STARTED, LeadStatus.CLOSED],
        },
        updatedAt: { gte: startOfMonth },
      },
    }),
    // Sample of recently closed leads for avg-processing-time. Bounded to the
    // last 30 days × 200 rows so the average reflects current performance.
    prisma.lead.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [LeadStatus.ENROLLED, LeadStatus.STARTED, LeadStatus.CLOSED],
        },
        updatedAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
    prisma.lead.count({
      where: { deletedAt: null, assignedToId: null },
    }),
  ]);

  const byStatus = Object.fromEntries(
    Object.values(LeadStatus).map((s) => [s, 0]),
  ) as Record<LeadStatus, number>;
  for (const row of statusGroups) {
    const key = row.status as LeadStatus;
    byStatus[key] = row._count._all;
  }

  // ---- Conversion-Rate ------------------------------------------------------
  // Leads die das System sinnvoll durchlaufen — BLOCKED/REJECTED/LOST bleiben
  // aus der Conversion-Berechnung heraus. Won = alles ab GUTSCHEIN_APPROVED.
  const activePipeline =
    total -
    (byStatus[LeadStatus.BLOCKED] ?? 0) -
    (byStatus[LeadStatus.REJECTED] ?? 0) -
    (byStatus[LeadStatus.LOST] ?? 0);
  const won =
    (byStatus[LeadStatus.GUTSCHEIN_APPROVED] ?? 0) +
    (byStatus[LeadStatus.ENROLLED] ?? 0) +
    (byStatus[LeadStatus.STARTED] ?? 0) +
    (byStatus[LeadStatus.CLOSED] ?? 0);
  const conversionRate = activePipeline > 0 ? won / activePipeline : 0;

  // ---- Förderquote ---------------------------------------------------------
  const voucherFunnelTotal = gutscheinPending + gutscheinApproved;
  const foerderquote =
    voucherFunnelTotal > 0 ? gutscheinApproved / voucherFunnelTotal : 0;

  // ---- Ø Bearbeitungszeit --------------------------------------------------
  const avgProcessingHours =
    closedSample.length > 0
      ? closedSample.reduce(
          (acc, row) =>
            acc + (row.updatedAt.getTime() - row.createdAt.getTime()),
          0,
        ) /
        closedSample.length /
        (1000 * 60 * 60)
      : null;

  return {
    total,
    hot,
    newToday,
    followUpsOpen,
    docsOpen,
    gutscheinApproved,
    gutscheinPending,
    slaBreached,
    byStatus,
    conversionRate,
    foerderquote,
    avgProcessingHours,
    ausbildungsstartsMonth,
    unassigned,
  };
}
