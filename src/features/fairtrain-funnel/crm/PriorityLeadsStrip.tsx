/**
 * PriorityLeadsStrip — "Jetzt bearbeiten" hero strip.
 *
 * The operator should never have to think about which lead to work next.
 * This component picks the top urgency × score leads and renders them as a
 * horizontally-scrolling strip of `LeadMiniCard`s right under the welcome
 * row, so the very first thing visible after sign-in is *the next call to
 * make*.
 *
 * Ranking:
 *   1. Urgency: overdue → today → soon → normal
 *   2. Within tier: lead score descending
 * Lead status is filtered to active phases only (BLOCKED/REJECTED/LOST/CLOSED
 * are never shown — they're not "to do today" by definition).
 */
import Link from "next/link";

import type { EnrichedLeadSummary } from "../types";
import { LeadStatus } from "../types";
import { LeadMiniCard } from "./LeadMiniCard";

const HIDDEN_STATUSES: ReadonlySet<LeadStatus> = new Set([
  LeadStatus.BLOCKED,
  LeadStatus.REJECTED,
  LeadStatus.LOST,
  LeadStatus.CLOSED,
]);

const URGENCY_ORDER: Record<EnrichedLeadSummary["insights"]["urgency"], number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  normal: 3,
};

const MAX_CARDS = 6;

export function PriorityLeadsStrip({
  leads,
}: {
  leads: ReadonlyArray<EnrichedLeadSummary>;
}) {
  const candidates = leads
    .filter((e) => !HIDDEN_STATUSES.has(e.lead.status))
    .filter((e) => e.insights.urgency !== "normal")
    .sort((a, b) => {
      const u = URGENCY_ORDER[a.insights.urgency] - URGENCY_ORDER[b.insights.urgency];
      if (u !== 0) return u;
      return b.insights.score - a.insights.score;
    })
    .slice(0, MAX_CARDS);

  if (candidates.length === 0) return null;

  const overdue = candidates.filter((e) => e.insights.urgency === "overdue").length;
  const today = candidates.filter((e) => e.insights.urgency === "today").length;

  return (
    <section
      aria-labelledby="priority-leads-heading"
      className="overflow-hidden rounded-2xl bg-gradient-to-br from-white to-surface-subtle/60 p-5 ring-1 ring-ink/[0.06] shadow-card md:p-6"
    >
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-accent-700">
            Jetzt bearbeiten
          </p>
          <h2
            id="priority-leads-heading"
            className="mt-1 font-display text-[18px] font-bold tracking-tight text-navy-950 md:text-[20px]"
          >
            {overdue > 0
              ? `${overdue} überfällig · ${today} heute`
              : `${today} Lead${today === 1 ? "" : "s"} heute`}
          </h2>
        </div>
        <Link
          href="/crm/leads?slaBreachedOnly=1"
          className="hidden text-[12px] font-semibold text-ink-soft transition hover:text-ink sm:inline"
        >
          Alle überfälligen →
        </Link>
      </header>

      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
        {candidates.map((entry) => (
          <LeadMiniCard key={entry.lead.id} entry={entry} variant="strip" />
        ))}
      </div>
    </section>
  );
}
