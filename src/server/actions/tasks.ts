"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  TaskPrioritySchema,
  TaskStatusSchema,
} from "@/features/fairtrain-funnel/types";

import { ValidationError } from "../errors";
import { auditLogRepository } from "../repositories/AuditLogRepository";
import { taskRepository } from "../repositories/TaskRepository";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { requirePermission, runAction, type Result } from "./_helpers";

const CreateTaskSchema = z.object({
  title: z.string().min(2).max(180),
  description: z.string().max(2000).optional().nullable(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  leadId: z.string().min(1).optional().nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
});

const UpdateTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(2).max(180).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  leadId: z.string().min(1).optional().nullable(),
  assigneeId: z.string().min(1).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
});

const DeleteTaskSchema = z.object({ id: z.string().min(1) });

function parseDate(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return new Date(v);
}

export async function createTask(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = CreateTaskSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Aufgabe");
    const actor = await requirePermission("canCreateTasks");
    if (parsed.data.leadId) {
      await assertLeadScopeForActor(actor, parsed.data.leadId);
    }
    const task = await taskRepository.create({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      leadId: parsed.data.leadId ?? null,
      assigneeId: parsed.data.assigneeId ?? null,
      dueAt: parseDate(parsed.data.dueAt) ?? null,
      createdById: actor.id,
    });
    await auditLogRepository.append({
      actor: actor.id,
      action: "TASK_CREATED",
      entityType: "Task",
      entityId: task.id,
      details: task.title,
    });
    revalidatePath("/crm/tasks");
    if (task.lead) revalidatePath(`/crm/leads/${task.lead.id}`);
    return { id: task.id };
  });
}

export async function updateTask(raw: unknown): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = UpdateTaskSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Aufgaben-Daten");
    const actor = await requirePermission("canCreateTasks");
    const existing = await taskRepository.findById(parsed.data.id);
    if (!existing) throw new ValidationError("Aufgabe nicht gefunden");
    if (existing.lead) {
      await assertLeadScopeForActor(actor, existing.lead.id);
    }
    if (parsed.data.leadId) {
      await assertLeadScopeForActor(actor, parsed.data.leadId);
    }
    const updated = await taskRepository.update(parsed.data.id, {
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      leadId: parsed.data.leadId,
      assigneeId: parsed.data.assigneeId,
      dueAt: parseDate(parsed.data.dueAt),
    });
    await auditLogRepository.append({
      actor: actor.id,
      action: "TASK_UPDATED",
      entityType: "Task",
      entityId: updated.id,
      details: parsed.data.status ? `→ ${parsed.data.status}` : updated.title,
    });
    revalidatePath("/crm/tasks");
    if (updated.lead) revalidatePath(`/crm/leads/${updated.lead.id}`);
    return { id: updated.id };
  });
}

export async function deleteTask(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = DeleteTaskSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Aufgabe");
    const actor = await requirePermission("canCreateTasks");
    const existing = await taskRepository.findById(parsed.data.id);
    if (!existing) throw new ValidationError("Aufgabe nicht gefunden");
    if (existing.lead) {
      await assertLeadScopeForActor(actor, existing.lead.id);
    }
    await taskRepository.delete(parsed.data.id);
    await auditLogRepository.append({
      actor: actor.id,
      action: "TASK_DELETED",
      entityType: "Task",
      entityId: parsed.data.id,
      details: existing.title,
    });
    revalidatePath("/crm/tasks");
    return { id: parsed.data.id };
  });
}
