"use client";
/**
 * useCrmLiveUpdates — subscribes to the CRM SSE channel (/api/crm/events/stream)
 * and drives near-real-time, whole-dashboard synchronisation.
 *
 * The server pushes a `rev` signature covering all live-relevant CRM state
 * (leads + documents). Whenever `rev` changes versus the last push, the hook
 * calls router.refresh(), so EVERY server-rendered widget (KPIs, WhatsApp,
 * Funnel/Pipeline, Alarme, Prioritäten, Unterlagen, Aktivitäten) re-renders
 * together from the single loader — no widget drifts out of sync, no reload.
 *
 * `docsAwaiting` is also surfaced for the live "Neue Unterlagen" badge.
 *
 * EventSource reconnects automatically, so short serverless stream lifetimes
 * are transparent. Falls back silently to the existing polling (AutoRefresh)
 * if the browser has no EventSource or the connection errors out.
 */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export interface CrmLiveState {
  connected: boolean;
  docsAwaiting: number | null;
}

export function useCrmLiveUpdates(): CrmLiveState {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [docsAwaiting, setDocsAwaiting] = useState<number | null>(null);
  const lastRev = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }
    const source = new EventSource("/api/crm/events/stream");

    const onUpdate = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as {
          docsAwaiting?: number;
          rev?: string;
        };
        setConnected(true);
        if (typeof data.docsAwaiting === "number") {
          setDocsAwaiting(data.docsAwaiting);
        }
        // Prefer the broad revision; fall back to the docs counter for
        // backward compatibility with an older server frame.
        const rev =
          data.rev ??
          (typeof data.docsAwaiting === "number"
            ? String(data.docsAwaiting)
            : null);
        if (rev === null) return;
        if (lastRev.current !== null && rev !== lastRev.current) {
          router.refresh();
        }
        lastRev.current = rev;
      } catch {
        // ignore malformed frame
      }
    };

    source.addEventListener("crm-update", onUpdate as EventListener);
    source.onerror = () => setConnected(false);

    return () => {
      source.removeEventListener("crm-update", onUpdate as EventListener);
      source.close();
    };
  }, [router]);

  return { connected, docsAwaiting };
}
