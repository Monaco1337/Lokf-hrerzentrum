/**
 * SalesAnalyticsService — sales-side dashboard KPIs.
 *
 * Combines call-log + audit + lead repositories to produce:
 *   - calls today / calls this week
 *   - top sales partners by call volume
 *   - unassigned + assigned lead counts
 *   - per-user lead counts
 *
 * All numbers are server-side aggregates; never expose Prisma to the UI.
 */
import type { UserRef } from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { auditLogRepository } from "../repositories/AuditLogRepository";
import { callLogRepository } from "../repositories/CallLogRepository";
import { rowToUserRef, userRepository } from "../repositories/UserRepository";

export interface TopSalesPartner {
  user: UserRef;
  callsThisWeek: number;
  leadsAssigned: number;
}

export interface SalesAnalyticsSnapshot {
  callsToday: number;
  callsThisWeek: number;
  activitiesToday: number;
  activitiesThisWeek: number;
  topPartners: TopSalesPartner[];
}

function startOfDay(now = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfWeek(now = new Date()): Date {
  const d = startOfDay(now);
  // Monday-based weeks (DE convention)
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d;
}

export class SalesAnalyticsService {
  async snapshot(): Promise<SalesAnalyticsSnapshot> {
    const today = startOfDay();
    const week = startOfWeek();

    const [
      callsToday,
      callsThisWeek,
      activitiesToday,
      activitiesThisWeek,
      topCallUsers,
    ] = await Promise.all([
      callLogRepository.countSince(today),
      callLogRepository.countSince(week),
      auditLogRepository.countSince(today),
      auditLogRepository.countSince(week),
      callLogRepository.topUsersSince(week, 5),
    ]);

    const userIds = topCallUsers.map((t) => t.userId);
    const [userRows, leadCounts] = await Promise.all([
      Promise.all(userIds.map((id) => userRepository.findRefById(id))),
      prisma.lead.groupBy({
        by: ["assignedToId"],
        where: { deletedAt: null, assignedToId: { in: userIds } },
        _count: { _all: true },
      }),
    ]);

    const leadCountByUser = new Map<string, number>();
    for (const row of leadCounts) {
      if (row.assignedToId) {
        leadCountByUser.set(row.assignedToId, row._count._all);
      }
    }

    const topPartners: TopSalesPartner[] = topCallUsers
      .map((t, idx) => {
        const ref = userRows[idx];
        if (!ref) return null;
        return {
          user: ref,
          callsThisWeek: t.callCount,
          leadsAssigned: leadCountByUser.get(t.userId) ?? 0,
        };
      })
      .filter((x): x is TopSalesPartner => x !== null);

    return {
      callsToday,
      callsThisWeek,
      activitiesToday,
      activitiesThisWeek,
      topPartners,
    };
  }
}

export const salesAnalyticsService = new SalesAnalyticsService();
// Re-export for callers building user refs externally — keeps imports terse.
export { rowToUserRef };
