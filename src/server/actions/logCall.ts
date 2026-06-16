"use server";
/**
 * logCall — document a call attempt / conversation against a lead.
 *
 * Side effects (besides the append):
 *   - If `outcome` carries a follow-up implication (CALLBACK_SCHEDULED,
 *     APPOINTMENT_SET) and a `callbackAt` is provided, the lead's
 *     `nextFollowUpAt` is updated too.
 *   - Every call yields an AuditAction.CALL_LOGGED entry.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AuditAction,
  CallOutcomeSchema,
} from "@/features/fairtrain-funnel/types";

import { ValidationError } from "../errors";
import { callLogRepository } from "../repositories/CallLogRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { auditLogService } from "../services/AuditLogService";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { requirePermission, runAction, type Result } from "./_helpers";

const InputSchema = z.object({
  leadId: z.string().min(1),
  outcome: CallOutcomeSchema,
  note: z.string().trim().max(2000).optional().or(z.literal("")),
  nextStep: z.string().trim().max(500).optional().or(z.literal("")),
  callbackAt: z
    .string()
    .datetime()
    .optional()
    .or(z.literal("")),
  durationSeconds: z.coerce.number().int().min(0).max(86400).optional(),
});

export async function logCall(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Anruf-Daten", {
        issues: parsed.error.issues,
      });
    }
    const actor = await requirePermission("canTrackCalls");
    await assertLeadScopeForActor(actor, parsed.data.leadId);

    const callbackAt =
      parsed.data.callbackAt && parsed.data.callbackAt !== ""
        ? new Date(parsed.data.callbackAt)
        : null;

    const created = await callLogRepository.create({
      leadId: parsed.data.leadId,
      userId: actor.id,
      outcome: parsed.data.outcome,
      note:
        parsed.data.note && parsed.data.note !== "" ? parsed.data.note : null,
      nextStep:
        parsed.data.nextStep && parsed.data.nextStep !== ""
          ? parsed.data.nextStep
          : null,
      callbackAt,
      durationSeconds: parsed.data.durationSeconds ?? null,
    });

    // Sync nextFollowUpAt when a callback is scheduled.
    if (
      callbackAt &&
      (parsed.data.outcome === "CALLBACK_SCHEDULED" ||
        parsed.data.outcome === "APPOINTMENT_SET")
    ) {
      await leadRepository.update(parsed.data.leadId, {
        nextFollowUpAt: callbackAt,
      });
    }

    await auditLogService.append({
      actor: actor.id,
      action: AuditAction.CALL_LOGGED,
      entityType: "Lead",
      entityId: parsed.data.leadId,
      details: {
        outcome: parsed.data.outcome,
        callbackAt: callbackAt?.toISOString() ?? null,
      },
    });

    revalidatePath(`/crm/leads/${parsed.data.leadId}`);
    revalidatePath("/crm/leads");
    revalidatePath("/crm");
    return { id: created.id };
  });
}
