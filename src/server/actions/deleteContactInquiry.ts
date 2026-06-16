"use server";
/**
 * deleteContactInquiry - CRM-only Server Action.
 * Permanently removes a contact inquiry. Requires a valid CRM session.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { NotFoundError, ValidationError } from "../errors";
import { contactInquiryService } from "../services/ContactInquiryService";
import { requirePermission, runAction, type Result } from "./_helpers";

const InputSchema = z.object({
  id: z.string().min(1).max(60),
});

export async function deleteContactInquiry(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const actor = await requirePermission("canDeleteContactInquiries");
    const parsed = InputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid delete payload", {
        issues: parsed.error.issues,
      });
    }
    const found = await contactInquiryService.findById(parsed.data.id);
    if (!found) throw new NotFoundError("ContactInquiry", parsed.data.id);

    await contactInquiryService.delete(parsed.data.id, actor.id);

    revalidatePath("/crm/inquiries");
    return { id: parsed.data.id };
  });
}
