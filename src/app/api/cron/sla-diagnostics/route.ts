/**
 * Read-only diagnostics for the header health numbers (Eskalation/HOT
 * offen/Wiedervorlagen). No PII — counts only. Same auth as the other cron
 * routes. Exists so a drift between the header and the rest of the CRM can be
 * confirmed/ruled out without direct DB access.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/server/env";
import { prisma } from "@/server/db/prisma";
import { LeadStatus } from "@/features/fairtrain-funnel/types";
import { FUNNEL_PHASE_RANK, FunnelPhase } from "@/features/fairtrain-funnel/funnelPhase";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function isAuthorized(req: Request): boolean {
  const expected = serverEnv.CRON_SECRET;
  if (!expected) return false;
  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret && safeEqual(headerSecret, expected)) return true;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return Boolean(bearer) && safeEqual(bearer, expected);
}

export async function GET(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }

  const [
    totalLeadsNeu,
    totalAssigned,
    totalUnassigned,
    priorityCounts,
    hotUnassigned,
    hotAssigned,
    slaBreachedTotal,
    callbacksOverdue,
    funnelPhaseCounts,
    docsUploadedLeadIds,
  ] = await Promise.all([
    prisma.lead.count({ where: { deletedAt: null, leadType: "neu" } }),
    prisma.lead.count({ where: { deletedAt: null, leadType: "neu", assignedToId: { not: null } } }),
    prisma.lead.count({ where: { deletedAt: null, leadType: "neu", assignedToId: null } }),
    prisma.lead.groupBy({
      by: ["priority"],
      where: { deletedAt: null, leadType: "neu" },
      _count: true,
    }),
    prisma.lead.count({ where: { deletedAt: null, priority: "HOT", assignedToId: null } }),
    prisma.lead.count({ where: { deletedAt: null, priority: "HOT", assignedToId: { not: null } } }),
    prisma.lead.count({ where: { deletedAt: null, slaBreachedAt: { not: null } } }),
    prisma.lead.count({
      where: {
        deletedAt: null,
        nextFollowUpAt: { lt: new Date() },
        status: { notIn: [LeadStatus.CLOSED, LeadStatus.LOST, LeadStatus.REJECTED] },
      },
    }),
    prisma.lead.groupBy({
      by: ["funnelPhase"],
      where: { deletedAt: null, leadType: "neu" },
      _count: true,
    }),
    prisma.portalDocument.findMany({
      where: { status: { in: ["UPLOADED", "APPROVED"] } },
      select: { leadId: true },
      distinct: ["leadId"],
    }),
  ]);

  const hotWithoutDocs = await prisma.lead.count({
    where: {
      deletedAt: null,
      leadType: "neu",
      priority: "HOT",
      id: { notIn: docsUploadedLeadIds.map((d) => d.leadId) },
    },
  });

  const funnelDonePhases = Object.values(FunnelPhase).filter(
    (p) => FUNNEL_PHASE_RANK[p] >= FUNNEL_PHASE_RANK[FunnelPhase.ELIGIBILITY_COMPLETED],
  );
  const hotFunnelNotDone = await prisma.lead.count({
    where: {
      deletedAt: null,
      leadType: "neu",
      priority: "HOT",
      funnelPhase: { notIn: funnelDonePhases },
    },
  });

  return NextResponse.json({
    ok: true,
    totalLeadsNeu,
    totalAssigned,
    totalUnassigned,
    priorityCounts,
    hotUnassigned,
    hotAssigned,
    hotTotal: hotUnassigned + hotAssigned,
    hotWithoutUploadedDocs: hotWithoutDocs,
    hotWithFunnelNotDone: hotFunnelNotDone,
    slaBreachedTotal,
    callbacksOverdue,
    funnelPhaseCounts,
    distinctLeadsWithUploadedDocs: docsUploadedLeadIds.length,
  });
}
