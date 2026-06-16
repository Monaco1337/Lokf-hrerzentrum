/**
 * NoteRepository - mutable but tracks editedAt.
 */
import type { Prisma } from "@prisma/client";

import type { NoteEntry } from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";

export interface CreateNoteInput {
  leadId: string;
  body: string;
  author: string;
}

export class NoteRepository {
  async create(
    input: CreateNoteInput,
    tx?: Prisma.TransactionClient,
  ): Promise<NoteEntry> {
    const client = tx ?? prisma;
    const row = await client.note.create({
      data: {
        leadId: input.leadId,
        body: input.body,
        author: input.author,
      },
    });
    return {
      id: row.id,
      body: row.body,
      author: row.author,
      createdAt: row.createdAt,
      editedAt: row.editedAt,
    };
  }

  async list(leadId: string): Promise<NoteEntry[]> {
    const rows = await prisma.note.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      author: r.author,
      createdAt: r.createdAt,
      editedAt: r.editedAt,
    }));
  }
}

export const noteRepository = new NoteRepository();
