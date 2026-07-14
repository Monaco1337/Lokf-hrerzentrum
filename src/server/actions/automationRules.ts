"use server";
/**
 * Server actions for admin-managed automation rules (CRUD + simulation).
 * Rules never send external messages — `simulate` runs the engine in demo mode.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AuditAction,
  AutomationTriggerSchema,
  ConditionLogicSchema,
  RuleActionSchema,
  RuleConditionSchema,
  RuleStatusSchema,
  RunModeSchema,
  type WorkflowSimulationResult,
} from "@/features/fairtrain-funnel/types";

import { ValidationError } from "../errors";
import { automationRuleRepository } from "../repositories/AutomationRuleRepository";
import { auditLogRepository } from "../repositories/AuditLogRepository";
import { automationRuleEngine } from "../services/AutomationRuleEngine";
import {
  whatsAppReplyClassificationService,
  type BackfillSummary,
} from "../services/WhatsAppReplyClassificationService";
import { requirePermission, runAction, type Result } from "./_helpers";

const RuleBodySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().optional(),
  trigger: AutomationTriggerSchema,
  conditions: z.array(RuleConditionSchema).max(20),
  conditionLogic: ConditionLogicSchema.default("all"),
  actions: z.array(RuleActionSchema).min(1).max(20),
  status: RuleStatusSchema.default("draft"),
  runMode: RunModeSchema.default("demo"),
});

export async function createAutomationRule(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = RuleBodySchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Regel-Daten");
    const actor = await requirePermission("canManageAutomations");
    const d = parsed.data;
    const rule = await automationRuleRepository.create({
      name: d.name,
      description: d.description ?? null,
      trigger: d.trigger,
      conditions: d.conditions,
      conditionLogic: d.conditionLogic,
      actions: d.actions,
      status: d.status,
      runMode: d.runMode,
    });
    await auditLogRepository.append({
      actor: actor.id,
      action: AuditAction.AUTOMATION_RULE_CREATED,
      entityType: "AutomationRule",
      entityId: rule.id,
      details: JSON.stringify({ name: rule.name, trigger: rule.trigger }),
    });
    revalidatePath("/crm/automation");
    return { id: rule.id };
  });
}

const UpdateRuleSchema = RuleBodySchema.partial().extend({
  id: z.string().min(1),
});

export async function updateAutomationRule(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = UpdateRuleSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Regel-Daten");
    const actor = await requirePermission("canManageAutomations");
    const { id, ...rest } = parsed.data;
    const rule = await automationRuleRepository.update(id, {
      ...(rest.name !== undefined ? { name: rest.name } : {}),
      ...(rest.description !== undefined ? { description: rest.description ?? null } : {}),
      ...(rest.trigger !== undefined ? { trigger: rest.trigger } : {}),
      ...(rest.conditions !== undefined ? { conditions: rest.conditions } : {}),
      ...(rest.conditionLogic !== undefined
        ? { conditionLogic: rest.conditionLogic }
        : {}),
      ...(rest.actions !== undefined ? { actions: rest.actions } : {}),
      ...(rest.status !== undefined ? { status: rest.status } : {}),
      ...(rest.runMode !== undefined ? { runMode: rest.runMode } : {}),
    });
    await auditLogRepository.append({
      actor: actor.id,
      action: AuditAction.AUTOMATION_RULE_UPDATED,
      entityType: "AutomationRule",
      entityId: rule.id,
      details: JSON.stringify({ name: rule.name, status: rule.status }),
    });
    revalidatePath("/crm/automation");
    return { id: rule.id };
  });
}

const SetStatusSchema = z.object({
  id: z.string().min(1),
  status: RuleStatusSchema,
});

export async function setAutomationRuleStatus(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = SetStatusSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültiger Status");
    const actor = await requirePermission("canManageAutomations");
    const rule = await automationRuleRepository.update(parsed.data.id, {
      status: parsed.data.status,
    });
    await auditLogRepository.append({
      actor: actor.id,
      action: AuditAction.AUTOMATION_RULE_UPDATED,
      entityType: "AutomationRule",
      entityId: rule.id,
      details: JSON.stringify({ status: rule.status }),
    });
    revalidatePath("/crm/automation");
    return { id: rule.id };
  });
}

const RuleIdSchema = z.object({ id: z.string().min(1) });

export async function deleteAutomationRule(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = RuleIdSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Anfrage");
    const actor = await requirePermission("canManageAutomations");
    await automationRuleRepository.delete(parsed.data.id);
    await auditLogRepository.append({
      actor: actor.id,
      action: AuditAction.AUTOMATION_RULE_DELETED,
      entityType: "AutomationRule",
      entityId: parsed.data.id,
      details: JSON.stringify({}),
    });
    revalidatePath("/crm/automation");
    return { id: parsed.data.id };
  });
}

const SimulateSchema = z.object({
  ruleId: z.string().min(1),
  leadId: z.string().min(1),
});

export async function simulateAutomationRule(
  raw: unknown,
): Promise<Result<{ runId: string; status: string; summary: string }>> {
  return runAction(async () => {
    const parsed = SimulateSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Anfrage");
    const actor = await requirePermission("canManageAutomations");
    const run = await automationRuleEngine.simulate(
      parsed.data.ruleId,
      parsed.data.leadId,
      actor.id,
    );
    revalidatePath("/crm/automation");
    return { runId: run.id, status: run.status, summary: run.summary };
  });
}

const BackfillSchema = z.object({
  limit: z.number().int().min(1).max(10000).optional(),
});

/**
 * Retro/backfill: process every already-received WhatsApp reply that was never
 * classified — classify (Quick-Reply + free text), set situation tags + funnel
 * phase, and start the matching follow-up automation. Idempotent: leads that
 * already carry a situation tag are skipped, so no message is ever sent twice.
 * Afterwards the system continues in normal live mode automatically.
 */
export async function backfillWhatsappReplies(
  raw: unknown,
): Promise<Result<BackfillSummary>> {
  return runAction(async () => {
    const parsed = BackfillSchema.safeParse(raw ?? {});
    if (!parsed.success) throw new ValidationError("Ungültige Anfrage");
    const actor = await requirePermission("canManageAutomations");
    const summary = await whatsAppReplyClassificationService.backfillUnprocessedReplies({
      actor: actor.id,
      ...(parsed.data.limit === undefined ? {} : { limit: parsed.data.limit }),
    });
    revalidatePath("/crm/automation");
    revalidatePath("/crm/multichat");
    revalidatePath("/crm");
    return summary;
  });
}

const DraftSimulateSchema = z.object({
  leadId: z.string().min(1),
  trigger: AutomationTriggerSchema,
  conditions: z.array(RuleConditionSchema).max(20),
  conditionLogic: ConditionLogicSchema.default("all"),
  actions: z.array(RuleActionSchema).max(20),
});

/**
 * Testmodus: dry-run an unsaved workflow draft. Read-only — no persistence, no
 * mutations, no outbound messages. Returns a full step-by-step trace.
 */
export async function simulateWorkflowDraft(
  raw: unknown,
): Promise<Result<WorkflowSimulationResult>> {
  return runAction(async () => {
    const parsed = DraftSimulateSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Simulationsdaten");
    await requirePermission("canManageAutomations");
    return automationRuleEngine.traceDraft(
      {
        trigger: parsed.data.trigger,
        conditions: parsed.data.conditions,
        conditionLogic: parsed.data.conditionLogic,
        actions: parsed.data.actions,
      },
      parsed.data.leadId,
    );
  });
}
