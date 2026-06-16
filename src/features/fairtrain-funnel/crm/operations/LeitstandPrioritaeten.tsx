/**
 * HeutigePrioritaeten — auto-ranked priority list of leads to work *now*.
 *
 * Ranking matches the spec:
 *   1. Revenue impact (HOT priority weight)
 *   2. Close probability (insights.closeProbability)
 *   3. SLA / urgency (overdue → today)
 *   4. Tie-break: lead score desc
 *
 * Rows are designed for fast scanning at high density — name + phone + next
 * action + urgency dot — and link straight into the Lead Command Center.
 */
import Link from "next/link";

import type { EnrichedLeadSummary } from "../../types";
import { LeadStatus } from "../../types";

const HIDDEN_STATUSES: ReadonlySet<LeadStatus> = new Set([
  LeadStatus.BLOCKED,
  LeadStatus.REJECTED,
  LeadStatus.LOST,
  LeadStatus.CLOSED,
]);

const URGENCY_RANK = { overdue: 0, today: 1, soon: 2, normal: 3 } as const;
const PRIORITY_RANK = { HOT: 0, WARM: 1, COLD: 2, BLOCKED: 3 } as const;

const URGENCY_META = {
  overdue: { dot: "bg-red-500", label: "Überfällig", chip: "ops-chip ops-chip-red" },
  today: { dot: "bg-orange-500", label: "Heute", chip: "ops-chip ops-chip-orange" },
  soon: { dot: "bg-amber-500", label: "Bald", chip: "ops-chip ops-chip-amber" },
  normal: { dot: "bg-zinc-500", label: "Normal", chip: "ops-chip ops-chip-slate" },
} as const;

const NUMBER_FMT = new Intl.NumberFormat("de-DE", {
  style: "percent",
  maximumFractionDigits: 0,
});

const MAX_ROWS = 10;

export function HeutigePrioritaeten({
  leads,
}: {
  leads: ReadonlyArray<EnrichedLeadSummary>;
}) {
  const ranked = [...leads]
    .filter((e) => !HIDDEN_STATUSES.has(e.lead.status))
    .sort((a, b) => {
      // 1) priority HOT first
      const p =
        PRIORITY_RANK[a.lead.priority] - PRIORITY_RANK[b.lead.priority];
      if (p !== 0) return p;
      // 2) urgency
      const u =
        URGENCY_RANK[a.insights.urgency] - URGENCY_RANK[b.insights.urgency];
      if (u !== 0) return u;
      // 3) close probability desc
      const cp = b.insights.closeProbability - a.insights.closeProbability;
      if (Math.abs(cp) > 0.01) return cp;
      // 4) score desc
      return b.insights.score - a.insights.score;
    })
    .slice(0, MAX_ROWS);

  return (
    <section aria-labelledby="heute-heading" className="ops-card overflow-hidden">
      <header className="flex items-end justify-between px-5 py-4">
        <div>
          <p className="ops-eyebrow">Heutige Prioritäten</p>
          <h2
            id="heute-heading"
            className="mt-1 text-[18px] font-bold tracking-tight text-white"
          >
            Wer als Nächstes
          </h2>
        </div>
        <Link
          href="/crm/leads"
          className="text-[11.5px] font-semibold text-zinc-400 transition hover:text-orange-300"
        >
          Alle Leads →
        </Link>
      </header>

      <div className="divide-y divide-white/[0.05] border-t border-white/[0.05]">
        {ranked.length === 0 && (
          <p className="px-5 py-8 text-center text-[13px] text-zinc-500">
            Keine Leads in aktiver Bearbeitung — Glückwunsch, Funnel ist sauber.
          </p>
        )}
        {ranked.map((entry, idx) => {
          const meta = URGENCY_META[entry.insights.urgency];
          return (
            <Link
              key={entry.lead.id}
              href={`/crm/leads/${entry.lead.id}`}
              className="group flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.03]"
            >
              <span className="w-5 shrink-0 text-right text-[11px] font-bold tabular-nums text-zinc-500 group-hover:text-zinc-300">
                {idx + 1}
              </span>
              <span
                aria-hidden
                className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-semibold text-white">
                    {entry.lead.firstName} {entry.lead.lastName}
                  </span>
                  {entry.lead.priority === "HOT" && (
                    <span className="ops-chip ops-chip-orange">HOT</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[11.5px] text-zinc-400">
                  {entry.insights.nextBestAction.label} ·{" "}
                  <span className="text-zinc-500">
                    {entry.insights.nextBestAction.reason}
                  </span>
                </p>
              </div>
              <div className="hidden shrink-0 items-center gap-3 sm:flex">
                <span className="text-[10.5px] tabular-nums text-zinc-400">
                  Score{" "}
                  <span className="font-semibold text-zinc-200">
                    {entry.insights.score}
                  </span>
                </span>
                <span className="text-[10.5px] tabular-nums text-zinc-400">
                  Conv{" "}
                  <span className="font-semibold text-zinc-200">
                    {NUMBER_FMT.format(entry.insights.closeProbability)}
                  </span>
                </span>
                <span className={meta.chip}>{meta.label}</span>
              </div>
              <svg
                className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-orange-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
