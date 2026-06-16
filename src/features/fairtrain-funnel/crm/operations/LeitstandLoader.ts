/**
 * LeitstandLoader — server-side data fetcher for the Operations dashboard.
 *
 * Pulls everything the Leitstand renders in a single Promise.all so the
 * critical-path TTFB stays under 250 ms even on cold caches.
 *
 * NOTE: every count returned here is a real DB query — no demo math, no
 * fallback estimates. If the DB is empty, the UI just shows zero.
 */
/* eslint-disable no-restricted-imports -- server-only data loader (no client code); direct DB/service access is intentional and never bundled to the client. */
import { prisma } from "@/server/db/prisma";
import { applyScope } from "@/server/services/LeadAccess";
import { leadInsightsService } from "@/server/services/LeadInsightsService";
import { leadService } from "@/server/services/LeadService";
import { auditLogRepository } from "@/server/repositories/AuditLogRepository";
import { userRepository } from "@/server/repositories/UserRepository";

import type {
  AuditLogEntry,
  EnrichedLeadSummary,
  LeadKpis,
  UserSummary,
} from "../../types";
import { LeadStatus } from "../../types";

import { buildFunnel, type FunnelData } from "./LeitstandFunnel";
import type { AlarmCounts } from "./LeitstandAlarme";

export interface LeitstandData {
  user: UserSummary;
  kpis: LeadKpis;
  alarms: AlarmCounts;
  funnel: FunnelData;
  priorities: ReadonlyArray<EnrichedLeadSummary>;
  activity: ReadonlyArray<AuditLogEntry>;
  actors: Record<string, string>;
}

const ACTIVE_STATUSES: ReadonlyArray<LeadStatus> = Object.values(LeadStatus).filter(
  (s): s is LeadStatus =>
    s !== LeadStatus.CLOSED && s !== LeadStatus.LOST && s !== LeadStatus.REJECTED,
);

async function loadAlarms(): Promise<AlarmCounts> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [
    hotUncontacted,
    callbacksOverdue,
    voucherBlocked,
    leadsUnassigned,
    slaBreached,
    appointmentsToday,
    documentsMissing,
  ] = await Promise.all([
    // HOT priority leads that nobody has called yet (status still NEW/CONTACT_PENDING)
    prisma.lead.count({
      where: {
        deletedAt: null,
        priority: "HOT",
        status: { in: [LeadStatus.NEW, LeadStatus.CONTACT_PENDING] },
      },
    }),
    // Callbacks scheduled in the past
    prisma.lead.count({
      where: {
        deletedAt: null,
        nextFollowUpAt: { lt: now },
        status: { in: ACTIVE_STATUSES as string[] },
      },
    }),
    // Voucher-flow stuck (pending too long or rejected at agency)
    prisma.lead.count({
      where: {
        deletedAt: null,
        status: { in: [LeadStatus.GUTSCHEIN_PENDING, LeadStatus.BLOCKED] },
      },
    }),
    // Active leads with no owner
    prisma.lead.count({
      where: {
        deletedAt: null,
        assignedToId: null,
        status: { in: ACTIVE_STATUSES as string[] },
      },
    }),
    // SLA-breached active leads
    prisma.lead.count({
      where: {
        deletedAt: null,
        slaBreachedAt: { not: null },
        status: { in: ACTIVE_STATUSES as string[] },
      },
    }),
    // Agency appointments today (proxy: AA_APPOINTMENT_PENDING with follow-up today)
    prisma.lead.count({
      where: {
        deletedAt: null,
        status: LeadStatus.AA_APPOINTMENT_PENDING,
        nextFollowUpAt: { gte: startOfDay, lt: endOfDay },
      },
    }),
    // Documents missing (lead is past qualifying but no DOC_READY yet)
    prisma.lead.count({
      where: {
        deletedAt: null,
        status: { in: [LeadStatus.DOC_PENDING, LeadStatus.BRIEFING_SENT] },
      },
    }),
  ]);
  return {
    hotUncontacted,
    callbacksOverdue,
    voucherBlocked,
    leadsUnassigned,
    slaBreached,
    appointmentsToday,
    documentsMissing,
  };
}

export async function loadLeitstand(
  user: UserSummary,
): Promise<LeitstandData> {
  const scopeAll = applyScope({}, user);
  const scopeActive = applyScope({ status: ACTIVE_STATUSES }, user);
  const [kpis, alarms, activeRaw, recentEvents, allUsers] = await Promise.all([
    leadService.kpis(),
    loadAlarms(),
    leadService.list(scopeActive),
    auditLogRepository.listRecent({ limit: 25 }),
    userRepository.list({ includeInactive: true }),
  ]);
  // Quiet the no-unused-vars guard while keeping the scope around for future
  // owner-filtering on the global feed (we currently show org-wide activity).
  void scopeAll;

  const priorities = await leadInsightsService.enrich(activeRaw);
  const funnel = buildFunnel(kpis);
  const actors: Record<string, string> = {};
  for (const u of allUsers) actors[u.id] = u.name;

  return {
    user,
    kpis,
    alarms,
    funnel,
    priorities,
    activity: recentEvents,
    actors,
  };
}
