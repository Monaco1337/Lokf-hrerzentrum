"use server";
/**
 * Public, token-scoped applicant portal actions.
 *
 * These intentionally do NOT require a CRM session — they are reachable from
 * the public `/bewerbung/[token]` route. Every action re-validates the token
 * server-side and operates ONLY on the lead the token resolves to. No admin
 * data is ever returned and no lead id is accepted from the client.
 */
import { z } from "zod";

import {
  PortalDocumentKindSchema,
  PortalFormSchema,
} from "@/features/fairtrain-funnel/types";
import {
  ACCEPTED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
} from "@/features/fairtrain-funnel/forms/schemas";

import { ValidationError } from "../errors";
import { portalService } from "../services/PortalService";
import { runAction, type Result } from "./_helpers";

const TokenSchema = z.string().min(16).max(200);

const SaveSchema = z.object({
  token: TokenSchema,
  form: PortalFormSchema,
});

export async function savePortalForm(
  raw: unknown,
): Promise<Result<{ ok: boolean }>> {
  return runAction(async () => {
    const parsed = SaveSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Eingabe");
    return portalService.saveForm(parsed.data.token, parsed.data.form);
  });
}

export async function submitPortalForm(
  raw: unknown,
): Promise<Result<{ ok: boolean; completionPercent: number }>> {
  return runAction(async () => {
    const parsed = SaveSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Eingabe");
    return portalService.submitForm(parsed.data.token, parsed.data.form);
  });
}

const UploadSchema = z.object({
  token: TokenSchema,
  kind: PortalDocumentKindSchema,
});

export async function simulatePortalUpload(
  raw: unknown,
): Promise<Result<{ ok: boolean; completionPercent: number }>> {
  return runAction(async () => {
    const parsed = UploadSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Eingabe");
    return portalService.simulateUpload(parsed.data.token, parsed.data.kind);
  });
}

/**
 * Real, token-scoped document upload from the applicant portal. Accepts a
 * multipart FormData payload (token + kind + file). The file is validated
 * server-side (MIME allow-list, size cap) and stored against the lead the token
 * resolves to. No lead id is ever accepted from the client.
 */
export async function uploadPortalDocument(
  formData: FormData,
): Promise<
  Result<{
    ok: boolean;
    completionPercent: number;
    fileName?: string;
    fileId?: string;
  }>
> {
  return runAction(async () => {
    const token = String(formData.get("token") ?? "");
    const kindRaw = String(formData.get("kind") ?? "");
    const file = formData.get("file");

    if (!TokenSchema.safeParse(token).success) {
      throw new ValidationError("Ungültiger Link");
    }
    const kind = PortalDocumentKindSchema.safeParse(kindRaw);
    if (!kind.success) throw new ValidationError("Ungültige Dokumentart");
    if (!(file instanceof File)) {
      throw new ValidationError("Keine Datei übergeben");
    }
    if (file.size <= 0) throw new ValidationError("Datei ist leer");
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new ValidationError(
        `Datei zu groß (max. ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB)`,
      );
    }
    if (
      !ACCEPTED_UPLOAD_MIME.includes(
        file.type as (typeof ACCEPTED_UPLOAD_MIME)[number],
      )
    ) {
      throw new ValidationError(
        "Dateityp nicht unterstützt (erlaubt: PDF, PNG, JPG, WEBP)",
      );
    }

    const payload = Buffer.from(await file.arrayBuffer());
    return portalService.uploadDocument(token, kind.data, {
      originalName: file.name,
      mimeType: file.type,
      payload,
    });
  });
}
