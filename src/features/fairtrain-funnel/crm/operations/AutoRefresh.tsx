"use client";
/**
 * AutoRefresh — near-real-time sync for a server-rendered CRM surface.
 *
 * The CRM pages are `force-dynamic`, so a `router.refresh()` re-runs their
 * server data loaders and reconciles every count/status without a full reload.
 * This component polls on an interval (and immediately when the tab regains
 * focus) so the Leitstand, Pipeline and Multichat stay in sync with events
 * coming from WhatsApp webhooks, the funnel and automations — without any
 * websocket infrastructure. Refreshes pause while the tab is hidden.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function AutoRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();
  const busy = useRef(false);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible" || busy.current) return;
      busy.current = true;
      router.refresh();
      // Give the RSC refresh a beat before the next tick can fire.
      window.setTimeout(() => {
        busy.current = false;
      }, 1500);
    };

    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
