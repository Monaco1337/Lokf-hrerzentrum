/**
 * Funnel visualisation used inside the CRM dashboard.
 *
 * Renders the lead pipeline as five proportional "pillars": Eingang →
 * Heiß → Vorbereitung → Behörde → Bewilligt. Heights scale relative to the
 * pillar with the most leads so the dominant phase is always full. Each
 * pillar is also a deep-link into the leads list with a status filter.
 *
 * Separation rationale: keeps Dashboard.tsx below the 300-line guardrail
 * while still letting the dashboard own composition.
 */
import Link from "next/link";

import { LeadStatus } from "../types";

export interface FunnelGroup {
  label: string;
  hint: string;
  statuses: ReadonlyArray<LeadStatus>;
  /** Visual tone — drives gradient + chip colour. */
  tone: "ingress" | "qualified" | "prep" | "agency" | "won";
}

export const FUNNEL_GROUPS: ReadonlyArray<FunnelGroup> = [
  {
    label: "Eingang",
    hint: "Neu · Qualifiziert · Kontakt geplant",
    statuses: [
      LeadStatus.NEW,
      LeadStatus.QUALIFIED,
      LeadStatus.CONTACT_PENDING,
    ],
    tone: "ingress",
  },
  {
    label: "Heiß",
    hint: "Hot, noch unkontaktiert",
    statuses: [LeadStatus.HOT],
    tone: "qualified",
  },
  {
    label: "Vorbereitung",
    hint: "Kontakt · Briefing · Dokumente",
    statuses: [
      LeadStatus.CONTACTED,
      LeadStatus.CALL_SCHEDULED,
      LeadStatus.BRIEFING_SENT,
      LeadStatus.DOC_PENDING,
      LeadStatus.DOC_READY,
    ],
    tone: "prep",
  },
  {
    label: "Behörde",
    hint: "AA-Termin · Gutschein offen",
    statuses: [
      LeadStatus.AA_APPOINTMENT_PENDING,
      LeadStatus.AA_APPOINTMENT_DONE,
      LeadStatus.GUTSCHEIN_PENDING,
      LeadStatus.GUTSCHEIN_APPROVED,
    ],
    tone: "agency",
  },
  {
    label: "Erfolg",
    hint: "Vertrag · Ausbildung · Abschluss",
    statuses: [LeadStatus.ENROLLED, LeadStatus.STARTED, LeadStatus.CLOSED],
    tone: "won",
  },
];

const TONE: Record<
  FunnelGroup["tone"],
  { bar: string; dot: string; count: string; shadow: string }
> = {
  ingress: {
    bar: "bg-gradient-to-t from-slate-400 to-slate-300",
    dot: "bg-slate-400",
    count: "text-slate-600",
    shadow: "shadow-[0_8px_20px_-8px_rgba(100,116,139,0.5)]",
  },
  qualified: {
    bar: "bg-gradient-to-t from-accent-700 to-accent-500",
    dot: "bg-accent-600",
    count: "text-accent-700",
    shadow: "shadow-[0_10px_24px_-8px_rgba(63,114,72,0.5)]",
  },
  prep: {
    bar: "bg-gradient-to-t from-brand-600 to-brand-400",
    dot: "bg-brand-600",
    count: "text-brand-700",
    shadow: "shadow-[0_10px_24px_-8px_rgba(37,99,235,0.5)]",
  },
  agency: {
    bar: "bg-gradient-to-t from-indigo-600 to-indigo-400",
    dot: "bg-indigo-500",
    count: "text-indigo-700",
    shadow: "shadow-[0_10px_24px_-8px_rgba(99,102,241,0.5)]",
  },
  won: {
    bar: "bg-gradient-to-t from-emerald-600 to-emerald-400",
    dot: "bg-emerald-500",
    count: "text-emerald-700",
    shadow: "shadow-[0_10px_24px_-8px_rgba(16,185,129,0.5)]",
  },
};

