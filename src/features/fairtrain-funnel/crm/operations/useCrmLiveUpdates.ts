"use client";
/**
 * useCrmLiveUpdates — subscribes to the CRM SSE channel (/api/crm/events/stream)
 * and returns live counters. When a counter changes versus the last push, it
 * calls router.refresh() so server components re-render with fresh data — a
 * real-time dashboard update without a full page reload.
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
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }
    const source = new EventSource("/api/crm/events/stream");

    const onUpdate = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as { docsAwaiting?: number };
        if (typeof data.docsAwaiting !== "number") return;
        setConnected(true);
        setDocsAwaiting(data.docsAwaiting);
        if (lastRef.current !== null && data.docsAwaiting !== lastRef.current) {
          router.refresh();
        }
        lastRef.current = data.docsAwaiting;
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
