"use server";
import { revalidatePath } from "next/cache";

import { UpdateStatusSchema } from "@/features/fairtrain-funnel/forms/schemas";
import {
  type LeadStatus,
  LeadStatusSchema,
} from "@/features/fairtrain-funnel/types";

import { ValidationError } from "../errors";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { statusMachineService } from "../services/StatusMachineService";
import { requirePermission, runAction, type Result } from "./_helpers";

export async function updateLeadStatus(
  raw: unknown,
): Promise<Result<{ leadId: string; status: LeadStatus }>> {
  return runAction(async () => {
    const parsed = UpdateStatusSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid status update payload");
    }
    const actor = await requirePermission("canEditLeadStatus");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const toStatus = LeadStatusSchema.parse(parsed.data.toStatus);
    const status = await statusMachineService.transition({
      leadId: parsed.data.leadId,
      toStatus,
      actor: actor.id,
      reason: parsed.data.reason,
      override: parsed.data.override ?? false,
    });
    // Status changes ripple through every operations surface — refresh them
    // all so the dashboard, kanban, follow-ups and tasks reflect the move
    // immediately without a manual reload.
    revalidatePath(`/crm/leads/${parsed.data.leadId}`);
    revalidatePath(`/crm/leads`);
    revalidatePath(`/crm/pipeline`);
    revalidatePath(`/crm`);
    revalidatePath(`/crm/tasks`);
    revalidatePath(`/crm/sales/followups`);
    revalidatePath(`/crm/unterlagen`);
    revalidatePath(`/crm/bildungsgutschein`);
    revalidatePath(`/crm/agenturtermine`);
    return { leadId: parsed.data.leadId, status };
  });
}
