"use server";

import { revalidatePath } from "next/cache";

import { requirePermission, runAction, type Result } from "./_helpers";
import { demoDataService } from "../services/DemoDataService";

/** Seed the demo dataset. Idempotent — re-running returns the existing count. */
export async function seedDemoData(): Promise<
  Result<{ created: number; reused: boolean }>
> {
  return runAction(async () => {
    await requirePermission("canManageSettings");
    const result = await demoDataService.seed();
    revalidatePath("/crm", "layout");
    return result;
  });
}

/** Hard-delete every demo-created entity. Real data is untouched. */
export async function resetDemoData(): Promise<Result<{ removed: number }>> {
  return runAction(async () => {
    await requirePermission("canManageSettings");
    const result = await demoDataService.reset();
    revalidatePath("/crm", "layout");
    return result;
  });
}
