"use client";
/**
 * AutoRefresh — gentle near-real-time sync for a server-rendered CRM surface.
 *
 * The CRM pages are `force-dynamic`, so a `router.refresh()` re-runs their
 * server data loaders and reconciles every count/status without a full reload.
 *
 * Stability-critical rules (a naive setInterval hammered the DB pool and could
 * white-screen the app under load / with several open tabs):
 *   - NEVER overlap: a new refresh only starts once the previous one has fully
 *     finished (tracked via useTransition, not a fixed timeout guess).
 *   - Poll gently and self-schedule the next tick AFTER the interval elapsed,
 *     so a slow render can't stack up requests.
 *   - Pause entirely while the tab is hidden or the browser is offline; refresh
 *     once when the tab regains focus (that's when fresh data actually matters).
 * This is purely a client-side read refresh — it changes no data.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";

export function AutoRefresh({ intervalMs = 45000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Mirror the transition state into a ref so the timer loop can read the
  // latest value without being torn down/recreated on every state change.
  const pending = useRef(false);

  useEffect(() => {
    pending.current = isPending;
  }, [isPending]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const canRun = () =>
      !cancelled &&
      !pending.current &&
      document.visibilityState === "visible" &&
      navigator.onLine !== false;

    const refresh = () => {
      if (!canRun()) return;
      pending.current = true;
      startTransition(() => {
        router.refresh();
      });
    };

    const loop = () => {
      refresh();
      timer = window.setTimeout(loop, intervalMs);
    };
    timer = window.setTimeout(loop, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}
