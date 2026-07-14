/**
 * GET /api/crm/events/stream — Server-Sent Events channel for near-real-time
 * CRM dashboard updates without a page reload.
 *
 * Emits a small `crm-update` event every few seconds carrying live counters
 * (currently: documents awaiting review). The client (useCrmLiveUpdates) reacts
 * by updating the live badge and calling router.refresh() when a counter
 * changes, so server components re-render with fresh data.
 *
 * The stream self-closes just under the serverless limit; EventSource
 * transparently reconnects, so this works on Vercel too.
 */
import { portalDocumentRepository } from "@/server/repositories/PortalDocumentRepository";
import { requireCrmActor } from "@/server/actions/_helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TICK_MS = 5000;
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
          const docsAwaiting =
            await portalDocumentRepository.countAwaitingReview();
          const payload = JSON.stringify({ docsAwaiting, ts: Date.now() });
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
