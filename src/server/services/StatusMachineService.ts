/**
 * StatusMachineService.
 *
 * Validates transitions against the matrix and persists Lead.status +
 * StatusHistory atomically in a Prisma transaction.
 */
import {
  ALLOWED_TRANSITIONS,
  isTerminal,
  isTransitionAllowed,
  PIPELINE_RANK,
} from "@/features/fairtrain-funnel/statusMachine";
import {
  AuditAction,
  LeadStatus,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { IllegalTransitionError, NotFoundError } from "../errors";
import { auditLogRepository } from "../repositories/AuditLogRepository";
import {
  leadRepository,
  type UpdateLeadFields,
} from "../repositories/LeadRepository";
import { statusHistoryRepository } from "../repositories/StatusHistoryRepository";
import { parseLeadStatus } from "../repositories/types";

export interface TransitionInput {
  leadId: string;
  toStatus: LeadStatus;
  actor: string;
  reason: string | null;
  /** Marks an admin override; AuditLog records STATUS_OVERRIDE. */
  override?: boolean;
}

export class StatusMachineService {
  /**
   * Initial transition for a freshly-created lead. Used during submitLead
   * inside an outer transaction. The from-status is null because no prior
   * status exists yet.
   */
  async recordInitial(
    leadId: string,
    toStatus: LeadStatus,
    actor: string,
    tx: Parameters<typeof leadRepository.update>[2],
  ): Promise<void> {
    if (!tx) {
      throw new Error("recordInitial requires an active transaction");
    }
    await statusHistoryRepository.append(
      {
        leadId,
        fromStatus: null,
        toStatus,
        changedBy: actor,
        reason: "initial submission",
      },
      tx,
    );
  }

  async transition(input: TransitionInput): Promise<LeadStatus> {
    const lead = await leadRepository.findById(input.leadId);
    if (!lead) throw new NotFoundError("Lead", input.leadId);

    const from = parseLeadStatus(lead.status);
    if (!isTransitionAllowed(from, input.toStatus) && !input.override) {
      throw new IllegalTransitionError(from, input.toStatus);
    }

    await prisma.$transaction(async (tx) => {
      const updateFields: UpdateLeadFields = { status: input.toStatus };
      await leadRepository.update(input.leadId, updateFields, tx);
      await statusHistoryRepository.append(
        {
          leadId: input.leadId,
          fromStatus: from,
          toStatus: input.toStatus,
          changedBy: input.actor,
          reason: input.reason,
        },
        tx,
      );
      // Always record the transition itself in the audit feed so the Live-
      // Activities stream shows every drag-&-drop and override side-by-side.
      await auditLogRepository.append(
        {
          actor: input.actor,
          action: input.override
            ? AuditAction.STATUS_OVERRIDE
            : AuditAction.STATUS_CHANGED,
          entityType: "Lead",
          entityId: input.leadId,
          details: JSON.stringify({
            from,
            to: input.toStatus,
            reason: input.reason,
          }),
        },
        tx,
      );
    });

    // Fire automatic side-effects (Task, Follow-up, Doc-slots) outside the
    // critical transaction so a slow audit insert can't block the status
    // change.  Failures inside the engine are logged and swallowed.
    try {
      const { leadWorkflowEngine } = await import("./LeadWorkflowEngine");
      await leadWorkflowEngine.apply({
        leadId: input.leadId,
        fromStatus: from,
        toStatus: input.toStatus,
        actor: input.actor,
      });
    } catch {
      /* engine handles its own logging */
    }

    return input.toStatus;
  }

  allowedNextFor(status: LeadStatus): ReadonlyArray<LeadStatus> {
    return ALLOWED_TRANSITIONS[status];
  }

  /**
   * Auto-advance a lead FORWARD on a real engagement signal (we contacted them
   * via WhatsApp, or they replied). This is what keeps the Leitstand honest:
   * once a HOT lead is actually messaged, it must leave "Hot offen" and enter
   * the pipeline.
   *
   * Guarantees:
   *  - never regresses (only moves to a strictly higher pipeline rank),
   *  - never touches terminal leads (CLOSED/LOST/REJECTED/BLOCKED),
   *  - only follows a legal transition (no rule-skipping override),
   *  - is fully best-effort: a failure returns null and NEVER breaks the
   *    caller (message send / inbound webhook must always succeed).
   *
   * Returns the new status when it advanced, or null when it was a no-op.
   */
  async advanceOnEngagement(input: {
    leadId: string;
    target: LeadStatus;
    actor: string;
    reason: string;
  }): Promise<LeadStatus | null> {
    try {
      const lead = await leadRepository.findById(input.leadId);
      if (!lead) return null;
      const from = parseLeadStatus(lead.status);
      if (isTerminal(from)) return null;

      const fromRank = PIPELINE_RANK[from];
      const targetRank = PIPELINE_RANK[input.target];
      if (fromRank === undefined || targetRank === undefined) return null;
      if (fromRank >= targetRank) return null; // already there or further along
      if (!isTransitionAllowed(from, input.target)) return null;

      return await this.transition({
        leadId: input.leadId,
        toStatus: input.target,
        actor: input.actor,
        reason: input.reason,
      });
    } catch {
      // Best-effort: status advancement must never break a message send or an
      // inbound webhook. The next signal will retry the advance.
      return null;
    }
  }

  /**
   * Reconcile historical data: every lead that was provably contacted via
   * WhatsApp (or replied) but is still stuck in a pre-contact status gets
   * advanced to CONTACTED. Idempotent and safe to run repeatedly — a lead that
   * is already contacted/further along is skipped by `advanceOnEngagement`.
   *
   * This is what makes the Leitstand catch up for leads that were messaged
   * BEFORE auto-advance existed (e.g. the current "Hot offen" backlog).
   */
  async reconcileWhatsappContacted(
    limit = 5000,
  ): Promise<{ scanned: number; advanced: number }> {
    const ids = await leadRepository.idsNeedingContactReconcile(limit);
    let advanced = 0;
    for (const id of ids) {
      const result = await this.advanceOnEngagement({
        leadId: id,
        target: LeadStatus.CONTACTED,
        actor: "system-reconcile",
        reason: "Abgleich: WhatsApp-Kontakt bereits erfolgt",
      });
      if (result) advanced += 1;
    }
    return { scanned: ids.length, advanced };
  }
}

export const statusMachineService = new StatusMachineService();
