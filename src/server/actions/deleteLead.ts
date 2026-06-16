"use server";
/**
 * deleteLead - CRM-only Server Action.
 * Permanently deletes a lead and all attached data. Requires a CRM session.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ValidationError } from "../errors";
import { leadService } from "../services/LeadService";
import { requirePermission, runAction, type Result } from "./_helpers";

const InputSchema = z.object({
  id: z.string().min(1).max(60),
});

export async function deleteLead(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const actor = await requirePermission("canDeleteLeads");
    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid delete payload", {
        issues: parsed.error.issues,
      });
    }

    await leadService.delete(parsed.data.id, actor.id);

    revalidatePath("/crm/leads");
    revalidatePath("/crm");
    return { id: parsed.data.id };
  });
}
