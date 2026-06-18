/**
 * POST /api/whatsapp/send-text
 *
 * Authenticated CRM endpoint that sends (or simulates) a free-text WhatsApp
 * message via the active adapter. Requires a valid CRM session + canManageLeads.
 * Live sends are gated on WhatsApp consent inside MessageLedgerService.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { requireCrmUser } from "@/server/actions/_helpers";
import { DomainError } from "@/server/errors";
import { messageLedgerService } from "@/server/services/MessageLedgerService";

const BodySchema = z.object({
  leadId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
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
    const entry = await messageLedgerService.sendText({
      leadId: parsed.data.leadId,
      body: parsed.data.body,
      actorId: user.id,
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
