"use server";
/**
 * Manual trigger for the SLA sweep (same job the hourly cron runs). Lets an
 * operator reconcile the header numbers (Eskalation/HOT offen) immediately
 * instead of waiting for the next scheduled run.
 */
import { revalidatePath } from "next/cache";

import { slaService, type SlaSweepResult } from "../services/SlaService";
import { requirePermission, runAction, type Result } from "./_helpers";

export async function runSlaSweepNow(): Promise<Result<SlaSweepResult>> {
  return runAction(async () => {
    await requirePermission("canManageLeads");
    const result = await slaService.sweep();
    revalidatePath("/crm");
    return result;
  });
}
