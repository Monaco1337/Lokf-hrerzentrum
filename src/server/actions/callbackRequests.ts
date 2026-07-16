"use server";
/**
 * Server actions for the "Rückrufe angefordert" queue (Alt-Lead callbacks
 * detected by the AI in Multichat). See `CallbackRequestService`.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ValidationError } from "../errors";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import {
  callbackRequestService,
  type CallbackNextStep,
} from "../services/CallbackRequestService";
import { requirePermission, runAction, type Result } from "./_helpers";

function revalidateCallbackRequests(leadId?: string): void {
  revalidatePath("/crm/callback-requests");
  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/pipeline");
  if (leadId) revalidatePath(`/crm/leads/${leadId}`);
}

const NEXT_STEPS: ReadonlyArray<CallbackNextStep> = [
  "done",
  "send_eligibility",
  "consultation_required",
  "appointment_scheduled",
];

const ResolveCallbackSchema = z.object({
  leadId: z.string().min(1),
  nextStep: z.enum(["done", "send_eligibility", "consultation_required", "appointment_scheduled"]),
});

/**
 * "Als erledigt markieren" / next-step resolution from the callback-request
 * detail panel. Closes the open request and, for `send_eligibility`, sends
 * the Eignungscheck link via WhatsApp.
 */
export async function resolveCallbackRequest(
  raw: unknown,
): Promise<Result<{ leadId: string }>> {
  return runAction(async () => {
    const parsed = ResolveCallbackSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Auswahl", {
        issues: parsed.error.issues,
      });
    }
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const nextStep = NEXT_STEPS.includes(parsed.data.nextStep)
      ? parsed.data.nextStep
      : "done";
    await callbackRequestService.resolve(parsed.data.leadId, {
      actor: actor.id,
      nextStep,
    });
    revalidateCallbackRequests(parsed.data.leadId);
    return { leadId: parsed.data.leadId };
  });
}
