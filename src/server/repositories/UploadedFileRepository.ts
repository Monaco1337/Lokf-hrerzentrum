/**
 * UploadedFileRepository - the only Prisma access point for the
 * `UploadedFile` table.
 *
 * Stores metadata about user-uploaded files (CV, certificates, ID, ...).
 * The actual byte payload lives in the configured `StorageAdapter`.
 *
 * DSGVO: deletion is soft (deletedAt) so we keep an audit row, while the
 * binary payload is purged from the StorageAdapter via the service layer.
 */
import type { Prisma, UploadedFile as PrismaUploadedFile } from "@prisma/client";

import {
  type UploadedFileEntry,
  type UploadedFileKind,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { parseUploadedFileKind } from "./types";

export interface CreateUploadedFileInput {
  leadId: string | null;
  draftId: string | null;
  kind: UploadedFileKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  sha256: string;
}

function rowToEntry(row: PrismaUploadedFile): UploadedFileEntry {
  return {
    id: row.id,
    kind: parseUploadedFileKind(row.kind),
    originalName: row.originalName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    sha256: row.sha256,
    uploadedAt: row.uploadedAt,
    deletedAt: row.deletedAt,
  };
}

export class UploadedFileRepository {
  async create(
    input: CreateUploadedFileInput,
    tx?: Prisma.TransactionClient,
  ): Promise<UploadedFileEntry> {
    const client = tx ?? prisma;
    const row = await client.uploadedFile.create({
      data: {
        leadId: input.leadId,
        draftId: input.draftId,
        kind: input.kind,
        originalName: input.originalName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storageKey: input.storageKey,
        sha256: input.sha256,
      },
    });
    return rowToEntry(row);
  }

  async findById(id: string): Promise<UploadedFileEntry | null> {
    const row = await prisma.uploadedFile.findFirst({
      where: { id },
    });
    return row ? rowToEntry(row) : null;
  }

  async listByLead(leadId: string): Promise<UploadedFileEntry[]> {
    const rows = await prisma.uploadedFile.findMany({
      where: { leadId, deletedAt: null },
      orderBy: { uploadedAt: "desc" },
    });
    return rows.map(rowToEntry);
  }

  async listByIds(ids: ReadonlyArray<string>): Promise<UploadedFileEntry[]> {
    if (ids.length === 0) return [];
    const rows = await prisma.uploadedFile.findMany({
      where: { id: { in: [...ids] }, deletedAt: null },
    });
    return rows.map(rowToEntry);
  }

  async attachLead(
    fileIds: ReadonlyArray<string>,
    leadId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    if (fileIds.length === 0) return 0;
    const client = tx ?? prisma;
    // Only attach files that are still in the draft phase (leadId null) to
    // prevent re-assigning a file that already belongs to another lead.
    const result = await client.uploadedFile.updateMany({
      where: { id: { in: [...fileIds] }, deletedAt: null, leadId: null },
      data: { leadId, draftId: null },
    });
    return result.count;
  }

  async softDelete(id: string): Promise<void> {
    await prisma.uploadedFile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const uploadedFileRepository = new UploadedFileRepository();
