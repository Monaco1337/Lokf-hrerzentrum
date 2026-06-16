"use server";
import { RevokeConsentSchema } from "@/features/fairtrain-funnel/forms/schemas";

import { ValidationError } from "../errors";
import { consentService } from "../services/ConsentService";
import { getRequestContext, runAction, type Result } from "./_helpers";

export async function revokeConsent(
  raw: unknown,
): Promise<Result<{ ok: true }>> {
  return runAction(async () => {
    const parsed = RevokeConsentSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid revoke payload");
    }
    const ctx = await getRequestContext();
    await consentService.revoke(parsed.data.leadId, parsed.data.type, ctx);
    return { ok: true };
  });
}
