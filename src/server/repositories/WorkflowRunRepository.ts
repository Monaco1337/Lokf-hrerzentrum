/**
 * WorkflowRunRepository — per-lead execution state for the unified engine.
 *
 * A WorkflowRun is a cursor into a graph snapshot. The DB-level guarantees:
 *   - unique (leadId, activeKey): only ONE live run per lead & process, so a
 *     lead can never be driven by two conflicting flows at once.
 *   - WorkflowRunStep.dedupKey unique: a node fires at most once per run, so a
 *     send/action can never happen twice → never a duplicate message.
 */
import { Prisma } from "@prisma/client";

import type { WorkflowProcessKey } from "@/features/fairtrain-funnel/automation/workflow/graph";

import { prisma } from "../db/prisma";

export type WorkflowRunStatus =
  | "active"
  | "waiting"
  | "awaiting_reply"
  | "completed"
  | "canceled"
  | "failed"
  | "manual_review";

const TERMINAL: ReadonlySet<WorkflowRunStatus> = new Set([
  "completed",
  "canceled",
  "failed",
  "manual_review",
]);

export function isTerminalStatus(status: WorkflowRunStatus): boolean {
  return TERMINAL.has(status);
}

export interface WorkflowRunRecord {
  id: string;
  definitionId: string;
  definitionVersion: number;
  processKey: WorkflowProcessKey;
  graphSnapshot: string;
  leadId: string;
  status: WorkflowRunStatus;
  currentNodeId: string | null;
  resumeAt: Date | null;
  enteredNodeAt: Date;
  lastInboundAt: Date | null;
  context: string;
  activeKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Row {
  id: string;
  definitionId: string;
  definitionVersion: number;
  processKey: string;
  graphSnapshot: string;
  leadId: string;
  status: string;
  currentNodeId: string | null;
  resumeAt: Date | null;
  enteredNodeAt: Date;
  lastInboundAt: Date | null;
  context: string;
  activeKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toRecord(row: Row): WorkflowRunRecord {
  return {
    ...row,
    processKey: row.processKey as WorkflowProcessKey,
    status: row.status as WorkflowRunStatus,
  };
}

export interface CreateRunInput {
  definitionId: string;
  definitionVersion: number;
  processKey: WorkflowProcessKey;
  graphSnapshot: string;
  leadId: string;
  currentNodeId: string | null;
  context?: string;
}

export interface UpdateRunInput {
  status?: WorkflowRunStatus;
  currentNodeId?: string | null;
  resumeAt?: Date | null;
  enteredNodeAt?: Date;
  lastInboundAt?: Date | null;
  context?: string;
}

export class WorkflowRunRepository {
  /**
   * Create a run. `activeKey` = processKey enforces the single-live-run lock. If
   * a live run for this lead+process already exists the unique constraint trips
   * (P2002) and we return null — the caller then reuses the existing run.
   */
  async create(input: CreateRunInput): Promise<WorkflowRunRecord | null> {
    try {
      const row = await prisma.workflowRun.create({
        data: {
          definitionId: input.definitionId,
          definitionVersion: input.definitionVersion,
          processKey: input.processKey,
          graphSnapshot: input.graphSnapshot,
          leadId: input.leadId,
          status: "active",
          currentNodeId: input.currentNodeId,
          context: input.context ?? "{}",
          activeKey: input.processKey,
        },
      });
      return toRecord(row);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return null;
      }
      throw err;
    }
  }

  async findById(id: string): Promise<WorkflowRunRecord | null> {
    const row = await prisma.workflowRun.findUnique({ where: { id } });
    return row ? toRecord(row as Row) : null;
  }

  /** The single live run for this lead & process (active/waiting/awaiting). */
  async findLiveForLead(
    leadId: string,
    processKey: WorkflowProcessKey,
  ): Promise<WorkflowRunRecord | null> {
    const row = await prisma.workflowRun.findFirst({
      where: { leadId, activeKey: processKey },
    });
    return row ? toRecord(row as Row) : null;
  }

  /** Every live (non-terminal) run for a lead, newest first. */
  async listLiveForLead(leadId: string): Promise<WorkflowRunRecord[]> {
    const rows = await prisma.workflowRun.findMany({
      where: { leadId, activeKey: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => toRecord(r as Row));
  }

  /** Waiting runs whose reminder is due (resumeAt <= now). */
  async listDueWaiting(now: Date, limit = 200): Promise<WorkflowRunRecord[]> {
    const rows = await prisma.workflowRun.findMany({
      where: { status: "waiting", resumeAt: { lte: now } },
      orderBy: { resumeAt: "asc" },
      take: limit,
    });
    return rows.map((r) => toRecord(r as Row));
  }

  async countDueWaiting(now: Date): Promise<number> {
    return prisma.workflowRun.count({
      where: { status: "waiting", resumeAt: { lte: now } },
    });
  }

  async update(id: string, data: UpdateRunInput): Promise<void> {
    await prisma.workflowRun.update({ where: { id }, data });
  }

  /** Move a run to a terminal state and release its single-run lock. */
  async finish(
    id: string,
    status: Extract<
      WorkflowRunStatus,
      "completed" | "canceled" | "failed" | "manual_review"
    >,
    context?: string,
  ): Promise<void> {
    await prisma.workflowRun.update({
      where: { id },
      data: {
        status,
        activeKey: null,
        resumeAt: null,
        ...(context !== undefined ? { context } : {}),
      },
    });
  }

  /**
   * Cancel every live run of the given processes for a lead (e.g. funnel start
   * cancels all `reactivation`/`inbound_router` runs). Returns the count.
   */
  async cancelLiveForLead(
    leadId: string,
    processKeys: WorkflowProcessKey[],
  ): Promise<number> {
    const res = await prisma.workflowRun.updateMany({
      where: {
        leadId,
        activeKey: { not: null },
        processKey: { in: processKeys },
      },
      data: { status: "canceled", activeKey: null, resumeAt: null },
    });
    return res.count;
  }

  /** How many live runs each definition currently drives (overview counter). */
  async countLiveByDefinition(): Promise<Record<string, number>> {
    const grouped = await prisma.workflowRun.groupBy({
      by: ["definitionId"],
      where: { activeKey: { not: null } },
      _count: { _all: true },
    });
    const out: Record<string, number> = {};
    for (const g of grouped) out[g.definitionId] = g._count._all;
    return out;
  }

  // --- Step ledger (idempotency) --------------------------------------------

  /**
   * Record that a node fired. Returns true if this is the FIRST time (safe to
   * perform the side effect), false if the dedupKey already exists (skip — the
   * node already ran, so we never send/act twice).
   */
  async claimStep(input: {
    runId: string;
    nodeId: string;
    kind: string;
    dedupKey: string;
    status: string;
    detail?: string;
  }): Promise<boolean> {
    try {
      await prisma.workflowRunStep.create({
        data: {
          runId: input.runId,
          nodeId: input.nodeId,
          kind: input.kind,
          dedupKey: input.dedupKey,
          status: input.status,
          detail: input.detail ?? "{}",
        },
      });
      return true;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return false;
      }
      throw err;
    }
  }

  async listSteps(runId: string) {
    return prisma.workflowRunStep.findMany({
      where: { runId },
      orderBy: { createdAt: "asc" },
    });
  }
}

export const workflowRunRepository = new WorkflowRunRepository();
