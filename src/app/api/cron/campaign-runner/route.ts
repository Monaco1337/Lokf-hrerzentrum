/**
 * Campaign runner cron endpoint.
 *
 * Drains the due CampaignMessageJob queue (Tag 0/3/7), re-checking the
 * stop-rules before every send and finalizing stale leads to "inaktiv".
 *
 * Auth: CRON_SECRET, accepted either as `x-cron-secret` (external crontab) or
 * `Authorization: Bearer <secret>` (Vercel Cron sets this automatically when a
 * CRON_SECRET env var is present). Compared in constant time.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/server/env";
import { campaignService } from "@/server/services/CampaignService";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function isAuthorized(req: Request): boolean {
  const expected = serverEnv.CRON_SECRET;
  if (!expected) return false;
  const headerSecret = req.headers.get("x-cron-secret");
  if (headerSecret && safeEqual(headerSecret, expected)) return true;
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return Boolean(bearer) && safeEqual(bearer, expected);
}

async function handle(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }
  const summary = await campaignService.runDueJobs();
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}
