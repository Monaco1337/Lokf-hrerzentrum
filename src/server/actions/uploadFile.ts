"use server";
/**
 * uploadFile - public Server Action used by the wizard's FileDropzone.
 *
 * Accepts a single FormData payload (multipart upload). The file is validated
 * server-side (MIME allow-list, size limit, magic-byte sniff), persisted via
 * the StorageAdapter, and an UploadedFile metadata row is created.
 *
 * The row is tied to a `leadDraftId` (random UUID generated in the wizard) so
 * uploads can happen BEFORE the Lead exists. Submit re-attaches them.
 */
import {
  ACCEPTED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
  UploadFileInputSchema,
} from "@/features/fairtrain-funnel/forms/schemas";

import { ValidationError } from "../errors";
import {
  fileUploadService,
  type PersistedUpload,
} from "../services/FileUploadService";
import { runAction, type Result } from "./_helpers";

export async function uploadFile(
  formData: FormData,
): Promise<Result<PersistedUpload>> {
  return runAction(async () => {
    const file = formData.get("file");
    const leadDraftId = String(formData.get("leadDraftId") ?? "");
    const kind = String(formData.get("kind") ?? "OTHER");

    if (!(file instanceof File)) {
      throw new ValidationError("Keine Datei übergeben", { issues: [] });
    }

    const meta = UploadFileInputSchema.safeParse({
      leadDraftId,
      kind,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    if (!meta.success) {
      throw new ValidationError("Ungültige Datei-Metadaten", {
        issues: meta.error.issues,
      });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ValidationError(
        `Datei zu groß (max. ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB)`,
        { issues: [] },
      );
    }
    if (
      !ACCEPTED_UPLOAD_MIME.includes(
        file.type as (typeof ACCEPTED_UPLOAD_MIME)[number],
      )
    ) {
      throw new ValidationError(
        "Dateityp nicht unterstützt (erlaubt: PDF, PNG, JPG, WEBP)",
        { issues: [] },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const payload = Buffer.from(arrayBuffer);

    return fileUploadService.persist({
      meta: meta.data,
      payload,
    });
  });
}
