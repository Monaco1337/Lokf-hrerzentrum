"use client";
/**
 * SyncPipelineButton — one-click reconciliation of the pipeline from WhatsApp
 * activity. Advances every lead that was already contacted (or that replied)
 * but is still stuck in a pre-contact status, so the Leitstand stops showing
 * them as "offen". Idempotent; safe to click repeatedly.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { reconcilePipelineFromWhatsapp } from "@/server/actions/reconcilePipeline";

export function SyncPipelineButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {note ? (
        <span className="text-[11.5px] text-zinc-400">{note}</span>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setNote(null);
          startTransition(async () => {
            const res = await reconcilePipelineFromWhatsapp();
            if (!res.ok) {
              setNote("Abgleich fehlgeschlagen");
              return;
            }
            const { advanced, scanned } = res.data;
            setNote(
              advanced > 0
                ? `${advanced} Lead${advanced === 1 ? "" : "s"} in die Pipeline übernommen`
                : scanned === 0
                  ? "Alles aktuell"
                  : "Nichts zu übernehmen",
            );
            router.refresh();
          });
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold text-zinc-200 transition hover:border-white/[0.22] hover:bg-white/[0.08] disabled:opacity-50"
      >
        <svg
          className={["h-3.5 w-3.5", pending ? "animate-spin" : ""].join(" ")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
        {pending ? "Synchronisiere…" : "Pipeline synchronisieren"}
      </button>
    </div>
  );
}
