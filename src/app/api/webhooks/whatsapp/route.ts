/**
 * Stub for incoming WhatsApp webhooks.
 *
 * Wired up later. Today: returns 200 with a TODO marker so the route exists.
 * Production must verify the Meta signature header before processing.
 */
import { NextResponse } from "next/server";

export async function GET(req: Request): Promise<Response> {
  // Meta verification handshake (echoes hub.challenge). Not configured yet.
  const url = new URL(req.url);
  const challenge = url.searchParams.get("hub.challenge");
  if (challenge) {
    return new Response(challenge, { status: 200 });
  }
  return NextResponse.json({ ok: true, note: "webhook stub" });
}

export async function POST(req: Request): Promise<Response> {
  // TODO: verify x-hub-signature-256 with WHATSAPP_APP_SECRET (not configured).
  // TODO: parse incoming message and append CommunicationEvent (direction=IN).
  await req.text();
  return NextResponse.json({ ok: true, note: "webhook stub" });
}
