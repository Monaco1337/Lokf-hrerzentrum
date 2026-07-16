/**
 * WorkflowBackfillService — controlled, one-time reprocessing of inbound replies
 * that were never classified by the KI-Antwort-Router (e.g. answers that arrived
 * before the router was live).
 *
 * Two phases, both safe:
 *   • preview() — read-only. Scans the reactivation cohort, predicts the router
 *     category for every UNCLASSIFIED reply (deterministic, no LLM, no send) and
 *     returns a per-category summary + samples so the operator sees exactly what
 *     WOULD happen before anything runs.
 *   • run()     — routes each eligible reply through the real engine
 *     (`onInbound`). The engine's per-step dedup guarantees no duplicate
 *     follow-up, and eligibility is gated on `replyIntent === null`, so a lead
 *     that was already classified (live or a previous backfill) is never touched
 *     again. Opted-out / manually-handled / completed chats are always skipped.
 */
import { AuditAction, CONTACT_BLOCKING_STATES } from "@/features/fairtrain-funnel/types";
import {
  ROUTER_PATH_LABEL,
  ROUTER_PATHS,
  type WorkflowRouterPath,
} from "@/features/fairtrain-funnel/automation/workflow/graph";
import { isWorkflowEngineEnabled } from "@/server/env";

import { auditLogService } from "../AuditLogService";
import type { EmploymentReplyInput } from "../EmploymentReplyClassifier";
import { analyzeReply } from "../ReplyIntentClassifier";
import { pathForAnalysis } from "./pathMapping";
import { communicationRepository } from "../../repositories/CommunicationRepository";
import { leadRepository } from "../../repositories/LeadRepository";
import { workflowDefinitionRepository } from "../../repositories/WorkflowDefinitionRepository";

type Scope = "reactivation" | "all";

interface EligibleLead {
  id: string;
  name: string;
  input: EmploymentReplyInput;
  body: string;
  at: Date;
  inboundKey: string;
}

export interface WorkflowBackfillSample {
  leadId: string;
  name: string;
  message: string;
  path: WorkflowRouterPath;
  pathLabel: string;
}

export interface WorkflowBackfillPreview {
  engineEnabled: boolean;
  hasActiveRouter: boolean;
  scanned: number;
  eligible: number;
  skipped: number;
  byCategory: Record<WorkflowRouterPath, number>;
  samples: WorkflowBackfillSample[];
}

export interface WorkflowBackfillResult {
  eligible: number;
  processed: number;
  manualReview: number;
  skipped: number;
  errors: number;
  byCategory: Record<WorkflowRouterPath, number>;
}

function emptyByCategory(): Record<WorkflowRouterPath, number> {
  const rec = {} as Record<WorkflowRouterPath, number>;
  for (const p of ROUTER_PATHS) rec[p] = 0;
  return rec;
}

export class WorkflowBackfillService {
  private async candidateIds(scope: Scope, limit: number): Promise<string[]> {
    return scope === "all"
      ? leadRepository.idsWithWhatsappReply(limit)
      : leadRepository.idsForReactivationReprocessing(limit);
  }

  private async hasActiveRouter(): Promise<boolean> {
    const [inbound, reactivation] = await Promise.all([
      workflowDefinitionRepository.firstActiveByProcess("inbound_router"),
      workflowDefinitionRepository.firstActiveByProcess("reactivation"),
    ]);
    return !!inbound || !!reactivation;
  }

