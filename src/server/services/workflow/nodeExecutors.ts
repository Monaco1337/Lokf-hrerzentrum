/**
 * Workflow node executors — the side-effect for each ACTION node. Control-flow
 * nodes (trigger/wait/aiRouter/condition/manualReview/end) are handled by the
 * engine itself; this module only performs "do something" actions and reports
 * the outcome. The engine claims a unique step BEFORE calling us, so every
 * action here runs at most once per run (idempotent → never a double message).
 */
import type { FunnelPhase } from "@/features/fairtrain-funnel/funnelPhase";
import { MessageStatus } from "@/features/fairtrain-funnel/messaging/types";
import type { LeadStatus } from "@/features/fairtrain-funnel/types";
import type { WorkflowNode } from "@/features/fairtrain-funnel/automation/workflow/graph";

import { leadRepository } from "../../repositories/LeadRepository";
import { taskRepository } from "../../repositories/TaskRepository";
import { userRepository } from "../../repositories/UserRepository";
import type { WorkflowRunRecord } from "../../repositories/WorkflowRunRepository";
import { messageLedgerService } from "../MessageLedgerService";

export interface ActionDeps {
  actorId: string;
  /** This run is currently handling a lead's own inbound reply. */
  respondingToInbound: boolean;
}

export interface ActionOutcome {
  ok: boolean;
  detail: Record<string, unknown>;
}

const PRIORITY_MAP: Record<string, "LOW" | "NORMAL" | "HIGH"> = {
  low: "LOW",
  normal: "NORMAL",
  high: "HIGH",
};

/** Perform an action node. Never throws — failures are reported as ok:false. */
export async function executeActionNode(
  run: WorkflowRunRecord,
  node: WorkflowNode,
  deps: ActionDeps,
): Promise<ActionOutcome> {
  try {
    switch (node.kind) {
      case "sendTemplate":
        return await sendTemplate(run, node, deps);
      case "setStatus":
        if (node.status)
          await leadRepository.update(run.leadId, { status: node.status as LeadStatus });
        return ok({ status: node.status });
      case "setFunnelPhase":
        if (node.funnelPhase)
          await leadRepository.update(run.leadId, {
            funnelPhase: node.funnelPhase as FunnelPhase,
          });
        return ok({ funnelPhase: node.funnelPhase });
      case "addTag":
        return await mutateTags(run.leadId, node.tag, "add");
      case "removeTag":
        return await mutateTags(run.leadId, node.tag, "remove");
      case "changeScore":
        return await changeScore(run.leadId, node.score);
      case "assignOwner":
        return await assignOwner(run.leadId, node.ownerId);
      case "createTask":
        return await createTask(run.leadId, node, deps.actorId);
      case "notify":
        return await createTask(run.leadId, { ...node, taskTitle: node.note ?? "Interne Benachrichtigung" }, deps.actorId);
      default:
        return ok({ noop: node.kind });
    }
  } catch (err) {
    return {
      ok: false,
      detail: { error: err instanceof Error ? err.message : "Aktion fehlgeschlagen" },
    };
  }
}

function ok(detail: Record<string, unknown>): ActionOutcome {
  return { ok: true, detail };
}

async function sendTemplate(
  run: WorkflowRunRecord,
  node: WorkflowNode,
  deps: ActionDeps,
): Promise<ActionOutcome> {
  if (!node.templateId) {
    return { ok: false, detail: { error: "Keine Vorlage ausgewählt" } };
  }
  const entry = await messageLedgerService.sendTemplate({
    leadId: run.leadId,
    templateId: node.templateId,
    actorId: deps.actorId,
    sentBy: "AUTOMATION",
    // Alt-Leads have no explicit WhatsApp consent — reactivation still contacts
    // them (opt-out is NEVER bypassed). Inbound-response sends additionally lift
    // the auto-set automationPaused so the lead gets the answer they asked for.
    bypassConsent: true,
    respondingToInbound: deps.respondingToInbound,
  });
  if (entry.status === MessageStatus.FAILED) {
    return {
      ok: false,
      detail: {
        templateId: node.templateId,
        failedReason: entry.failedReason ?? "Versand fehlgeschlagen",
      },
    };
  }
  return ok({
    templateId: node.templateId,
    providerMessageId: entry.providerMessageId,
  });
}

async function mutateTags(
  leadId: string,
  tag: string | undefined,
  op: "add" | "remove",
): Promise<ActionOutcome> {
  if (!tag) return { ok: false, detail: { error: "Kein Tag angegeben" } };
  const lead = await leadRepository.findById(leadId);
  if (!lead) return { ok: false, detail: { error: "Lead nicht gefunden" } };
  const current = new Set(lead.tags ?? []);
  if (op === "add") current.add(tag);
  else current.delete(tag);
  await leadRepository.update(leadId, { tags: Array.from(current) });
  return ok({ tag, op });
}

async function changeScore(
  leadId: string,
  score: number | undefined,
): Promise<ActionOutcome> {
  if (typeof score !== "number") {
    return { ok: false, detail: { error: "Kein Score angegeben" } };
  }
  await leadRepository.update(leadId, { leadScore: score });
  return ok({ leadScore: score });
}

async function assignOwner(
  leadId: string,
  ownerId: string | undefined,
): Promise<ActionOutcome> {
  if (!ownerId) return { ok: false, detail: { error: "Kein Bearbeiter angegeben" } };
  const user = await userRepository.findById(ownerId);
  if (!user) return { ok: false, detail: { error: "Bearbeiter nicht gefunden" } };
  await leadRepository.update(leadId, {
    assignedToId: user.id,
    assignedTo: user.name,
    assignedById: user.id,
    assignedAt: new Date(),
  });
  return ok({ ownerId, ownerName: user.name });
}

async function createTask(
  leadId: string,
  node: WorkflowNode,
  actorId: string,
): Promise<ActionOutcome> {
  const title = node.taskTitle ?? "Aufgabe aus Automation";
  await taskRepository.create({
    title,
    leadId,
    createdById: actorId,
    priority: node.taskPriority ? PRIORITY_MAP[node.taskPriority] : "NORMAL",
    assigneeId: node.ownerId ?? null,
    dueAt: new Date(Date.now() + 24 * 3_600_000),
  });
  return ok({ task: title });
}
