/**
 * WorkflowEngine — the ONE place a lead is driven through an automation.
 *
 * A lead has at most one live run per process (DB-enforced), and the engine
 * walks a run's graph one node at a time, pausing on `wait` (timed reminder)
 * and `aiRouter` (waiting for the lead's reply). Because every action node is
 * claimed with a unique step key before it fires, a lead only ever gets the ONE
 * next step — never a duplicate, never two conflicting messages.
 *
 * Entry points:
 *   enroll            — put a lead into a workflow (e.g. reactivation release)
 *   onInbound         — route an inbound reply through the AI router
 *   resumeDue         — cron: fire due reminders (skips if the lead reacted)
 *   onFunnelStarted   — funnel start cancels all reactivation/reminder runs
 */
import {
  FUNNEL_PHASE_RANK,
  FunnelPhase,
} from "@/features/fairtrain-funnel/funnelPhase";
import {
  conditionTargetId,
  findNode,
  nextNodeId,
  parseGraph,
  routerTargetId,
  triggerNode,
  type WorkflowGraph,
  type WorkflowNode,
  type WorkflowProcessKey,
  type WorkflowRouterPath,
} from "@/features/fairtrain-funnel/automation/workflow/graph";

import { leadRepository } from "../../repositories/LeadRepository";
import { userRepository } from "../../repositories/UserRepository";
import {
  workflowDefinitionRepository,
  type WorkflowDefinitionRecord,
} from "../../repositories/WorkflowDefinitionRepository";
import {
  workflowRunRepository,
  type WorkflowRunRecord,
} from "../../repositories/WorkflowRunRepository";
import { taskRepository } from "../../repositories/TaskRepository";
import { consentService } from "../ConsentService";
import type { EmploymentReplyInput } from "../EmploymentReplyClassifier";
import { classifyReply, type WorkflowClassification } from "./ReplyClassifier";
import { executeActionNode } from "./nodeExecutors";

const MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const;
const MAX_WALK_STEPS = 100;

interface RunContext {
  respondingToInbound?: boolean;
  lastPath?: WorkflowRouterPath;
  lastIntent?: string;
  lastConfidence?: number;
}

interface EnrollOpts {
  respondingToInbound?: boolean;
}

interface InboundOpts {
  at?: Date;
  /** Stable key (provider message id) so a re-delivered webhook never re-routes. */
  inboundKey?: string;
}

export class WorkflowEngine {
  private cachedActorId: string | null = null;

  private async actorId(): Promise<string> {
    if (this.cachedActorId) return this.cachedActorId;
    const id = await userRepository.findSystemActorId();
    if (!id) throw new Error("Kein System-Benutzer für die Workflow-Engine gefunden.");
    this.cachedActorId = id;
    return id;
  }

  // --- enrollment -----------------------------------------------------------

  /** Enroll a lead into a definition. No-op if a live run already exists. */
  async enroll(
    def: WorkflowDefinitionRecord,
    leadId: string,
    opts?: EnrollOpts,
  ): Promise<string | null> {
    const graph = parseGraph(def.graph);
    const trig = triggerNode(graph);
    const startId = trig ? nextNodeId(graph, trig.id) : graph.nodes[0]?.id ?? null;
    if (!startId) return null;

    const created = await workflowRunRepository.create({
      definitionId: def.id,
      definitionVersion: def.version,
      processKey: def.processKey,
      graphSnapshot: def.graph,
      leadId,
      currentNodeId: startId,
      context: JSON.stringify({ respondingToInbound: !!opts?.respondingToInbound }),
    });
    if (!created) return null; // already live for this process → idempotent

    await this.walk(created, startId);
    return created.id;
  }

  /** Enroll by process key (looks up the first active definition). */
  async enrollByProcess(
    processKey: WorkflowProcessKey,
    leadId: string,
    opts?: EnrollOpts,
  ): Promise<string | null> {
    const def = await workflowDefinitionRepository.firstActiveByProcess(processKey);
    if (!def) return null;
    return this.enroll(def, leadId, opts);
  }

  // --- inbound routing ------------------------------------------------------

