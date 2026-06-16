/**
 * SLA sweep cron endpoint.
 *
 * Protected by CRON_SECRET header (compared in constant time). Vercel Cron
 * or a VPS crontab can hit this on a schedule.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/server/env";
import { slaService } from "@/server/services/SlaService";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function POST(req: Request): Promise<Response> {
  const provided = req.headers.get("x-cron-secret") ?? "";
  const expected = serverEnv.CRON_SECRET;
  if (!expected || !safeEqual(provided, expected)) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }
  const result = await slaService.sweep();
  return NextResponse.json({ ok: true, ...result });
}
