"use client";
/**
 * LeadTimelinePanel — chronological event ledger with a type filter for the
 * Timeline tab. Events are built server-side (audit + calls + status history)
 * and passed in; this component only filters + renders them.
 */
import { useState } from "react";

import { ActivityTimeline, type TimelineEvent } from "../sales/ActivityTimeline";

type Filter = "all" | "status" | "call" | "audit";

const FILTERS: ReadonlyArray<{ id: Filter; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "status", label: "Statuswechsel" },
  { id: "call", label: "Anrufe" },
  { id: "audit", label: "System & Aktionen" },
];

export function LeadTimelinePanel({ events }: { events: ReadonlyArray<TimelineEvent> }) {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = filter === "all" ? events : events.filter((e) => e.kind === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={[
              "rounded-lg px-3 py-1 text-[12px] font-semibold transition",
              filter === f.id
                ? "bg-brand-600 text-white"
                : "border border-ink/10 bg-white text-ink-soft hover:bg-surface-subtle",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ActivityTimeline events={[...filtered]} emptyMessage="Keine Ereignisse für diesen Filter." />
    </div>
  );
}