  /**
   * Route an inbound reply. Prefers an existing live reactivation/router run
   * (so a reminder sequence and the reply are ONE flow); otherwise enrolls the
   * standalone inbound router. Classifies once, follows exactly one path.
   */
  async onInbound(
    leadId: string,
    reply: EmploymentReplyInput,
    opts?: InboundOpts,
  ): Promise<{ handled: boolean; path?: WorkflowRouterPath }> {
    const at = opts?.at ?? new Date();
    const target = await this.resolveInboundRun(leadId);
    if (!target) return { handled: false };

    const { run, graph, routerNode } = target;
    // Idempotency: one route per inbound message (stable key = provider id).
    const dedupKey = `${run.id}:router:${opts?.inboundKey ?? at.getTime()}`;
    const cls = await classifyReply(reply);
    await this.persistAnalysis(leadId, cls, at);

    const claimed = await workflowRunRepository.claimStep({
      runId: run.id,
      nodeId: routerNode.id,
      kind: "aiRouter",
      dedupKey,
      status: "executed",
      detail: JSON.stringify({ path: cls.path, intent: cls.intent, confidence: cls.confidence }),
    });
    if (!claimed) return { handled: true, path: cls.path };

    const nextId = routerTargetId(graph, routerNode.id, cls.path);
    const context = this.mergeContext(run, {
      respondingToInbound: true,
      lastPath: cls.path,
      lastIntent: cls.intent,
      lastConfidence: cls.confidence,
    });
    await workflowRunRepository.update(run.id, {
      status: "active",
      currentNodeId: nextId,
      resumeAt: null,
      lastInboundAt: at,
      enteredNodeAt: new Date(),
      context,
    });
    const fresh = await workflowRunRepository.findById(run.id);
    if (fresh) await this.walk(fresh, nextId);
    return { handled: true, path: cls.path };
  }

  private async resolveInboundRun(leadId: string): Promise<{
    run: WorkflowRunRecord;
    graph: WorkflowGraph;
    routerNode: WorkflowNode;
  } | null> {
    const live = await workflowRunRepository.listLiveForLead(leadId);
    for (const r of live) {
      if (r.processKey === "application") continue;
      const graph = parseGraph(r.graphSnapshot);
      const routerNode = graph.nodes.find((n) => n.kind === "aiRouter");
      if (routerNode) return { run: r, graph, routerNode };
    }
    // No live engagement run → enroll the standalone inbound router.
    const def = await workflowDefinitionRepository.firstActiveByProcess("inbound_router");
    if (!def) return null;
    const graph = parseGraph(def.graph);
    const routerNode = graph.nodes.find((n) => n.kind === "aiRouter");
    if (!routerNode) return null;
    const created = await workflowRunRepository.create({
      definitionId: def.id,
      definitionVersion: def.version,
      processKey: def.processKey,
      graphSnapshot: def.graph,
      leadId,
      currentNodeId: routerNode.id,
      context: JSON.stringify({ respondingToInbound: true }),
    });
    const run = created ?? (await workflowRunRepository.findLiveForLead(leadId, def.processKey));
    if (!run) return null;
    return { run, graph, routerNode };
  }

  // --- scheduler ------------------------------------------------------------

  /** Fire every due reminder. A lead that reacted/started the funnel is skipped. */
  async resumeDue(now: Date = new Date()): Promise<{ processed: number; advanced: number; stopped: number }> {
    const due = await workflowRunRepository.listDueWaiting(now);
    let advanced = 0;
    let stopped = 0;
    for (const run of due) {
      const outcome = await this.resumeWait(run, now);
      if (outcome === "advanced") advanced += 1;
      else stopped += 1;
    }
    return { processed: due.length, advanced, stopped };
  }

