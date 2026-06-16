/**
 * TaskRepository — sole Prisma access point for the Task model.
 *
 * The Task system drives the "Aufgaben" kanban and supplements the call
 * outcomes captured by CallLog. Tasks may be standalone or pinned to a
 * Bewerber (Lead).
 */
import type { Task as PrismaTask, Prisma } from "@prisma/client";

import {
  type TaskPriority,
  TaskPrioritySchema,
  type TaskStatus,
  TaskStatusSchema,
  type TaskSummary,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { rowToUserRef } from "./UserRepository";

type Row = PrismaTask & {
  lead: { id: string; firstName: string; lastName: string } | null;
  assignee: {
    id: string;
    name: string;
    role: string;
    avatar: string | null;
  } | null;
  createdBy: {
    id: string;
    name: string;
    role: string;
    avatar: string | null;
  };
};

const INCLUDE = {
  lead: { select: { id: true, firstName: true, lastName: true } },
  assignee: { select: { id: true, name: true, role: true, avatar: true } },
  createdBy: { select: { id: true, name: true, role: true, avatar: true } },
} as const satisfies Prisma.TaskInclude;

function rowToSummary(row: Row): TaskSummary {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: TaskStatusSchema.parse(row.status),
    priority: TaskPrioritySchema.parse(row.priority),
    dueAt: row.dueAt,
    completedAt: row.completedAt,
    lead: row.lead,
    assignee: row.assignee ? rowToUserRef(row.assignee) : null,
    createdBy: rowToUserRef(row.createdBy),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface CreateTaskInput {
  title: string;
  description?: string | null | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  leadId?: string | null | undefined;
  assigneeId?: string | null | undefined;
  dueAt?: Date | null | undefined;
  createdById: string;
}

export interface UpdateTaskInput {
  title?: string | undefined;
  description?: string | null | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  leadId?: string | null | undefined;
  assigneeId?: string | null | undefined;
  dueAt?: Date | null | undefined;
  completedAt?: Date | null | undefined;
}

export interface ListTaskFilters {
  /** Restrict to tasks assigned to a given user. */
  assigneeId?: string | null;
  /** Restrict to a specific Bewerber. */
  leadId?: string;
  /** Restrict to a single status — used by columns. */
  status?: TaskStatus;
  /** Hide DONE tasks unless explicitly asked for. */
  includeDone?: boolean;
}

export class TaskRepository {
  async create(input: CreateTaskInput): Promise<TaskSummary> {
    const row = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description ?? null,
        status: input.status ?? "OPEN",
        priority: input.priority ?? "NORMAL",
        leadId: input.leadId ?? null,
        assigneeId: input.assigneeId ?? null,
        dueAt: input.dueAt ?? null,
        createdById: input.createdById,
      },
      include: INCLUDE,
    });
    return rowToSummary(row as Row);
  }

  async update(id: string, input: UpdateTaskInput): Promise<TaskSummary> {
    const data: Prisma.TaskUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.status !== undefined) {
      data.status = input.status;
      // When status flips to DONE we stamp completedAt automatically.
      if (input.status === "DONE" && input.completedAt === undefined) {
        data.completedAt = new Date();
      }
      if (input.status !== "DONE" && input.completedAt === undefined) {
        data.completedAt = null;
      }
    }
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.leadId !== undefined) {
      data.lead = input.leadId
        ? { connect: { id: input.leadId } }
        : { disconnect: true };
    }
    if (input.assigneeId !== undefined) {
      data.assignee = input.assigneeId
        ? { connect: { id: input.assigneeId } }
        : { disconnect: true };
    }
    if (input.dueAt !== undefined) data.dueAt = input.dueAt;
    if (input.completedAt !== undefined) data.completedAt = input.completedAt;
    const row = await prisma.task.update({
      where: { id },
      data,
      include: INCLUDE,
    });
    return rowToSummary(row as Row);
  }

  async delete(id: string): Promise<void> {
    await prisma.task.delete({ where: { id } });
  }

  async findById(id: string): Promise<TaskSummary | null> {
    const row = await prisma.task.findUnique({
      where: { id },
      include: INCLUDE,
    });
    return row ? rowToSummary(row as Row) : null;
  }

  async list(filters: ListTaskFilters = {}): Promise<TaskSummary[]> {
    const where: Prisma.TaskWhereInput = {};
    if (filters.assigneeId !== undefined) {
      where.assigneeId = filters.assigneeId;
    }
    if (filters.leadId) where.leadId = filters.leadId;
    if (filters.status) where.status = filters.status;
    if (!filters.includeDone && filters.status === undefined) {
      where.status = { not: "DONE" };
    }
    const rows = await prisma.task.findMany({
      where,
      orderBy: [
        // URGENT/HIGH first via lexicographic mapping below — we sort in JS
        { dueAt: "asc" },
        { createdAt: "desc" },
      ],
      include: INCLUDE,
      take: 500,
    });

    const PRIO_RANK: Record<string, number> = {
      URGENT: 0,
      HIGH: 1,
      NORMAL: 2,
      LOW: 3,
    };
    return (rows as Row[]).map(rowToSummary).sort((a, b) => {
      const pa = PRIO_RANK[a.priority] ?? 99;
      const pb = PRIO_RANK[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      const aDue = a.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
      const bDue = b.dueAt?.getTime() ?? Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }
}

export const taskRepository = new TaskRepository();
