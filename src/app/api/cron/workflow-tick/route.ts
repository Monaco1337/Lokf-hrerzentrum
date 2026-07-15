/**
 * Workflow tick cron endpoint.
 *
 * Resumes every due workflow reminder (WorkflowRun in status "waiting" whose
 * resumeAt has passed). The engine re-checks the stop rules before firing —
 * a lead that replied or started the funnel is skipped, so a reminder never
 * races a real reaction.
 *
 * Auth mirrors campaign-runner: CRON_SECRET via `x-cron-secret` or
 * `Authorization: Bearer <secret>` (compared in constant time).
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { serverEnv } from "@/server/env";
import { workflowEngine } from "@/server/services/workflow/WorkflowEngine";

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
  const summary = await workflowEngine.resumeDue();
  return NextResponse.json({ ok: true, ...summary });
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}
