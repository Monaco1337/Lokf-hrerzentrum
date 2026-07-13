"use server";
import { revalidatePath } from "next/cache";

import { statusMachineService } from "../services/StatusMachineService";
import { requirePermission, runAction, type Result } from "./_helpers";

/**
 * Reconcile the pipeline from WhatsApp activity: advance every lead that was
 * already contacted via WhatsApp (or that replied) but is still stuck in a
 * pre-contact status. Idempotent — safe to run repeatedly. Lets an operator
 * catch up the Leitstand for leads messaged before auto-advance existed.
 */
export async function reconcilePipelineFromWhatsapp(): Promise<
  Result<{ scanned: number; advanced: number }>
> {
  return runAction(async () => {
    await requirePermission("canEditLeadStatus");
    const result = await statusMachineService.reconcileWhatsappContacted();

    revalidatePath("/crm");
    revalidatePath("/crm/leads");
    revalidatePath("/crm/pipeline");
    revalidatePath("/crm/sales/followups");
    return result;
  });
}
