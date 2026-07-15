/**
 * StatusHistoryRepository - APPEND-ONLY.
 *
 * Only `append()` and `list()` are exposed. Status changes are immutable.
 */
import type { Prisma } from "@prisma/client";

import {
  type LeadStatus,
  type StatusHistoryEntry,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { parseLeadStatus, parseNullableLeadStatus } from "./types";

export interface AppendStatusHistoryInput {
  leadId: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  changedBy: string;
  reason: string | null;
}

export class StatusHistoryRepository {
  async append(
    input: AppendStatusHistoryInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.statusHistory.create({
      data: {
        leadId: input.leadId,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        changedBy: input.changedBy,
        reason: input.reason,
      },
    });
  }

  async list(leadId: string): Promise<StatusHistoryEntry[]> {
    const rows = await prisma.statusHistory.findMany({
      where: { leadId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      fromStatus: parseNullableLeadStatus(r.fromStatus),
      toStatus: parseLeadStatus(r.toStatus),
      changedBy: r.changedBy,
      reason: r.reason,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Count append-only transitions into a target status since a given moment.
   * Used by the Lead Control Center to surface "today's wins" — for example
   * how many Bildungsgutscheine were approved since midnight.
   */
  async countTransitionsTo(
    toStatus: LeadStatus,
    since: Date,
  ): Promise<number> {
    return prisma.statusHistory.count({
      where: { toStatus, createdAt: { gte: since } },
    });
  }

  /**
   * Recent append-only transitions INTO any of the given target statuses —
   * powers the Dashboard's business timeline (e.g. "Funnel gestartet",
   * "Funnel abgeschlossen", "Gutschein genehmigt"). Newest first.
   */
  async listRecentTransitionsTo(
    toStatuses: ReadonlyArray<LeadStatus>,
    limit = 40,
  ): Promise<
    ReadonlyArray<{ id: string; leadId: string; toStatus: LeadStatus; createdAt: Date }>
  > {
    if (toStatuses.length === 0) return [];
    const rows = await prisma.statusHistory.findMany({
      where: { toStatus: { in: toStatuses as string[] } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, leadId: true, toStatus: true, createdAt: true },
    });
    return rows.map((r) => ({
      id: r.id,
      leadId: r.leadId,
      toStatus: parseLeadStatus(r.toStatus),
      createdAt: r.createdAt,
    }));
  }
}

export const statusHistoryRepository = new StatusHistoryRepository();
