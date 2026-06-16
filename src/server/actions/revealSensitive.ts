"use server";
import { z } from "zod";

import type { SensitiveAnswersData } from "@/features/fairtrain-funnel/types";

import { ValidationError } from "../errors";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { leadService } from "../services/LeadService";
import { requirePermission, runAction, type Result } from "./_helpers";

const Schema = z.object({ leadId: z.string().min(1) });

export async function revealSensitive(
  raw: unknown,
): Promise<Result<SensitiveAnswersData | null>> {
  return runAction(async () => {
    const parsed = Schema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Invalid reveal payload");
    const actor = await requirePermission("canRevealSensitive");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    return leadService.revealSensitive(parsed.data.leadId, actor.id);
  });
}