  /** Read-only prediction of what the backfill would do. Never sends anything. */
  async preview(opts: { scope?: Scope; limit?: number } = {}): Promise<WorkflowBackfillPreview> {
    const scope = opts.scope ?? "reactivation";
    const limit = opts.limit ?? 5000;
    const [ids, hasActiveRouter] = await Promise.all([
      this.candidateIds(scope, limit),
      this.hasActiveRouter(),
    ]);

    const byCategory = emptyByCategory();
    const samples: WorkflowBackfillSample[] = [];
    let eligible = 0;
    let skipped = 0;

    for (const id of ids) {
      const lead = await this.resolveEligible(id);
      if (!lead) {
        skipped += 1;
        continue;
      }
      const path = pathForAnalysis(analyzeReply(lead.input));
      byCategory[path] += 1;
      eligible += 1;
      if (samples.length < 8) {
        samples.push({
          leadId: lead.id,
          name: lead.name,
          message: lead.body.slice(0, 140),
          path,
          pathLabel: ROUTER_PATH_LABEL[path],
        });
      }
    }

    return {
      engineEnabled: isWorkflowEngineEnabled(),
      hasActiveRouter,
      scanned: ids.length,
      eligible,
      skipped,
      byCategory,
      samples,
    };
  }

  /** Route every eligible unclassified reply through the real engine. */
  async run(opts: { actor: string; scope?: Scope; limit?: number }): Promise<WorkflowBackfillResult> {
    const scope = opts.scope ?? "reactivation";
    const limit = opts.limit ?? 5000;
    const ids = await this.candidateIds(scope, limit);
    const byCategory = emptyByCategory();
    const result: WorkflowBackfillResult = {
      eligible: 0,
      processed: 0,
      manualReview: 0,
      skipped: 0,
      errors: 0,
      byCategory,
    };

    const { workflowEngine } = await import("./WorkflowEngine");

    for (const id of ids) {
      try {
        const lead = await this.resolveEligible(id);
        if (!lead) {
          result.skipped += 1;
          continue;
        }
        result.eligible += 1;
        const res = await workflowEngine.onInbound(lead.id, lead.input, {
          at: lead.at,
          inboundKey: lead.inboundKey,
        });
        if (res.handled && res.path) {
          result.processed += 1;
          byCategory[res.path] += 1;
          if (res.path === "unclear") result.manualReview += 1;
        } else {
          // Engine could not route (no active workflow / router) → left for a
          // human; never silently sent anything.
          result.skipped += 1;
        }
      } catch (err) {
        result.errors += 1;
        // eslint-disable-next-line no-console
        console.error("[workflow-backfill] lead failed", { leadId: id, err });
      }
    }

    await auditLogService.append({
      actor: opts.actor,
      action: AuditAction.WHATSAPP_REPLIES_BACKFILL,
      entityType: "System",
      entityId: "workflow-router-backfill",
      details: { scope, ...result },
    });

    return result;
  }

  /**
   * Load a lead and return its unclassified reply, or null if it must be
   * skipped (already classified, opted out, manually handled, completed, or no
   * stored reply text to analyse).
   */
  private async resolveEligible(id: string): Promise<EligibleLead | null> {
    const lead = await leadRepository.findById(id);
    if (!lead) return null;
    // Already classified by the router (live or a previous backfill) → never
    // touch again. This is the core "nur nicht klassifizierte Antworten" gate.
    if (lead.replyIntent) return null;
    if (lead.optOut) return null;
    if (lead.campaignCompleted) return null;
    if (lead.reactivationExcluded) return null;
    if (lead.lastManualContactAt) return null;
    if (CONTACT_BLOCKING_STATES.has(lead.contactState)) return null;

    let body = (lead.lastInboundMessage ?? "").trim();
    let at = lead.lastInboundMessageAt ?? lead.lastWhatsappReplyAt ?? new Date();
    if (!body) {
      const latest = await communicationRepository.latestInboundWhatsapp(id);
      if (latest) {
        body = latest.body.trim();
        at = latest.at;
      }
    }
    if (!body) return null;

    const name =
      `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || lead.phone || id;
    return {
      id,
      name,
      input: { body },
      body,
      at,
      inboundKey: `backfill:${id}:${at.getTime()}`,
    };
  }
}

export const workflowBackfillService = new WorkflowBackfillService();
