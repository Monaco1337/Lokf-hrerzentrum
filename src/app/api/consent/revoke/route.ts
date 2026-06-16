/**
 * Public consent-revoke endpoint via signed magic link.
 *
 * The link is issued by an admin action (sendMagicLink with a future
 * REVOKE scope) - this route consumes the token then revokes all consents
 * for that lead. Token is single-use and hash-only.
 */
import { NextResponse } from "next/server";

import { ConsentType } from "@/features/fairtrain-funnel/types";
import { consentService } from "@/server/services/ConsentService";
import { magicLinkTokenService } from "@/server/services/MagicLinkTokenService";
import { DomainError } from "@/server/errors";

export async function POST(req: Request): Promise<Response> {
  let body: { token?: unknown } = {};
  try {
    body = (await req.json()) as { token?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json(
      { ok: false, code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }
  try {
    const { leadId } = await magicLinkTokenService.consume(token);
    const ctx = {
      source: req.headers.get("referer"),
      utm: null,
      ip: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
    };
    for (const type of Object.values(ConsentType)) {
      await consentService.revoke(leadId, type, ctx);
    }
    return NextResponse.json({ ok: true });
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
