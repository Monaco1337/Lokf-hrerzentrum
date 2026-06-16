"use server";
/**
 * updateContactInquiryStatus - CRM-only Server Action.
 * Requires a valid CRM session (via requireCrmActor); throws Unauthorized
 * otherwise.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ContactInquiryStatusSchema } from "@/features/fairtrain-funnel/types";

import { NotFoundError, ValidationError } from "../errors";
import { contactInquiryService } from "../services/ContactInquiryService";
import { requirePermission, runAction, type Result } from "./_helpers";
import type { ContactInquiryRow } from "../repositories/ContactInquiryRepository";

const InputSchema = z.object({
  id: z.string().min(1).max(60),
  status: ContactInquiryStatusSchema,
});

export async function updateContactInquiryStatus(
  raw: unknown,
): Promise<Result<ContactInquiryRow>> {
  return runAction(async () => {
    const actor = await requirePermission("canEditContactInquiries");
    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid status update payload", {
        issues: parsed.error.issues,
      });
    }
    const found = await contactInquiryService.findById(parsed.data.id);
    if (!found) throw new NotFoundError("ContactInquiry", parsed.data.id);

    const updated = await contactInquiryService.updateStatus(
      parsed.data.id,
      parsed.data.status,
      actor.id,
    );

    revalidatePath("/crm/inquiries");
    revalidatePath(`/crm/inquiries/${parsed.data.id}`);

    return updated;
  });
}
