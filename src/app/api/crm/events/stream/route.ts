/**
 * GET /api/crm/events/stream — Server-Sent Events channel for near-real-time
 * CRM dashboard updates without a page reload.
 *
 * Emits a `crm-update` event every few seconds carrying:
 *   - docsAwaiting: live "Neue Unterlagen" badge counter.
 *   - rev: a lightweight revision signature of ALL live-relevant CRM state
 *     (max Lead.updatedAt + active lead count + docs awaiting). Because every
 *     meaningful change — a WhatsApp reply, a pipeline/status move, a tag/funnel
 *     update, a document upload (→ contactState) — bumps the affected lead row,
 *     this single cheap aggregate reflects them all. The client
 *     (useCrmLiveUpdates) calls router.refresh() whenever `rev` changes, so the
 *     WHOLE dashboard (KPIs, WhatsApp, Funnel/Pipeline, Alarme, Prioritäten,
 *     Unterlagen, Aktivitäten) reconciles together from the single loader —
 *     high-end synchronised, no widget drifts.
 *
 * The stream self-closes just under the serverless limit; EventSource
 * transparently reconnects, so this works on Vercel too.
 */
import { prisma } from "@/server/db/prisma";
import { portalDocumentRepository } from "@/server/repositories/PortalDocumentRepository";
import { requireCrmActor } from "@/server/actions/_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Poll interval kept deliberately modest: every open CRM tab holds this stream
// and each tick runs DB queries. 15s is still "near real-time" for the
// dashboard while cutting the steady connection load on the serverless Postgres
// (a key factor in earlier connection-exhaustion incidents).
const TICK_MS = 15000;
const MAX_LIFETIME_MS = 55000;

export async function GET(): Promise<Response> {
  try {
    await requireCrmActor();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval> | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const cleanup = () => {
        if (interval) clearInterval(interval);
        if (timeout) clearTimeout(timeout);
        interval = null;
        timeout = null;
      };

      const send = async () => {
        try {
          const [docsAwaiting, leadAgg] = await Promise.all([
            portalDocumentRepository.countAwaitingReview(),
            // Bounded, cheap aggregate over live leads. max(updatedAt) shifts on
            // ANY lead mutation; _count catches creates/soft-deletes.
            prisma.lead.aggregate({
              where: { deletedAt: null },
              _max: { updatedAt: true },
              _count: true,
            }),
          ]);
          const rev = [
            leadAgg._max.updatedAt?.getTime() ?? 0,
            leadAgg._count ?? 0,
            docsAwaiting,
          ].join(":");
          const payload = JSON.stringify({ docsAwaiting, rev, ts: Date.now() });
          controller.enqueue(
            encoder.encode(`event: crm-update\ndata: ${payload}\n\n`),
          );
        } catch {
          // Transient DB hiccup — skip this tick, keep the stream alive.
        }
      };

      // Immediate first payload so the client badge fills instantly.
      await send();
      interval = setInterval(send, TICK_MS);
      timeout = setTimeout(() => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      }, MAX_LIFETIME_MS);
    },
    cancel() {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
