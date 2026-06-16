/**
 * DocumentRepository - mutable (status transitions, storageKey assignment).
 */
import type { Prisma } from "@prisma/client";

import {
  type DocumentEntry,
  type DocumentStatus,
  type DocumentType,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { parseDocumentStatus, parseDocumentType } from "./types";

export interface UpsertDocumentInput {
  leadId: string;
  type: DocumentType;
  status: DocumentStatus;
  storageKey?: string | null;
  generatedAt?: Date | null;
  sentAt?: Date | null;
}

export class DocumentRepository {
  async upsert(
    input: UpsertDocumentInput,
    tx?: Prisma.TransactionClient,
  ): Promise<DocumentEntry> {
    const client = tx ?? prisma;
    const row = await client.document.upsert({
      where: { leadId_type: { leadId: input.leadId, type: input.type } },
      create: {
        leadId: input.leadId,
        type: input.type,
        status: input.status,
        storageKey: input.storageKey ?? null,
        generatedAt: input.generatedAt ?? null,
        sentAt: input.sentAt ?? null,
      },
      update: {
        status: input.status,
        ...(input.storageKey !== undefined && { storageKey: input.storageKey }),
        ...(input.generatedAt !== undefined && {
          generatedAt: input.generatedAt,
        }),
        ...(input.sentAt !== undefined && { sentAt: input.sentAt }),
      },
    });
    return {
      id: row.id,
      type: parseDocumentType(row.type),
      status: parseDocumentStatus(row.status),
      storageKey: row.storageKey,
      generatedAt: row.generatedAt,
      sentAt: row.sentAt,
      updatedAt: row.updatedAt,
    };
  }

  async list(leadId: string): Promise<DocumentEntry[]> {
    const rows = await prisma.document.findMany({
      where: { leadId },
      orderBy: { type: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      type: parseDocumentType(r.type),
      status: parseDocumentStatus(r.status),
      storageKey: r.storageKey,
      generatedAt: r.generatedAt,
      sentAt: r.sentAt,
      updatedAt: r.updatedAt,
    }));
  }
}

export const documentRepository = new DocumentRepository();
