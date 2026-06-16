"use server";
import { revalidatePath } from "next/cache";

import { AddNoteSchema } from "@/features/fairtrain-funnel/forms/schemas";
import type { NoteEntry } from "@/features/fairtrain-funnel/types";

import { ValidationError } from "../errors";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { leadService } from "../services/LeadService";
import { requirePermission, runAction, type Result } from "./_helpers";

export async function addNote(raw: unknown): Promise<Result<NoteEntry>> {
  return runAction(async () => {
    const parsed = AddNoteSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Invalid note payload");
    const actor = await requirePermission("canCreateNotes");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const note = await leadService.addNote(
      parsed.data.leadId,
      parsed.data.body,
      actor.id,
    );
    revalidatePath(`/crm/leads/${parsed.data.leadId}`);
    return note;
  });
}
