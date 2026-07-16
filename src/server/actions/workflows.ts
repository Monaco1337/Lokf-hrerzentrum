"use server";
/**
 * Server actions for the unified Workflow Engine: CRUD for visual workflow
 * definitions (graph validated with Zod), plus the one-time seed + reactivation
 * migration. UI talks ONLY to these actions (never to services/repositories).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { AuditAction } from "@/features/fairtrain-funnel/types";
import type { WorkflowGraph } from "@/features/fairtrain-funnel/automation/workflow/graph";

import { ValidationError } from "../errors";
import { auditLogRepository } from "../repositories/AuditLogRepository";
import {
  workflowDefinitionRepository,
  type WorkflowStatus,
} from "../repositories/WorkflowDefinitionRepository";
import { workflowSeedService } from "../services/workflow/WorkflowSeedService";
import {
  workflowBackfillService,
  type WorkflowBackfillPreview,
  type WorkflowBackfillResult,
} from "../services/workflow/WorkflowBackfillService";
import { requirePermission, runAction, type Result } from "./_helpers";

const NODE_KINDS = [
  "trigger",
  "sendTemplate",
  "wait",
  "aiRouter",
  "condition",
  "setStatus",
  "setFunnelPhase",
  "addTag",
  "removeTag",
  "changeScore",
  "assignOwner",
  "createTask",
  "notify",
  "manualReview",
  "end",
] as const;

const NodeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(NODE_KINDS),
  x: z.number(),
  y: z.number(),
  label: z.string().max(200).optional(),
  trigger: z.string().optional(),
  templateId: z.string().optional(),
  waitValue: z.number().int().min(1).max(365).optional(),
  waitUnit: z.enum(["minutes", "hours", "days"]).optional(),
  waitRequireNoReply: z.boolean().optional(),
  waitStopIfFunnelStarted: z.boolean().optional(),
  status: z.string().optional(),
  funnelPhase: z.string().optional(),
  tag: z.string().max(64).optional(),
  score: z.number().int().optional(),
  ownerId: z.string().optional(),
  taskTitle: z.string().max(200).optional(),
  taskPriority: z.enum(["low", "normal", "high"]).optional(),
  note: z.string().max(500).optional(),
  conditionType: z.string().optional(),
  conditionValue: z.string().optional(),
});

const EdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  path: z.string().optional(),
  branch: z.enum(["true", "false"]).optional(),
  label: z.string().max(64).optional(),
});

const GraphSchema = z.object({
  nodes: z.array(NodeSchema).max(200),
  edges: z.array(EdgeSchema).max(400),
});

const ProcessKeySchema = z.enum([
  "reactivation",
  "application",
  "inbound_router",
  "custom",
]);
const TriggerSchema = z.enum([
  "MESSAGE_INBOUND",
  "CAMPAIGN_ENROLL",
  "LEAD_CREATED",
  "FUNNEL_STARTED",
  "FUNNEL_COMPLETED",
  "MANUAL",
]);
const StatusSchema = z.enum(["draft", "active", "inactive"]);

const BodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(600).nullable().optional(),
  processKey: ProcessKeySchema,
  trigger: TriggerSchema,
  status: StatusSchema.default("draft"),
  graph: GraphSchema,
});

function toGraph(g: z.infer<typeof GraphSchema>): WorkflowGraph {
  return g as unknown as WorkflowGraph;
}

export async function createWorkflow(raw: unknown): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Workflow-Daten");
    const actor = await requirePermission("canManageAutomations");
    const d = parsed.data;
    const def = await workflowDefinitionRepository.create({
      name: d.name,
      description: d.description ?? null,
      processKey: d.processKey,
      trigger: d.trigger,
      status: d.status,
      graph: toGraph(d.graph),
    });
    await audit(actor.id, AuditAction.AUTOMATION_RULE_CREATED, def.id, {
      name: def.name,
      processKey: def.processKey,
    });
    revalidatePath("/crm/automation");
    return { id: def.id };
  });
}

const UpdateSchema = BodySchema.extend({ id: z.string().min(1) });

export async function updateWorkflow(raw: unknown): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = UpdateSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Workflow-Daten");
    const actor = await requirePermission("canManageAutomations");
    const { id, ...d } = parsed.data;
    const def = await workflowDefinitionRepository.update(id, {
      name: d.name,
      description: d.description ?? null,
      processKey: d.processKey,
      trigger: d.trigger,
      status: d.status,
      graph: toGraph(d.graph),
    });
    await audit(actor.id, AuditAction.AUTOMATION_RULE_UPDATED, def.id, {
      name: def.name,
      status: def.status,
    });
    revalidatePath("/crm/automation");
    return { id: def.id };
  });
}

const SetStatusSchema = z.object({ id: z.string().min(1), status: StatusSchema });

export async function setWorkflowStatus(raw: unknown): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = SetStatusSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültiger Status");
    const actor = await requirePermission("canManageAutomations");
    await workflowDefinitionRepository.setStatus(
      parsed.data.id,
      parsed.data.status as WorkflowStatus,
    );
    await audit(actor.id, AuditAction.AUTOMATION_RULE_UPDATED, parsed.data.id, {
      status: parsed.data.status,
    });
    revalidatePath("/crm/automation");
    return { id: parsed.data.id };
  });
}

const IdSchema = z.object({ id: z.string().min(1) });

export async function deleteWorkflow(raw: unknown): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = IdSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Anfrage");
    const actor = await requirePermission("canManageAutomations");
    await workflowDefinitionRepository.delete(parsed.data.id);
    await audit(actor.id, AuditAction.AUTOMATION_RULE_DELETED, parsed.data.id, {});
    revalidatePath("/crm/automation");
    return { id: parsed.data.id };
  });
}

export async function seedDefaultWorkflows(): Promise<Result<{ created: string[] }>> {
  return runAction(async () => {
    await requirePermission("canManageAutomations");
    const res = await workflowSeedService.ensureDefaults();
    revalidatePath("/crm/automation");
    return res;
  });
}

export async function migrateReactivationToEngine(): Promise<
  Result<{ scanned: number; enrolled: number; continued: number; skipped: number }>
> {
  return runAction(async () => {
    await requirePermission("canManageAutomations");
    const summary = await workflowSeedService.migrateFromCampaign();
    revalidatePath("/crm/automation");
    revalidatePath("/crm");
    return summary;
  });
}

const BackfillSchema = z.object({
  scope: z.enum(["reactivation", "all"]).optional(),
  limit: z.number().int().min(1).max(10000).optional(),
});

/** Read-only: preview how many unclassified replies the router would process. */
export async function previewWorkflowBackfill(
  raw: unknown,
): Promise<Result<WorkflowBackfillPreview>> {
  return runAction(async () => {
    const parsed = BackfillSchema.safeParse(raw ?? {});
    if (!parsed.success) throw new ValidationError("Ungültige Anfrage");
    await requirePermission("canManageAutomations");
    return workflowBackfillService.preview({
      scope: parsed.data.scope ?? "reactivation",
      ...(parsed.data.limit === undefined ? {} : { limit: parsed.data.limit }),
    });
  });
}

/** Route every eligible unclassified reply through the live KI-router. */
export async function runWorkflowBackfill(
  raw: unknown,
): Promise<Result<WorkflowBackfillResult>> {
  return runAction(async () => {
    const parsed = BackfillSchema.safeParse(raw ?? {});
    if (!parsed.success) throw new ValidationError("Ungültige Anfrage");
    const actor = await requirePermission("canManageAutomations");
    const summary = await workflowBackfillService.run({
      actor: actor.id,
      scope: parsed.data.scope ?? "reactivation",
      ...(parsed.data.limit === undefined ? {} : { limit: parsed.data.limit }),
    });
    revalidatePath("/crm/automation");
    revalidatePath("/crm/multichat");
    revalidatePath("/crm");
    return summary;
  });
}

async function audit(
  actorId: string,
  action: AuditAction,
  entityId: string,
  details: Record<string, unknown>,
): Promise<void> {
  await auditLogRepository.append({
    actor: actorId,
    action,
    entityType: "WorkflowDefinition",
    entityId,
    details: JSON.stringify(details),
  });
}
