"use server";
/**
 * assignLead — assign a lead to a user (or clear the assignment).
 * Requires `canAssignLeads`. Emits LEAD_ASSIGNED / LEAD_UNASSIGNED audit.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { AuditAction } from "@/features/fairtrain-funnel/types";

import { NotFoundError, ValidationError } from "../errors";
import { leadRepository } from "../repositories/LeadRepository";
import { userRepository } from "../repositories/UserRepository";
import { auditLogService } from "../services/AuditLogService";
import { campaignStopService } from "../services/CampaignStopService";
import { requirePermission, runAction, type Result } from "./_helpers";

const InputSchema = z.object({
  leadId: z.string().min(1),
  /** Null clears the assignment. */
  userId: z.string().min(1).nullable(),
});

export async function assignLead(
  raw: unknown,
): Promise<Result<{ leadId: string; userId: string | null }>> {
  return runAction(async () => {
    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid assign payload", {
        issues: parsed.error.issues,
      });
    }
    const actor = await requirePermission("canAssignLeads");

    const lead = await leadRepository.findById(parsed.data.leadId);
    if (!lead) throw new NotFoundError("Lead", parsed.data.leadId);

    let targetName: string | null = null;
    if (parsed.data.userId) {
      const target = await userRepository.findRefById(parsed.data.userId);
      if (!target) throw new NotFoundError("User", parsed.data.userId);
      targetName = target.name;
    }

    const now = parsed.data.userId ? new Date() : null;
    await leadRepository.update(parsed.data.leadId, {
      assignedToId: parsed.data.userId,
      assignedTo: targetName,
      assignedById: actor.id,
      assignedAt: now,
    });

    await auditLogService.append({
      actor: actor.id,
      action: parsed.data.userId
        ? AuditAction.LEAD_ASSIGNED
        : AuditAction.LEAD_UNASSIGNED,
      entityType: "Lead",
      entityId: parsed.data.leadId,
      details: {
        from: lead.assignedToId ?? null,
        to: parsed.data.userId ?? null,
      },
    });

    // Manual takeover of an active reactivation lead stops the campaign
    // (no automatic follow-ups after a human took over).
    if (parsed.data.userId) {
      await campaignStopService.stop(
        parsed.data.leadId,
        "manual_takeover",
        "reagiert",
      );
    }

    revalidatePath(`/crm/leads/${parsed.data.leadId}`);
    revalidatePath("/crm/leads");
    revalidatePath("/crm");
    return { leadId: parsed.data.leadId, userId: parsed.data.userId };
  });
}
