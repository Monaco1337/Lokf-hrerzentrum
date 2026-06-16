/**
 * CallLogRepository — append-only call documentation per lead.
 *
 * Every conversation, every attempt to reach the lead, every callback gets
 * its own row. No update/delete on the application layer — corrections are
 * additive new rows.
 */
import type { CallLog as CallLogRow, Prisma } from "@prisma/client";

import {
  type CallLogEntry,
  type CallOutcome,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { parseCallOutcome } from "./types";
import { rowToUserRef } from "./UserRepository";

type RowWithUser = CallLogRow & {
  user: { id: string; name: string; role: string; avatar: string | null };
};

function rowToEntry(row: RowWithUser): CallLogEntry {
  return {
    id: row.id,
    leadId: row.leadId,
    user: rowToUserRef(row.user),
    outcome: parseCallOutcome(row.outcome),
    note: row.note,
    nextStep: row.nextStep,
    callbackAt: row.callbackAt,
    durationSeconds: row.durationSeconds,
    createdAt: row.createdAt,
  };
}

export interface CreateCallLogInput {
  leadId: string;
  userId: string;
  outcome: CallOutcome;
  note: string | null;
  nextStep: string | null;
  callbackAt: Date | null;
  durationSeconds: number | null;
}

export class CallLogRepository {
  async create(
    input: CreateCallLogInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CallLogEntry> {
    const client = tx ?? prisma;
    const row = await client.callLog.create({
      data: {
        leadId: input.leadId,
        userId: input.userId,
        outcome: input.outcome,
        note: input.note,
        nextStep: input.nextStep,
        callbackAt: input.callbackAt,
        durationSeconds: input.durationSeconds,
      },
      include: {
        user: { select: { id: true, name: true, role: true, avatar: true } },
      },
    });
    return rowToEntry(row as RowWithUser);
  }

  async listForLead(leadId: string): Promise<CallLogEntry[]> {
    const rows = await prisma.callLog.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, role: true, avatar: true } },
      },
    });
    return rows.map((r) => rowToEntry(r as RowWithUser));
  }

  /** Counter for "Anrufe heute / diese Woche" — global, not per-lead. */
  async countSince(at: Date): Promise<number> {
    return prisma.callLog.count({ where: { createdAt: { gte: at } } });
  }

  /** Top N users by call volume in a window — drives "Top-Vertriebspartner". */
  async topUsersSince(
    at: Date,
    limit = 5,
  ): Promise<Array<{ userId: string; callCount: number }>> {
    const rows = await prisma.callLog.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: at } },
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: limit,
    });
    return rows.map((r) => ({ userId: r.userId, callCount: r._count._all }));
  }
}

export const callLogRepository = new CallLogRepository();
