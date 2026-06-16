/**
 * GET /api/crm/files/[id] - authenticated file download for the CRM.
 *
 * Requires a valid CRM session. Streams the file payload from the
 * StorageAdapter and records an audit log entry. Inline disposition for
 * PDFs/images so the CRM can preview them in a new tab; attachment fallback
 * for everything else.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auditLogService } from "@/server/services/AuditLogService";
import { fileUploadService } from "@/server/services/FileUploadService";
import { requireCrmActor } from "@/server/actions/_helpers";

export const dynamic = "force-dynamic";

const INLINE_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  let actor: string;
  try {
    actor = await requireCrmActor();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const data = await fileUploadService.readPayload(id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await auditLogService.append({
    actor,
    action: "FILE_DOWNLOADED",
    entityType: "UploadedFile",
    entityId: id,
    details: { originalName: data.file.originalName },
  });

  const disposition = INLINE_MIME.has(data.file.mimeType) ? "inline" : "attachment";
  const safeName = encodeURIComponent(data.file.originalName);

  return new NextResponse(new Uint8Array(data.payload), {
    status: 200,
    headers: {
      "Content-Type": data.file.mimeType,
      "Content-Length": String(data.payload.byteLength),
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  });
}
