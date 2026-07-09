/**
 * WhatsApp Cloud API webhook.
 *
 *  GET  — Meta verification handshake. Echoes hub.challenge only when
 *         hub.verify_token matches WHATSAPP_VERIFY_TOKEN (server-side).
 *  POST — Inbound messages + delivery status callbacks. The raw body is
 *         HMAC-SHA256 verified against WHATSAPP_APP_SECRET before any
 *         processing, then handed to WhatsAppWebhookService which writes to the
 *         message ledger (real, isDemo:false).
 *
 * No secrets are exposed. When the secrets are not configured the endpoint
 * refuses to process (503/403) — the demo "Antwort simulieren" path is the
 * simulation route and lives entirely in-app.
 */
import { NextResponse } from "next/server";

import { serverEnv } from "@/server/env";
import { whatsappService } from "@/server/services/messaging/whatsappService";
import { whatsAppWebhookService } from "@/server/services/WhatsAppWebhookService";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expected = serverEnv.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
}

export async function POST(req: Request): Promise<Response> {
  if (!serverEnv.WHATSAPP_APP_SECRET) {
    // Not configured for real webhooks — refuse rather than process unverified.
    return NextResponse.json(
      { ok: false, code: "PROVIDER_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  // Signature verification is delegated to the active provider adapter so the
  // HMAC scheme lives with the provider it belongs to.
  if (!whatsappService.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const result = await whatsAppWebhookService.processWebhook(payload);
  // Always 200 so Meta does not retry on benign/unrelated events.
  return NextResponse.json({ ok: true, ...result });
}
