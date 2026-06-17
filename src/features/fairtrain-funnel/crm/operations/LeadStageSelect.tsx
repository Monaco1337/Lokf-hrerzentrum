"use client";
/**
 * LeadStageSelect — compact inline status mutator for the dark ops boards
 * (Bildungsgutschein, Agenturtermine). Persists via the existing
 * `updateLeadStatus` action, which writes status history + audit, then
 * refreshes the route so every board reflects the change.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateLeadStatus } from "@/server/actions/updateLeadStatus";
import { LeadStatus } from "../../types";

export interface StageOption {
  value: LeadStatus;
  label: string;
}

interface Props {
  leadId: string;
  current: LeadStatus;
  options: ReadonlyArray<StageOption>;
  reason: string;
}

export function LeadStageSelect({ leadId, current, options, reason }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  // Ensure the lead's current status is always selectable even if it is not
  // one of the advance targets (so the control never shows a wrong value).
  const hasCurrent = options.some((o) => o.value === current);

  return (
    <div className="flex items-center gap-1">
      <select
        className="ops-input h-7 max-w-[150px] py-0 text-[11px]"
        defaultValue={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as LeadStatus;
          if (next === current) return;
          setError(false);
          startTransition(async () => {
            const res = await updateLeadStatus({
              leadId,
              toStatus: next,
              reason,
              override: true,
            });
            if (!res.ok) {
              setError(true);
              return;
            }
            router.refresh();
          });
        }}
      >
        {!hasCurrent ? <option value={current}>— aktuell —</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-[10px] text-red-400">Fehler</span> : null}
    </div>
  );
}
