/**
 * DashboardPipeline — the application funnel as ONE coherent operational
 * pipeline (reference "Bewerbungs-Pipeline"): each phase shows an icon, label,
 * live count, a small progress indicator and the conversion rate relative to
 * the previous phase. A "Conversion gesamt" bar summarises the whole pipeline.
 * Scoped to the real application process (leadType=neu). Every phase deep-links
 * to the matching, explicitly-filtered leads view. All figures are real DB
 * counts — nothing is fabricated; when the pipeline is empty the bars read 0.
 */
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { LeadStatus } from "../../types";

interface Phase {
  key: string;
  label: string;
  statuses: ReadonlyArray<LeadStatus>;
  href: Route;
  icon: ReactNode;
}

function Ic({ children }: { children: ReactNode }) {
  return (
    <svg
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const PHASES: ReadonlyArray<Phase> = [
  {
    key: "started",
    label: "Funnel gestartet",
    statuses: [LeadStatus.FUNNEL_STARTED],
    href: "/crm/leads?status=FUNNEL_STARTED" as Route,
    icon: <Ic><path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" /></Ic>,
  },
  {
    key: "completed",
    label: "Funnel abgeschlossen",
    statuses: [LeadStatus.FUNNEL_COMPLETED],
    href: "/crm/leads?status=FUNNEL_COMPLETED" as Route,
    icon: (
      <Ic>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="m9 11 3 3L22 4" />
      </Ic>
    ),
  },
  {
    key: "qualified",
    label: "Qualifiziert",
    statuses: [LeadStatus.QUALIFIED, LeadStatus.HOT, LeadStatus.BRIEFING_SENT],
    href: "/crm/leads?status=QUALIFIED,HOT,BRIEFING_SENT" as Route,
    icon: (
      <Ic>
        <path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5l-8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </Ic>
    ),
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
    icon: (
      <Ic>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
        <path d="M14 3v5h5" />
      </Ic>
    ),
  },
  {
    key: "appointment",
    label: "Termin",
    statuses: [
      LeadStatus.AA_APPOINTMENT_PENDING,
      LeadStatus.AA_APPOINTMENT_DONE,
    ],
    href: "/crm/agenturtermine" as Route,
    icon: (
      <Ic>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </Ic>
    ),
  },
  {
    key: "voucher",
    label: "Gutschein",
    statuses: [LeadStatus.GUTSCHEIN_PENDING, LeadStatus.GUTSCHEIN_APPROVED],
    href: "/crm/bildungsgutschein" as Route,
    icon: (
      <Ic>
        <circle cx="12" cy="8" r="6" />
        <path d="m8.5 13-1.5 8 5-3 5 3-1.5-8" />
      </Ic>
    ),
  },
  {
    key: "start",
    label: "Weiterbildung",
    statuses: [LeadStatus.ENROLLED, LeadStatus.STARTED, LeadStatus.CLOSED],
    href: "/crm/leads?status=ENROLLED,STARTED" as Route,
    icon: (
      <Ic>
        <path d="M22 10 12 5 2 10l10 5 10-5Z" />
        <path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" />
      </Ic>
    ),
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

  // Overall pipeline yield — real ratio: share of the current pipeline that
  // reached "Qualifiziert" or beyond. Shown only when the pipeline is non-empty.
  const total = counts.reduce((a, b) => a + b, 0);
  const qualifiedPlus = counts.slice(2).reduce((a, b) => a + b, 0);
  const overall = total > 0 ? Math.min(1, qualifiedPlus / total) : null;

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

      <div className="grid grid-cols-2 gap-y-5 sm:grid-cols-4 lg:grid-cols-7 lg:gap-y-0 lg:divide-x lg:divide-ink/[0.06]">
        {PHASES.map((phase, i) => {
          const value = counts[i]!;
          const prev = i > 0 ? counts[i - 1]! : null;
          const conv = prev && prev > 0 ? Math.min(1, value / prev) : null;
          const convCls =
            conv === null
              ? "text-ink-muted/60"
              : conv >= 0.5
                ? "text-emerald-600"
                : conv >= 0.25
                  ? "text-amber-600"
                  : "text-ink-muted";
          return (
            <Link
              key={phase.key}
              href={phase.href}
              className="group flex flex-col items-center gap-1.5 px-2 text-center lg:px-3"
            >
              <span
                aria-hidden
                className="mb-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-ink/[0.08] bg-surface-subtle/60 text-ink-soft transition group-hover:border-white/[0.16] group-hover:text-emerald-600"
              >
                {phase.icon}
              </span>
              <span className="text-[11px] font-medium leading-tight text-ink-soft">
                {phase.label}
              </span>
              <span className="text-[24px] font-bold leading-none tabular-nums text-navy-950 group-hover:text-emerald-700">
                {value}
              </span>
              <span className="mt-0.5 h-1 w-10 overflow-hidden rounded-full bg-ink/[0.06]">
                <span
                  aria-hidden
                  className="block h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.max(3, (value / max) * 100)}%` }}
                />
              </span>
              <span
                className={`text-[10.5px] font-bold tabular-nums ${convCls}`}
              >
                {conv === null ? "–" : PCT.format(conv)}
              </span>
            </Link>
          );
        })}
      </div>

      {overall !== null ? (
        <div className="mt-5 flex items-center gap-3 border-t border-ink/[0.06] pt-4">
          <span className="shrink-0 text-[12px] font-semibold text-ink-soft">
            Conversion gesamt
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
            <span
              aria-hidden
              className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              style={{ width: `${Math.max(2, overall * 100)}%` }}
            />
          </span>
          <span className="shrink-0 text-[15px] font-bold tabular-nums text-emerald-600">
            {PCT.format(overall)}
          </span>
        </div>
      ) : null}
    </section>
  );
}
