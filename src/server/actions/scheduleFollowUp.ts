"use server";
import { revalidatePath } from "next/cache";

import { ScheduleFollowUpSchema } from "@/features/fairtrain-funnel/forms/schemas";

import { ValidationError } from "../errors";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { leadService } from "../services/LeadService";
import { requirePermission, runAction, type Result } from "./_helpers";

export async function scheduleFollowUp(
  raw: unknown,
): Promise<Result<{ leadId: string; when: string | null }>> {
  return runAction(async () => {
    const parsed = ScheduleFollowUpSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid follow-up payload");
    }
    const actor = await requirePermission("canCreateTasks");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const when = parsed.data.when ? new Date(parsed.data.when) : null;
    await leadService.scheduleFollowUp(parsed.data.leadId, when, actor.id);
    revalidatePath(`/crm/leads/${parsed.data.leadId}`);
    revalidatePath(`/crm/leads`);
    return {
      leadId: parsed.data.leadId,
      when: parsed.data.when,
    };
  });
}
