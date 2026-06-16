/**
 * StatusMachineService.
 *
 * Validates transitions against the matrix and persists Lead.status +
 * StatusHistory atomically in a Prisma transaction.
 */
import {
  ALLOWED_TRANSITIONS,
  isTransitionAllowed,
} from "@/features/fairtrain-funnel/statusMachine";
import {
  AuditAction,
  type LeadStatus,
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
}

export const statusMachineService = new StatusMachineService();
