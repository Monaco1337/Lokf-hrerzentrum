"use client";
/**
 * FundingStatusSelect — Förderstatus (Bildungsgutschein) editor.
 *
 * A calm segmented control over the six funding states. Changing it auto-saves
 * immediately (setFundingStatus) and refreshes the route so every surface stays
 * in sync. No separate "save" click needed.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  FUNDING_STATUS_LABEL,
  FUNDING_STATUS_ORDER,
  FUNDING_STATUS_TONE,
  type FundingStatus,
} from "../fundingStatus";
import { setFundingStatus } from "@/server/actions/leads";

export function FundingStatusSelect({
  leadId,
  current,
}: {
  leadId: string;
  current: FundingStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<FundingStatus>(current);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function choose(next: FundingStatus) {
    if (next === value || pending) return;
    const prev = value;
    setValue(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await setFundingStatus({ leadId, status: next });
      if (!res.ok) {
        setValue(prev);
        setError(res.message || "Konnte nicht gespeichert werden.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {FUNDING_STATUS_ORDER.map((s) => {
          const activeState = s === value;
          return (
            <button
              key={s}
              type="button"
              onClick={() => choose(s)}
              disabled={pending}
              className={[
                "rounded-full px-3 py-1.5 text-[12.5px] font-semibold ring-1 ring-inset transition disabled:opacity-60",
                activeState
                  ? FUNDING_STATUS_TONE[s]
                  : "bg-white/70 text-slate-600 ring-black/10 hover:bg-white",
              ].join(" ")}
            >
              {FUNDING_STATUS_LABEL[s]}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-ink-muted">
        {pending
          ? "Speichert…"
          : error
            ? error
            : saved
              ? "Automatisch gespeichert."
              : "Wird automatisch gespeichert."}
      </p>
    </div>
  );
}