  private async resumeWait(
    run: WorkflowRunRecord,
    now: Date,
  ): Promise<"advanced" | "stopped"> {
    const graph = parseGraph(run.graphSnapshot);
    const node = findNode(graph, run.currentNodeId);
    if (!node || node.kind !== "wait") {
      await workflowRunRepository.finish(run.id, "completed");
      return "stopped";
    }
    const lead = await leadRepository.findById(run.leadId);
    if (!lead) {
      await workflowRunRepository.finish(run.id, "canceled");
      return "stopped";
    }
    // Stop rules: funnel started, or the lead replied while we waited (the
    // inbound handler already routed that reply → don't also send the reminder).
    if (node.waitStopIfFunnelStarted && this.funnelStarted(lead)) {
      await workflowRunRepository.finish(run.id, "completed");
      return "stopped";
    }
    if (
      node.waitRequireNoReply &&
      lead.lastInboundMessageAt &&
      lead.lastInboundMessageAt.getTime() > run.enteredNodeAt.getTime()
    ) {
      await workflowRunRepository.finish(run.id, "completed");
      return "stopped";
    }
    const nextId = nextNodeId(graph, node.id);
    await workflowRunRepository.update(run.id, {
      status: "active",
      currentNodeId: nextId,
      resumeAt: null,
      enteredNodeAt: now,
    });
    const fresh = await workflowRunRepository.findById(run.id);
    if (fresh) await this.walk(fresh, nextId);
    return "advanced";
  }

  // --- funnel cancellation --------------------------------------------------

  /**
   * The lead entered the application funnel → stop every reactivation/reminder
   * run AND cancel any legacy campaign jobs. Only the application process runs
   * on from here. Closes the historic "funnel start didn't stop reactivation" gap.
   */
  async onFunnelStarted(leadId: string): Promise<number> {
    const canceled = await workflowRunRepository.cancelLiveForLead(leadId, [
      "reactivation",
      "inbound_router",
    ]);
    try {
      const { campaignRepository } = await import("../../repositories/CampaignRepository");
      await campaignRepository.cancelQueuedJobsForLead(leadId, "Funnel gestartet");
    } catch {
      // best-effort: legacy queue may be empty
    }
    return canceled;
  }

  // --- graph walk -----------------------------------------------------------

  private async walk(run: WorkflowRunRecord, startNodeId: string | null): Promise<void> {
    const graph = parseGraph(run.graphSnapshot);
    const ctx = this.parseContext(run);
    const actorId = await this.actorId();
    let nodeId: string | null = startNodeId;
    let guard = 0;

    while (nodeId && guard < MAX_WALK_STEPS) {
      guard += 1;
      const node = findNode(graph, nodeId);
      if (!node) break;

      if (node.kind === "end") {
        await workflowRunRepository.finish(run.id, "completed");
        return;
      }
      if (node.kind === "manualReview") {
        await this.markManualReview(run, node, actorId);
        return;
      }
      if (node.kind === "wait") {
        const ms = (node.waitValue ?? 24) * (MS[node.waitUnit ?? "hours"] ?? MS.hours);
        await workflowRunRepository.update(run.id, {
          status: "waiting",
          currentNodeId: node.id,
          resumeAt: new Date(Date.now() + ms),
          enteredNodeAt: new Date(),
        });
        return;
      }
      if (node.kind === "aiRouter") {
        await workflowRunRepository.update(run.id, {
          status: "awaiting_reply",
          currentNodeId: node.id,
          enteredNodeAt: new Date(),
        });
        return;
      }
      if (node.kind === "condition") {
        const branch = (await this.evalCondition(run.leadId, node)) ? "true" : "false";
        nodeId = conditionTargetId(graph, node.id, branch);
        continue;
      }
      if (node.kind === "trigger") {
        nodeId = nextNodeId(graph, node.id);
        continue;
      }

      // Action node: claim (idempotent) then execute at most once.
      const dedupKey = `${run.id}:${node.id}`;
      const claimed = await workflowRunRepository.claimStep({
        runId: run.id,
        nodeId: node.id,
        kind: node.kind,
        dedupKey,
        status: "executed",
      });
      if (claimed) {
        const outcome = await executeActionNode(run, node, {
          actorId,
          respondingToInbound: !!ctx.respondingToInbound,
        });
        if (!outcome.ok) {
          // eslint-disable-next-line no-console
          console.error("[workflow] action failed", { runId: run.id, node: node.id, detail: outcome.detail });
        }
      }
      nodeId = nextNodeId(graph, node.id);
      await workflowRunRepository.update(run.id, {
        status: "active",
        currentNodeId: nodeId,
        enteredNodeAt: new Date(),
      });
    }

    // Ran off the end (or hit the guard) → complete.
    await workflowRunRepository.finish(run.id, "completed");
  }

