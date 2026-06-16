/**
 * PipelineKanban — replaces the static funnel-bar visualisation with a real
 * sales-kanban Lead Control Center.
 *
 * Each column carries:
 *   - Phase name + status hint
 *   - Lead count (large, tabular)
 *   - Hot-count chip + overdue-count chip
 *   - Top 3 leads (sorted by urgency → score) as `LeadMiniCard`s
 *   - "Alle X anzeigen" deep-link to the filtered list
 *
 * Layout: horizontally-scrolling row on mobile (snap), 5-column grid on lg+.
 * Server-rendered.
 */
import Link from "next/link";

import type { EnrichedLeadSummary, LeadStatus } from "../types";
import { LeadPriority } from "../types";
import { LeadMiniCard } from "./LeadMiniCard";
import { PIPELINE_PHASES, type PipelinePhase } from "./pipelinePhases";

interface PipelineKanbanProps {
  leads: ReadonlyArray<EnrichedLeadSummary>;
}

const URGENCY_ORDER: Record<EnrichedLeadSummary["insights"]["urgency"], number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  normal: 3,
};

function sortForColumn(entries: EnrichedLeadSummary[]): EnrichedLeadSummary[] {
  return [...entries].sort((a, b) => {
    const u = URGENCY_ORDER[a.insights.urgency] - URGENCY_ORDER[b.insights.urgency];
    if (u !== 0) return u;
    return b.insights.score - a.insights.score;
  });
}

export function PipelineKanban({ leads }: PipelineKanbanProps) {
  const byPhase = new Map<PipelinePhase["key"], EnrichedLeadSummary[]>();
  for (const phase of PIPELINE_PHASES) byPhase.set(phase.key, []);
  const lookup = new Map<LeadStatus, PipelinePhase>();
  for (const phase of PIPELINE_PHASES) {
    for (const status of phase.statuses) lookup.set(status, phase);
  }
  for (const entry of leads) {
    const phase = lookup.get(entry.lead.status);
    if (phase) byPhase.get(phase.key)?.push(entry);
  }

  return (
    <section
      aria-labelledby="kanban-heading"
      className="overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-ink/[0.06] shadow-card md:p-6"
    >
      <header className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2
            id="kanban-heading"
            className="font-display text-[18px] font-bold tracking-tight text-navy-950 md:text-[20px]"
          >
            Pipeline
          </h2>
          <p className="mt-1 text-[13px] text-ink-soft">
            Top-Leads pro Phase — sortiert nach Dringlichkeit und Score.
          </p>
        </div>
        <span className="hidden text-[11px] uppercase tracking-[0.18em] text-ink-muted sm:inline">
          {leads.length} aktive Leads
        </span>
      </header>

      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 md:gap-3 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {PIPELINE_PHASES.map((phase) => {
          const entries = byPhase.get(phase.key) ?? [];
          return (
            <PhaseColumn
              key={phase.key}
              phase={phase}
              entries={sortForColumn(entries)}
            />
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

interface PhaseColumnProps {
  phase: PipelinePhase;
  entries: EnrichedLeadSummary[];
}

function PhaseColumn({ phase, entries }: PhaseColumnProps) {
  const hot = entries.filter((e) => e.lead.priority === LeadPriority.HOT).length;
  const overdue = entries.filter((e) => e.insights.urgency === "overdue").length;
  const top = entries.slice(0, 3);
  const remaining = entries.length - top.length;
  const filterParam = phase.statuses.join(",");
  const tone = PHASE_TONE[phase.tone];

  return (
    <article className="min-w-[280px] shrink-0 snap-start rounded-2xl bg-surface-subtle/60 p-3 ring-1 ring-ink/[0.05] md:min-w-[300px] lg:min-w-0">
      <header className="mb-3 px-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className={[
              "inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.14em]",
              tone.label,
            ].join(" ")}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {phase.label}
          </span>
          <span className={`font-display text-[22px] font-extrabold tabular-nums ${tone.count}`}>
            {entries.length}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-ink-muted">{phase.hint}</p>

        {(hot > 0 || overdue > 0) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hot > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-accent-700 ring-1 ring-accent-100">
                <span aria-hidden>🔥</span>
                {hot} HOT
              </span>
            ) : null}
            {overdue > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-red-700 ring-1 ring-red-100">
                <span aria-hidden>⚠</span>
                {overdue} überfällig
              </span>
            ) : null}
          </div>
        )}
      </header>

      <div className="space-y-2">
        {top.length === 0 ? (
          <EmptyColumn hint={phase.emptyHint} />
        ) : (
          top.map((entry) => (
            <LeadMiniCard key={entry.lead.id} entry={entry} variant="kanban" />
          ))
        )}
      </div>

      {entries.length > 0 ? (
        <Link
          href={`/crm/leads?status=${filterParam}`}
          className="mt-3 inline-flex w-full items-center justify-between rounded-lg border border-ink/[0.07] bg-white px-3 py-2 text-[12px] font-semibold text-ink-soft transition-all duration-[250ms] hover:-translate-y-px hover:border-ink/15 hover:text-ink"
        >
          <span>
            {remaining > 0
              ? `Alle ${entries.length} anzeigen`
              : "Liste öffnen"}
          </span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}
    </article>
  );
}

function EmptyColumn({ hint }: { hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink/[0.08] bg-white/40 px-3 py-6 text-center">
      <p className="text-[12px] text-ink-muted">{hint}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visual tones — calm slate for inactive, brand/accent for active phases.
// ---------------------------------------------------------------------------

const PHASE_TONE: Record<
  PipelinePhase["tone"],
  { label: string; dot: string; count: string }
> = {
  ingress: { label: "text-slate-600", dot: "bg-slate-400", count: "text-slate-700" },
  qualified: { label: "text-accent-700", dot: "bg-accent-500", count: "text-accent-700" },
  prep: { label: "text-brand-700", dot: "bg-brand-500", count: "text-brand-700" },
  agency: { label: "text-indigo-700", dot: "bg-indigo-500", count: "text-indigo-700" },
  won: { label: "text-emerald-700", dot: "bg-emerald-500", count: "text-emerald-700" },
};
