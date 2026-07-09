"use server";
/**
 * Alt-Lead import actions — preview (no writes) and commit (creates leads).
 *
 * Both accept a multipart FormData carrying the uploaded `file`. Preview drives
 * the overview counters; commit persists the batch + Alt-Leads. Gated on
 * `canManageLeads`. No message is ever sent here — sending is a separate,
 * manually-released campaign step.
 */
import { revalidatePath } from "next/cache";

import type {
  ImportCommitDto,
  ImportPreviewDto,
  ImportPreviewRowDto,
} from "@/features/fairtrain-funnel/campaign/types";

import { ValidationError } from "../errors";
import {
  type AnalyzedRow,
  leadImportService,
} from "../services/LeadImportService";
import { requirePermission, runAction, type Result } from "./_helpers";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
const SAMPLE_LIMIT = 100;

async function fileToBuffer(raw: unknown): Promise<{ buffer: Buffer; name: string }> {
  if (!(raw instanceof FormData)) {
    throw new ValidationError("Ungültige Anfrage");
  }
  const file = raw.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new ValidationError("Bitte eine Excel-/CSV-Datei auswählen.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ValidationError("Datei zu groß (max. 15 MB).");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  return { buffer, name: file.name };
}

function toRowDto(row: AnalyzedRow): ImportPreviewRowDto {
  return {
    rowIndex: row.rowIndex,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    city: row.city,
    status: row.status,
    errorReason: row.errorReason,
    hasWhatsapp: row.hasWhatsapp,
    hasEmail: row.hasEmail,
  };
}

export async function previewLeadImport(
  formData: FormData,
): Promise<Result<ImportPreviewDto>> {
  return runAction(async () => {
    await requirePermission("canManageLeads");
    const { buffer } = await fileToBuffer(formData);
    const analysis = await leadImportService.preview(buffer);

    // Show problems first (invalid/duplicate), then a few imported rows.
    const problems = analysis.rows.filter((r) => r.status !== "imported");
    const ok = analysis.rows.filter((r) => r.status === "imported");
    const sample = [...problems, ...ok]
      .slice(0, SAMPLE_LIMIT)
      .map(toRowDto);

    return {
      headers: analysis.headers,
      mapping: analysis.mapping as Record<string, string>,
      counters: analysis.counters,
      sample,
    };
  });
}

export async function commitLeadImport(
  formData: FormData,
): Promise<Result<ImportCommitDto>> {
  return runAction(async () => {
    const user = await requirePermission("canManageLeads");
    const { buffer, name } = await fileToBuffer(formData);
    const result = await leadImportService.commit(buffer, name, user.id);
    revalidatePath("/crm/import");
    revalidatePath("/crm/campaigns/reaktivierung");
    revalidatePath("/crm/leads");
    return result;
  });
}
