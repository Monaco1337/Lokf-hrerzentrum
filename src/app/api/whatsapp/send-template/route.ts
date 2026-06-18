/**
 * POST /api/whatsapp/send-template
 *
 * Authenticated CRM endpoint that sends (or simulates) a template message via
 * the active WhatsApp adapter. Mirrors the `sendTemplateMessage` server action
 * for non-RSC callers. Requires a valid CRM session + canManageLeads.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { requireCrmUser } from "@/server/actions/_helpers";
import { DomainError } from "@/server/errors";
import { messageLedgerService } from "@/server/services/MessageLedgerService";

const BodySchema = z.object({
  leadId: z.string().min(1),
  templateId: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  let user;
  try {
    user = await requireCrmUser();
  } catch {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }
  if (!can(user.role, "canManageLeads")) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, code: "VALIDATION_ERROR" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const entry = await messageLedgerService.sendTemplate({
      leadId: parsed.data.leadId,
      templateId: parsed.data.templateId,
      actorId: user.id,
      sentBy: "ADMIN",
    });
    return NextResponse.json({
      ok: true,
      id: entry.id,
      status: entry.status,
      isDemo: entry.isDemo,
    });
  } catch (err) {
    if (err instanceof DomainError) {
      return NextResponse.json(
        { ok: false, code: err.code, message: err.message },
        { status: 400 },
      );
    }
    throw err;
  }
}