  // --- helpers --------------------------------------------------------------

  private funnelStarted(lead: { funnelPhase?: string | null }): boolean {
    const phase = lead.funnelPhase as FunnelPhase | undefined;
    if (!phase || phase === FunnelPhase.NONE) return false;
    return (FUNNEL_PHASE_RANK[phase] ?? 0) >= FUNNEL_PHASE_RANK[FunnelPhase.ELIGIBILITY_STARTED];
  }

  /**
   * Ja/Nein conditions store the EXPECTED value in `conditionValue` ("true" /
   * "false", default "true" for nodes saved before this existed) — the raw
   * signal gets negated when the operator picked "Nein". Value-comparison
   * conditions (hasTag/leadStatusEquals/funnelPhaseEquals) use
   * `conditionValue` for the comparison target instead, so they are excluded
   * here.
   */
  private isNegated(node: WorkflowNode): boolean {
    return node.conditionValue === "false";
  }

  private async evalCondition(leadId: string, node: WorkflowNode): Promise<boolean> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) return false;
    switch (node.conditionType) {
      case "funnelStarted":
        return this.isNegated(node) ? !this.funnelStarted(lead) : this.funnelStarted(lead);
      case "hasReplied": {
        const replied = !!lead.lastInboundMessageAt;
        return this.isNegated(node) ? !replied : replied;
      }
      case "hasTag":
        return !!node.conditionValue && (lead.tags ?? []).includes(node.conditionValue);
      case "leadStatusEquals":
        return lead.status === node.conditionValue;
      case "funnelPhaseEquals":
        return lead.funnelPhase === node.conditionValue;
      case "isOptedOut": {
        const optedOut = !!lead.optOut;
        return this.isNegated(node) ? !optedOut : optedOut;
      }
      case "hasWhatsappConsent": {
        const consents = await consentService.currentStates(leadId);
        const granted = consents.find((c) => c.type === "WHATSAPP")?.granted ?? false;
        return this.isNegated(node) ? !granted : granted;
      }
      default:
        return true;
    }
  }

  private async markManualReview(
    run: WorkflowRunRecord,
    node: WorkflowNode,
    actorId: string,
  ): Promise<void> {
    await leadRepository.update(run.leadId, { needsManualReview: true });
    const claimed = await workflowRunRepository.claimStep({
      runId: run.id,
      nodeId: node.id,
      kind: "manualReview",
      dedupKey: `${run.id}:${node.id}`,
      status: "executed",
    });
    if (claimed) {
      await taskRepository.create({
        title: node.taskTitle ?? node.note ?? "Manuelle Prüfung erforderlich (Automation)",
        leadId: run.leadId,
        createdById: actorId,
        priority: "HIGH",
        dueAt: new Date(Date.now() + 12 * 3_600_000),
      });
    }
    await workflowRunRepository.finish(run.id, "manual_review");
  }

  private async persistAnalysis(
    leadId: string,
    cls: WorkflowClassification,
    at: Date,
  ): Promise<void> {
    try {
      await leadRepository.update(leadId, {
        replyInterest: cls.analysis.interest,
        replyIntent: cls.intent,
        replyConfidence: Math.round(cls.confidence * 100),
        needsManualReview: cls.manualReview,
        lastInboundMessage: cls.originalMessage.slice(0, 1000),
        lastInboundMessageAt: at,
      });
    } catch {
      // best-effort analysis persistence
    }
  }

  private parseContext(run: WorkflowRunRecord): RunContext {
    try {
      return JSON.parse(run.context) as RunContext;
    } catch {
      return {};
    }
  }

  private mergeContext(run: WorkflowRunRecord, patch: RunContext): string {
    return JSON.stringify({ ...this.parseContext(run), ...patch });
  }
}

export const workflowEngine = new WorkflowEngine();
