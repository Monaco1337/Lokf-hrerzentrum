"use client";
/**
 * FollowUpDateControl — inline reschedule / complete control for the dark ops
 * boards (Follow-ups, Agenturtermine). Persists via the existing
 * `scheduleFollowUp` action: a date sets `nextFollowUpAt`, "Erledigt" clears it
 * (treated as completed). Both write audit entries server-side.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { scheduleFollowUp } from "@/server/actions/scheduleFollowUp";

interface Props {
  leadId: string;
  current: Date | null;
  /** Show the "Erledigt" (clear) button. Default true. */
  allowComplete?: boolean;
}

function toLocalInput(d: Date | null): string {
  if (!d) return "";
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

export function FollowUpDateControl({ leadId, current, allowComplete = true }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [when, setWhen] = useState(toLocalInput(current));
  const [error, setError] = useState(false);

  function save(value: string | null) {
    setError(false);
    startTransition(async () => {
      const res = await scheduleFollowUp({ leadId, when: value });
      if (!res.ok) {
        setError(true);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-1.5 flex items-center gap-1">
      <input
        type="datetime-local"
        className="ops-input h-7 py-0 text-[11px]"
        value={when}
        disabled={pending}
        onChange={(e) => setWhen(e.target.value)}
      />
      <button
        type="button"
        className="shrink-0 rounded-md bg-blue-600/90 px-2 py-1 text-[10.5px] font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
        disabled={pending || !when}
        onClick={() => save(new Date(when).toISOString())}
      >
        Setzen
      </button>
      {allowComplete ? (
        <button
          type="button"
          className="shrink-0 rounded-md border border-emerald-500/40 px-2 py-1 text-[10.5px] font-semibold text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-50"
          disabled={pending}
          onClick={() => save(null)}
        >
          Erledigt
        </button>
      ) : null}
      {error ? <span className="text-[10px] text-red-400">Fehler</span> : null}
    </div>
  );
}
