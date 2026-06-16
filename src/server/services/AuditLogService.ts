/**
 * AuditLogService - thin convenience wrapper around the repository.
 *
 * Every append uses a structured `details` JSON string (no free-form text).
 */
import type {
  AuditAction,
  AuditLogEntry,
} from "@/features/fairtrain-funnel/types";

import type { TransactionClient } from "../db/prisma";
import { auditLogRepository } from "../repositories/AuditLogRepository";

export interface AuditAppend {
  actor: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details?: Readonly<Record<string, unknown>>;
}

export class AuditLogService {
  async append(
    entry: AuditAppend,
    tx?: TransactionClient,
  ): Promise<void> {
    await auditLogRepository.append(
      {
        actor: entry.actor,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details ? JSON.stringify(entry.details) : null,
      },
      tx,
    );
  }

  async listForEntity(
    entityType: string,
    entityId: string,
  ): Promise<AuditLogEntry[]> {
    return auditLogRepository.listForEntity(entityType, entityId);
  }

  async listRecent(opts: { since?: Date; limit?: number } = {}) {
    return auditLogRepository.listRecent(opts);
  }

  async countSince(at: Date): Promise<number> {
    return auditLogRepository.countSince(at);
  }
}

export const auditLogService = new AuditLogService();
