/**
 * DashboardPipeline — compact application funnel with a conversion rate shown
 * BETWEEN each phase. Scoped to the real application process (leadType=neu).
 * Every phase deep-links to the matching, explicitly-filtered leads view.
 */
import Link from "next/link";
import type { Route } from "next";

import { LeadStatus } from "../../types";

interface Phase {
  key: string;
  label: string;
  statuses: ReadonlyArray<LeadStatus>;
  href: Route;
}

const PHASES: ReadonlyArray<Phase> = [
  {
    key: "started",
    label: "Funnel gestartet",
    statuses: [LeadStatus.FUNNEL_STARTED],
    href: "/crm/leads?status=FUNNEL_STARTED" as Route,
  },
  {
    key: "completed",
    label: "Funnel abgeschlossen",
    statuses: [LeadStatus.FUNNEL_COMPLETED],
    href: "/crm/leads?status=FUNNEL_COMPLETED" as Route,
  },
  {
    key: "qualified",
    label: "Qualifiziert",
    statuses: [LeadStatus.QUALIFIED, LeadStatus.HOT, LeadStatus.BRIEFING_SENT],
    href: "/crm/leads?status=QUALIFIED,HOT,BRIEFING_SENT" as Route,
  },
  {
    key: "docs",
    label: "Unterlagen",
    statuses: [
      LeadStatus.DOC_PENDING,
      LeadStatus.DOC_REVIEW,
      LeadStatus.DOC_READY,
    ],
    href: "/crm/leads?status=DOC_PENDING,DOC_REVIEW,DOC_READY" as Route,
  },
  {
    key: "appointment",
    label: "Termin",
    statuses: [
      LeadStatus.AA_APPOINTMENT_PENDING,
      LeadStatus.AA_APPOINTMENT_DONE,
    ],
    href: "/crm/agenturtermine" as Route,
  },
  {
    key: "voucher",
    label: "Gutschein",
    statuses: [LeadStatus.GUTSCHEIN_PENDING, LeadStatus.GUTSCHEIN_APPROVED],
    href: "/crm/bildungsgutschein" as Route,
  },
  {
    key: "start",
    label: "Weiterbildung",
    statuses: [LeadStatus.ENROLLED, LeadStatus.STARTED, LeadStatus.CLOSED],
    href: "/crm/leads?status=ENROLLED,STARTED" as Route,
  },
];

const PCT = new Intl.NumberFormat("de-DE", {
  style: "percent",
  maximumFractionDigits: 0,
});

export function DashboardPipeline({
  byStatus,
}: {
  byStatus: Record<LeadStatus, number>;
}) {
  const counts = PHASES.map((p) =>
    p.statuses.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0),
  );
  const max = Math.max(1, ...counts);

  return (
    <section className="rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-card">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-bold tracking-tight text-navy-950">
          Bewerbungs-Pipeline
        </h2>
        <Link
          href={"/crm/pipeline" as Route}
          className="text-[12px] font-semibold text-brand-700 hover:text-brand-800"
        >
          Board öffnen →
        </Link>
      </header>

      <div className="flex items-stretch gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PHASES.map((phase, i) => {
          const value = counts[i]!;
          const prev = i > 0 ? counts[i - 1]! : null;
          const conv = prev && prev > 0 ? Math.min(1, value / prev) : null;
          return (
            <div key={phase.key} className="flex items-stretch gap-1">
              {i > 0 ? (
                <div className="flex w-12 shrink-0 flex-col items-center justify-center">
                  <svg className="h-3.5 w-3.5 text-ink-muted/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                  <span
                    className={`mt-1 text-[10.5px] font-bold tabular-nums ${
                      conv === null
                        ? "text-ink-muted/50"
                        : conv >= 0.5
                          ? "text-emerald-600"
                          : conv >= 0.25
                            ? "text-amber-600"
                            : "text-ink-muted"
                    }`}
                  >
                    {conv === null ? "–" : PCT.format(conv)}
                  </span>
                </div>
              ) : null}
              <Link
                href={phase.href}
                className="group flex w-[112px] shrink-0 flex-col rounded-xl border border-ink/[0.07] bg-surface-subtle/50 p-3 transition hover:border-brand-200 hover:bg-brand-50/40"
              >
                <span className="text-[26px] font-bold leading-none tabular-nums text-navy-950 group-hover:text-brand-700">
                  {value}
                </span>
                <span className="mt-2 text-[11px] font-medium leading-tight text-ink-soft">
                  {phase.label}
                </span>
                <span className="mt-2 h-1 w-full overflow-hidden rounded-full bg-ink/[0.06]">
                  <span
                    aria-hidden
                    className="block h-full rounded-full bg-brand-400/70"
                    style={{ width: `${Math.max(3, (value / max) * 100)}%` }}
                  />
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
