"use server";
/**
 * submitContactInquiry - public Server Action for the "Noch eine Frage?" form
 * on the landing page.
 *
 * The action is strict on validation, applies a server-side render-time check
 * to throw out trivial bots, and routes the inquiry through
 * ContactInquiryService (which handles rate limiting and IP hashing).
 *
 * On success: { ok: true, data: { id } }
 * On error:   { ok: false, code, message }
 */
import { ContactInquirySchema } from "@/features/fairtrain-funnel/forms/schemas";

import { ValidationError } from "../errors";
import { contactInquiryService } from "../services/ContactInquiryService";
import { getRequestContext, runAction, type Result } from "./_helpers";

export interface SubmitContactInquiryResult {
  id: string;
}

const MIN_RENDER_MS = 1200;

export async function submitContactInquiry(
  raw: unknown,
): Promise<Result<SubmitContactInquiryResult>> {
  return runAction(async () => {
    const parsed = ContactInquirySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid contact inquiry payload", {
        issues: parsed.error.issues,
      });
    }
    const input = parsed.data;

    if (typeof input.renderedAt === "number" && input.renderedAt < MIN_RENDER_MS) {
      throw new ValidationError("Bitte einen Moment Zeit lassen.", {
        reason: "too_fast",
      });
    }

    const ctx = await getRequestContext();

    const created = await contactInquiryService.submit({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      phone: input.phone ?? null,
      message: input.message,
      source: ctx.source,
      utm: ctx.utm,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { id: created.id };
  });
}
