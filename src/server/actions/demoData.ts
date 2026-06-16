"use server";

import { revalidatePath } from "next/cache";

import { requirePermission, runAction, type Result } from "./_helpers";
import { demoDataService } from "../services/DemoDataService";

/**
 * "Demo-Daten laden" — seed the demo dataset. Idempotent: re-running returns
 * the existing count instead of duplicating rows.
 */
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

/**
 * "Demo-Daten zurücksetzen" — remove all demo rows and seed a fresh pristine
 * dataset. Used to revert a demo to its initial state after UI edits.
 */
export async function reseedDemoData(): Promise<Result<{ created: number }>> {
  return runAction(async () => {
    await requirePermission("canManageSettings");
    const result = await demoDataService.reseed();
    revalidatePath("/crm", "layout");
    return result;
  });
}

/** "Demo-Daten entfernen" — hard-delete every demo row. Real data untouched. */
export async function resetDemoData(): Promise<Result<{ removed: number }>> {
  return runAction(async () => {
    await requirePermission("canManageSettings");
    const result = await demoDataService.remove();
    revalidatePath("/crm", "layout");
    return result;
  });
}
