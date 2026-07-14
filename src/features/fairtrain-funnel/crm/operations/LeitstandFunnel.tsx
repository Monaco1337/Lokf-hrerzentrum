/**
 * AbschlussFunnel — always-visible 9-stage closure funnel.
 *
 * Stage list is the ops process (Lead → … → Weiterbildung). Each step shows
 * an absolute count (real DB data) and a relative bar segment scaled to the
 * widest stage. Clicking a stage filters the Leads view to that bucket.
 */
import Link from "next/link";
import type { Route } from "next";

import type { LeadKpis } from "../../types";
import { LeadStatus } from "../../types";

export interface FunnelStage {
  /** Stable key for React + filters */
  key: string;
  label: string;
  /** Lead statuses that count into this stage */
  statuses: ReadonlyArray<LeadStatus>;
  href: Route;
  /** Position in the funnel — also used for the column tint */
  rank: number;
}

const STAGES: ReadonlyArray<FunnelStage> = [
  {
    key: "lead",
    label: "Lead erhalten",
    statuses: [LeadStatus.NEW],
    href: "/crm/leads?status=NEW" as Route,
    rank: 1,
  },
  {
    key: "contact",
    label: "Kontakt & Reaktion",
    statuses: [
      LeadStatus.CONTACT_PENDING,
      LeadStatus.CONTACTED,
      LeadStatus.REPLIED,
      LeadStatus.CALL_SCHEDULED,
    ],
    href: "/crm/leads?status=CONTACTED" as Route,
    rank: 2,
  },
  {
    key: "funnel",
    label: "Landingpage & Funnel",
    statuses: [
      LeadStatus.FORWARDED,
      LeadStatus.LANDINGPAGE_OPENED,
      LeadStatus.FUNNEL_STARTED,
      LeadStatus.FUNNEL_COMPLETED,
    ],
    href: "/crm/leads?status=FORWARDED" as Route,
    rank: 3,
  },
  {
    key: "qualified",
    label: "Qualifiziert",
    statuses: [LeadStatus.QUALIFIED, LeadStatus.HOT, LeadStatus.BRIEFING_SENT],
    href: "/crm/leads?status=QUALIFIED" as Route,
    rank: 4,
  },
  {
    key: "docs",
    label: "Unterlagen erhalten",
    statuses: [LeadStatus.DOC_REVIEW, LeadStatus.DOC_READY],
    href: "/crm/leads?status=DOC_READY" as Route,
    rank: 5,
  },
  {
    key: "appointment",
    label: "Agenturtermin",
    statuses: [LeadStatus.AA_APPOINTMENT_PENDING, LeadStatus.AA_APPOINTMENT_DONE],
    href: "/crm/agenturtermine" as Route,
    rank: 6,
  },
  {
    key: "voucherPending",
    label: "Gutschein beantragt",
    statuses: [LeadStatus.GUTSCHEIN_PENDING],
    href: "/crm/bildungsgutschein?status=PENDING" as Route,
    rank: 7,
  },
  {
    key: "voucherApproved",
    label: "Gutschein erhalten",
    statuses: [LeadStatus.GUTSCHEIN_APPROVED],
    href: "/crm/bildungsgutschein?status=APPROVED" as Route,
    rank: 8,
  },
  {
    key: "enrolled",
    label: "Anmeldung",
    statuses: [LeadStatus.ENROLLED],
    href: "/crm/leads?status=ENROLLED" as Route,
    rank: 9,
  },
  {
    key: "started",
    label: "Weiterbildung gestartet",
    statuses: [LeadStatus.STARTED, LeadStatus.CLOSED],
    href: "/crm/leads?status=STARTED" as Route,
    rank: 10,
  },
];

export interface FunnelData {
  stageCounts: Record<string, number>;
  newToday: number;
  conversionRate: number;
}

export function buildFunnel(kpis: LeadKpis): FunnelData {
  const stageCounts: Record<string, number> = {};
  for (const stage of STAGES) {
    stageCounts[stage.key] = stage.statuses.reduce(
      (sum, s) => sum + (kpis.byStatus[s] ?? 0),
      0,
    );
  }
  return {
    stageCounts,
    newToday: kpis.newToday,
    conversionRate: kpis.conversionRate,
  };
}

const PERCENT_FMT = new Intl.NumberFormat("de-DE", {
  style: "percent",
  maximumFractionDigits: 1,
});

export function AbschlussFunnel({ funnel }: { funnel: FunnelData }) {
  const maxCount = Math.max(
    1,
    ...STAGES.map((s) => funnel.stageCounts[s.key] ?? 0),
  );
  return (
    <section aria-labelledby="funnel-heading" className="ops-card p-5">
      <header className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="ops-eyebrow">Abschluss-Funnel</p>
          <h2
            id="funnel-heading"
            className="mt-1 text-[18px] font-bold tracking-tight text-white"
          >
            Lead → Weiterbildung
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="ops-chip ops-chip-slate">
            +{funnel.newToday} heute
          </span>
          <span className="ops-chip ops-chip-green">
            Conv {PERCENT_FMT.format(funnel.conversionRate)}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 md:grid-cols-5 xl:grid-cols-10">
        {STAGES.map((stage) => {
          const value = funnel.stageCounts[stage.key] ?? 0;
          const ratio = value / maxCount;
          const isWon = stage.rank >= 8;
          const isCold = value === 0;
          return (
            <Link
              key={stage.key}
              href={stage.href}
              className="group flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 transition hover:border-white/[0.18] hover:bg-white/[0.05]"
            >
              <span
                className={[
                  "text-[10px] font-semibold uppercase tracking-wider",
                  isCold ? "text-zinc-500" : "text-zinc-400",
                ].join(" ")}
              >
                {String(stage.rank).padStart(2, "0")}
              </span>
              <div className="flex items-baseline gap-1">
                <span
                  className={[
                    "text-[22px] font-bold leading-none tabular-nums transition",
                    isWon
                      ? "text-emerald-300 group-hover:text-emerald-200"
                      : isCold
                        ? "text-zinc-500"
                        : "text-white",
                  ].join(" ")}
                >
                  {value}
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  aria-hidden
                  className={[
                    "h-full rounded-full transition-all",
                    isWon
                      ? "bg-emerald-400/80"
                      : isCold
                        ? "bg-zinc-700"
                        : "bg-orange-400/80",
                  ].join(" ")}
                  style={{ width: `${Math.max(2, ratio * 100)}%` }}
                />
              </div>
              <span className="text-[11.5px] leading-tight text-zinc-300">
                {stage.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
