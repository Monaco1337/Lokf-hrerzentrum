"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { AddNoteSchema } from "@/features/fairtrain-funnel/forms/schemas";
import type { NoteEntry } from "@/features/fairtrain-funnel/types";

import { ValidationError } from "../errors";
import { noteRepository } from "../repositories/NoteRepository";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { leadService } from "../services/LeadService";
import {
  requireCrmUser,
  requirePermission,
  runAction,
  type Result,
} from "./_helpers";

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
    revalidatePath(`/crm/multichat`);
    return note;
  });
}

export interface NoteListEntry {
  id: string;
  body: string;
  author: string;
  createdAt: string;
}

const ListLeadNotesSchema = z.object({ leadId: z.string().min(1) });

/**
 * Read a lead's notes for inline display in the Multichat work surface (so an
 * operator sees the note history without leaving the chat). Returns ISO
 * strings so the payload is fully serialisable to the client.
 */
export async function listLeadNotes(
  raw: unknown,
): Promise<Result<NoteListEntry[]>> {
  return runAction(async () => {
    const parsed = ListLeadNotesSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültiger Lead");
    const actor = await requireCrmUser();
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const notes = await noteRepository.list(parsed.data.leadId);
    return notes.map((n) => ({
      id: n.id,
      body: n.body,
      author: n.author,
      createdAt: n.createdAt.toISOString(),
    }));
  });
}
