/**
 * AutomationRunLogRepository — append-only history of (simulated) rule runs.
 */
import {
  type AutomationRunLogEntry,
  type RunLogStatus,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";

export interface AppendRunLogInput {
  ruleId: string;
  leadId: string | null;
  status: RunLogStatus;
  summary: string;
  detail: AutomationRunLogEntry["detail"];
  isTest?: boolean;
  triggeredBy?: string;
}

interface RunLogRow {
  id: string;
  ruleId: string;
  leadId: string | null;
  status: string;
  summary: string;
  detail: string;
  isTest: boolean;
  triggeredBy: string;
  createdAt: Date;
}

function mapRow(row: RunLogRow): AutomationRunLogEntry {
  let detail: AutomationRunLogEntry["detail"] = {};
  try {
    detail = JSON.parse(row.detail) as AutomationRunLogEntry["detail"];
  } catch {
    detail = {};
  }
  return {
    id: row.id,
    ruleId: row.ruleId,
    leadId: row.leadId,
    status: row.status as RunLogStatus,
    summary: row.summary,
    detail,
    isTest: row.isTest,
    triggeredBy: row.triggeredBy,
    createdAt: row.createdAt,
  };
}

export class AutomationRunLogRepository {
  async append(input: AppendRunLogInput): Promise<AutomationRunLogEntry> {
    const row = await prisma.automationRunLog.create({
      data: {
        ruleId: input.ruleId,
        leadId: input.leadId,
        status: input.status,
        summary: input.summary,
        detail: JSON.stringify(input.detail ?? {}),
        isTest: input.isTest ?? true,
        triggeredBy: input.triggeredBy ?? "system",
      },
    });
    return mapRow(row);
  }

  async listForRule(ruleId: string, limit = 50): Promise<AutomationRunLogEntry[]> {
    const rows = await prisma.automationRunLog.findMany({
      where: { ruleId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapRow);
  }

  async listRecent(limit = 100): Promise<AutomationRunLogEntry[]> {
    const rows = await prisma.automationRunLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapRow);
  }

  async ruleIdsForDemoCleanup(): Promise<string[]> {
    const rows = await prisma.automationRunLog.findMany({ select: { id: true } });
    return rows.map((r) => r.id);
  }
}

export const automationRunLogRepository = new AutomationRunLogRepository();
