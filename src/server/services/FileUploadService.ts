/**
 * FileUploadService - validate, persist and (on submit) attach uploaded files.
 *
 * Flow:
 *   1. UI uploads a single file via the `uploadFile` Server Action.
 *   2. We compute sha256, persist payload via the StorageAdapter (content
 *      addressable -> automatic dedup), then insert a metadata row.
 *      The row is created with `leadId = null` and `draftId = <draftId>`
 *      because the Lead does not exist yet at upload time.
 *   3. When the wizard submits, `LeadService.submit` calls
 *      `attachFilesToLead` inside the same transaction to set the real
 *      lead id (and clear draftId).
 *   4. Orphan placeholder rows are cleaned up by a janitor (out of scope here).
 *
 * Security:
 *   - MIME and size are validated on the server (never trust the client).
 *   - Filenames are sanitized.
 *   - Storage keys are derived from sha256 (no user-controlled paths).
 *   - DSGVO erasure deletes the storage payload + soft-deletes the row.
 */
import { createHash } from "node:crypto";

import {
  ACCEPTED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  type UploadFileInput,
} from "@/features/fairtrain-funnel/forms/schemas";
import {
  type UploadedFileEntry,
  type UploadedFileKind,
} from "@/features/fairtrain-funnel/types";

import { type TransactionClient } from "../db/prisma";
import { auditLogRepository } from "../repositories/AuditLogRepository";
import { uploadedFileRepository } from "../repositories/UploadedFileRepository";
import {
  buildContentKey,
  filesystemStorageAdapter,
} from "../storage/FilesystemStorageAdapter";

const FILENAME_REPLACE = /[^\w.\-() ]+/g;

function sanitizeFileName(name: string): string {
  // Keep extension, strip path, replace anything sketchy
  const base = name.split(/[\\/]/).pop() ?? "datei";
  const trimmed = base.trim().slice(0, 200);
  return trimmed.replace(FILENAME_REPLACE, "_") || "datei";
}

export interface PersistedUpload {
  id: string;
  kind: UploadedFileKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export class FileUploadService {
  async persist(args: {
    meta: UploadFileInput;
    payload: Buffer;
  }): Promise<PersistedUpload> {
    const { meta, payload } = args;

    if (payload.byteLength !== meta.sizeBytes) {
      throw new Error("Größe stimmt nicht mit Datei überein");
    }
    if (payload.byteLength === 0) {
      throw new Error("Datei ist leer");
    }
    if (payload.byteLength > MAX_UPLOAD_BYTES) {
      throw new Error("Datei zu groß (max. 15 MB)");
    }
    if (!ACCEPTED_UPLOAD_MIME.includes(meta.mimeType)) {
      throw new Error("Dateityp nicht unterstützt");
    }

    // Magic-byte sniff (very light): catches the common mismatched extensions
    if (!matchesMagicBytes(payload, meta.mimeType)) {
      throw new Error("Datei-Inhalt passt nicht zum angegebenen Dateityp");
    }

    const sha256 = createHash("sha256").update(payload).digest("hex");
    const storageKey = buildContentKey(sha256);

    await filesystemStorageAdapter.put(storageKey, payload);

    const cleanName = sanitizeFileName(meta.originalName);

    // Lead does not exist yet — keep leadId null and track the draft id so the
    // submit step can attach the file (and a janitor can purge orphans).
    const entry = await uploadedFileRepository.create({
      leadId: null,
      draftId: meta.leadDraftId,
      kind: meta.kind,
      originalName: cleanName,
      mimeType: meta.mimeType,
      sizeBytes: meta.sizeBytes,
      storageKey,
      sha256,
    });

    await auditLogRepository.append({
      actor: "public",
      action: "FILE_UPLOADED",
      entityType: "UploadedFile",
      entityId: entry.id,
      details: JSON.stringify({
        kind: entry.kind,
        sizeBytes: entry.sizeBytes,
        mimeType: entry.mimeType,
        draftId: meta.leadDraftId,
      }),
    });

    return {
      id: entry.id,
      kind: entry.kind,
      originalName: entry.originalName,
      mimeType: entry.mimeType,
      sizeBytes: entry.sizeBytes,
      uploadedAt: entry.uploadedAt,
    };
  }

  async attachFilesToLead(
    fileIds: ReadonlyArray<string>,
    leadId: string,
    tx?: TransactionClient,
  ): Promise<number> {
    return uploadedFileRepository.attachLead(fileIds, leadId, tx);
  }

  async listForLead(leadId: string): Promise<UploadedFileEntry[]> {
    return uploadedFileRepository.listByLead(leadId);
  }

  async readPayload(fileId: string): Promise<{
    file: UploadedFileEntry;
    payload: Buffer;
  } | null> {
    const file = await uploadedFileRepository.findById(fileId);
    if (!file || file.deletedAt) return null;
    const payload = await filesystemStorageAdapter.get(file.storageKey);
    if (!payload) return null;
    return { file, payload };
  }

  async deleteFile(fileId: string, actor: string): Promise<void> {
    const file = await uploadedFileRepository.findById(fileId);
    if (!file) return;
    await filesystemStorageAdapter.delete(file.storageKey);
    await uploadedFileRepository.softDelete(fileId);
    await auditLogRepository.append({
      actor,
      action: "FILE_DELETED",
      entityType: "UploadedFile",
      entityId: fileId,
      details: null,
    });
  }
}

export const fileUploadService = new FileUploadService();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (buf.length < 4) return false;
  switch (mimeType) {
    case "application/pdf":
      return buf.slice(0, 4).toString("ascii") === "%PDF";
    case "image/png":
      return (
        buf[0] === 0x89 &&
        buf[1] === 0x50 &&
        buf[2] === 0x4e &&
        buf[3] === 0x47
      );
    case "image/jpeg":
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case "image/webp":
      return (
        buf.slice(0, 4).toString("ascii") === "RIFF" &&
        buf.slice(8, 12).toString("ascii") === "WEBP"
      );
    default:
      return false;
  }
}
