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