interface DashboardFunnelProps {
  byStatus: Record<LeadStatus, number>;
}

export function DashboardFunnel({ byStatus }: DashboardFunnelProps) {
  const counts = FUNNEL_GROUPS.map((g) =>
    g.statuses.reduce((acc, s) => acc + (byStatus[s] ?? 0), 0),
  );
  const total = counts.reduce((acc, n) => acc + n, 0);
  const max = Math.max(1, ...counts);

  return (
    <section
      aria-labelledby="funnel-heading"
      className="card-premium p-6 md:p-8"
    >
      <header className="flex items-end justify-between gap-4">
        <div>
          <h2
            id="funnel-heading"
            className="text-lg font-semibold tracking-tight text-ink"
          >
            Pipeline-Verteilung
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Wo deine Leads gerade stehen — klicke eine Phase, um nur diese
            anzuzeigen.
          </p>
        </div>
        <span className="hidden text-[11px] uppercase tracking-[0.18em] text-ink-muted sm:inline">
          {total === 0
            ? "Noch keine Leads"
            : `${total} aktive Leads insgesamt`}
        </span>
      </header>

      <div className="mt-7 grid grid-cols-5 items-end gap-2 md:gap-3">
        {FUNNEL_GROUPS.map((g, i) => {
          const count = counts[i] ?? 0;
          const heightPct = total === 0 ? 0 : Math.max(10, (count / max) * 100);
          const share = total === 0 ? 0 : Math.round((count / total) * 100);
          const tone = TONE[g.tone];
          const filterParam = g.statuses.join(",");
          const isLast = i === FUNNEL_GROUPS.length - 1;
          return (
            <div key={g.label} className="relative flex flex-col">
              {!isLast && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-1.5 top-[72px] z-10 hidden text-ink-muted/40 md:block md:top-[92px]"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </span>
              )}
              <Link
                href={`/crm/leads?status=${filterParam}`}
                className="group flex h-full flex-col rounded-2xl border border-ink/5 bg-white/40 p-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-ink/15 hover:bg-white hover:shadow-card"
              >
                <div className="relative flex h-32 w-full items-end justify-center overflow-hidden rounded-xl bg-gradient-to-b from-surface-muted/70 to-surface-muted/30 ring-1 ring-inset ring-ink/[0.04] md:h-40">
                  {/* baseline grid lines */}
                  <span aria-hidden className="absolute inset-x-2 top-1/4 h-px bg-ink/[0.04]" />
                  <span aria-hidden className="absolute inset-x-2 top-1/2 h-px bg-ink/[0.04]" />
                  <span aria-hidden className="absolute inset-x-2 top-3/4 h-px bg-ink/[0.04]" />
                  <div
                    aria-hidden
                    className={[
                      "relative w-full overflow-hidden rounded-t-xl transition-all duration-500 ease-out",
                      tone.bar,
                      count > 0 ? `opacity-100 ${tone.shadow}` : "opacity-25",
                    ].join(" ")}
                    style={{ height: `${heightPct}%` }}
                  >
                    {/* glossy inner highlight */}
                    <span className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent" />
                  </div>
                  <span
                    className={[
                      "absolute inset-x-0 top-2.5 text-center font-display text-2xl font-extrabold tabular-nums tracking-tight transition-transform duration-300 group-hover:scale-110 md:text-3xl",
                      count > 0 ? tone.count : "text-ink-muted/50",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                  {count > 0 && (
                    <span className="absolute bottom-1.5 right-2 rounded-md bg-white/85 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-ink-soft shadow-sm backdrop-blur-sm">
                      {share}%
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className={["h-1.5 w-1.5 shrink-0 rounded-full", tone.dot].join(" ")}
                  />
                  <span className="truncate text-[12px] font-semibold tracking-tight text-ink md:text-[13px]">
                    {g.label}
                  </span>
                </div>
                <span className="mt-0.5 text-[11px] leading-snug text-ink-muted">
                  {g.hint}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
