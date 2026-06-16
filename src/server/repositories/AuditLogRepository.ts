/**
 * AuditLogRepository - APPEND-ONLY.
 *
 * Records every sensitive access, status override, and login attempt.
 */
import type { Prisma } from "@prisma/client";

import type {
  AuditAction,
  AuditLogEntry,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { parseAuditAction } from "./types";

export interface AppendAuditInput {
  actor: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details: string | null;
}

export class AuditLogRepository {
  async append(
    input: AppendAuditInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.auditLog.create({
      data: {
        actor: input.actor,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        details: input.details,
      },
    });
  }

  async listForEntity(
    entityType: string,
    entityId: string,
    limit = 100,
  ): Promise<AuditLogEntry[]> {
    const rows = await prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      actor: r.actor,
      action: parseAuditAction(r.action),
      entityType: r.entityType,
      entityId: r.entityId,
      details: r.details,
      createdAt: r.createdAt,
    }));
  }

  /** Recent activity across all entities — drives dashboard "Aktivitäten heute". */
  async listRecent(opts: {
    since?: Date;
    limit?: number;
  } = {}): Promise<AuditLogEntry[]> {
    const where: Prisma.AuditLogWhereInput = {};
    if (opts.since) where.createdAt = { gte: opts.since };
    const rows = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 50,
    });
    return rows.map((r) => ({
      id: r.id,
      actor: r.actor,
      action: parseAuditAction(r.action),
      entityType: r.entityType,
      entityId: r.entityId,
      details: r.details,
      createdAt: r.createdAt,
    }));
  }

  async countSince(at: Date): Promise<number> {
    return prisma.auditLog.count({ where: { createdAt: { gte: at } } });
  }
}

export const auditLogRepository = new AuditLogRepository();
