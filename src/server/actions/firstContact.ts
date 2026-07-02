"use server";
/**
 * CRM Server Actions for the manual "Erstkontakt per E-Mail" flow.
 *
 * Sends the transactional `lead_upload_request_email` template via Resend to
 * imported/existing leads — never automatically, always operator-triggered,
 * and guarded against double-sends by AutomationService.sendFirstContact.
 */
import { z } from "zod";

import { revalidatePath } from "next/cache";

import { ValidationError } from "../errors";
import { automationService } from "../services/AutomationService";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { requirePermission, runAction, type Result } from "./_helpers";

const SingleSchema = z.object({ leadId: z.string().min(1) });
const BatchSchema = z.object({
  leadIds: z.array(z.string().min(1)).min(1).max(200),
});

export async function sendFirstContactEmail(
  raw: unknown,
): Promise<Result<{ status: string }>> {
  return runAction(async () => {
    const parsed = SingleSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Invalid payload");
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const log = await automationService.sendFirstContact(
      parsed.data.leadId,
      actor.id,
    );
    revalidatePath(`/crm/leads/${parsed.data.leadId}`);
    return { status: log.status };
  });
}

export async function sendFirstContactBatch(
  raw: unknown,
): Promise<Result<{ sent: number; skipped: number; failed: number }>> {
  return runAction(async () => {
    const parsed = BatchSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Invalid payload");
    const actor = await requirePermission("canManageLeads");

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const leadId of parsed.data.leadIds) {
      try {
        await assertLeadScopeForActor(actor, leadId);
        const log = await automationService.sendFirstContact(leadId, actor.id);
        if (log.status === "SENT") sent += 1;
        else if (log.status === "FAILED") failed += 1;
        else skipped += 1;
      } catch {
        failed += 1;
      }
    }

    revalidatePath("/crm/leads");
    return { sent, skipped, failed };
  });
}
