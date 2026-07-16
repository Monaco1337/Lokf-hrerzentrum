/**
 * LeitstandZones — the operations triage above the funnel.
 *
 * Re-frames the existing alarm + KPI counts into the four questions an operator
 * actually asks on arrival:
 *   🔥 Sofort handeln      — who is bleeding value right now
 *   🎯 Heute abschließbar  — what can be won today
 *   ⚠  Blockierte Vorgänge — what is stuck and why
 *   📈 Live Performance     — today's throughput
 *
 * Pure presentation: every number is passed in from the loader (real DB data),
 * every row deep-links into the already-filtered view. No new data logic.
 */
import Link from "next/link";
import type { Route } from "next";

import { LeadStatus } from "../../types";
import type { LeadKpis } from "../../types";

import type { AlarmCounts } from "./LeitstandAlarme";

interface PerformanceCounts {
  leadsToday: number;
  contactsToday: number;
  appointmentsToday: number;
  closesToday: number;
}

type ZoneTone = "red" | "emerald" | "amber";

interface ZoneRow {
  label: string;
  value: number;
  href: Route;
}

interface ZoneDef {
  tone: ZoneTone;
  emoji: string;
  title: string;
  subtitle: string;
  rows: ZoneRow[];
}

const TONE: Record<
  ZoneTone,
  { ring: string; head: string; chipOn: string; chipOff: string; dotOn: string; valueOn: string }
> = {
  red: {
    ring: "ring-red-100",
    head: "bg-red-50 text-red-700",
    chipOn: "bg-red-50 text-red-700",
    chipOff: "bg-surface-subtle text-ink-muted",
    dotOn: "bg-red-500",
    valueOn: "text-red-600",
  },
  emerald: {
    ring: "ring-emerald-100",
    head: "bg-emerald-50 text-emerald-700",
    chipOn: "bg-emerald-50 text-emerald-700",
    chipOff: "bg-surface-subtle text-ink-muted",
    dotOn: "bg-emerald-500",
    valueOn: "text-emerald-600",
  },
  amber: {
    ring: "ring-amber-100",
    head: "bg-amber-50 text-amber-700",
    chipOn: "bg-amber-50 text-amber-700",
    chipOff: "bg-surface-subtle text-ink-muted",
    dotOn: "bg-amber-500",
    valueOn: "text-amber-600",
  },
};

function ZoneCard({ zone }: { zone: ZoneDef }) {
  const t = TONE[zone.tone];
  const total = zone.rows.reduce((sum, r) => sum + r.value, 0);
  return (
    <section
      className={[
        "flex flex-col rounded-2xl border border-ink/[0.06] bg-white p-5 shadow-card ring-1",
        total > 0 ? t.ring : "ring-transparent",
      ].join(" ")}
    >
      <header className="flex items-start gap-3">
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[16px]",
            t.head,
          ].join(" ")}
          aria-hidden
        >
          {zone.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold tracking-tight text-navy-950">
            {zone.title}
          </h2>
          <p className="mt-0.5 text-[11.5px] leading-snug text-ink-muted">
            {zone.subtitle}
          </p>
        </div>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums",
            total > 0 ? t.chipOn : t.chipOff,
          ].join(" ")}
        >
          {total}
        </span>
      </header>

      <ul className="mt-4 divide-y divide-ink/[0.05]">
        {zone.rows.map((row) => {
          const active = row.value > 0;
          return (
            <li key={row.label}>
              <Link
                href={row.href}
                className="group flex items-center justify-between gap-3 py-2.5 transition"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      active ? t.dotOn : "bg-ink/15",
                    ].join(" ")}
                  />
                  <span className="text-[13px] font-medium text-ink group-hover:text-navy-950">
                    {row.label}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={[
                      "text-[18px] font-bold leading-none tabular-nums",
                      active ? t.valueOn : "text-ink-muted",
                    ].join(" ")}
                  >
                    {row.value}
                  </span>
                  <svg
                    className="h-3.5 w-3.5 text-ink-muted/50 transition group-hover:translate-x-0.5 group-hover:text-ink-soft"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function PerfTile({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: Route;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-ink/[0.06] bg-white px-4 py-3.5 shadow-card transition hover:border-ink/15"
    >
      <p className="text-[28px] font-bold leading-none tabular-nums text-navy-950">
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </p>
    </Link>
  );
}

export function LeitstandZones({
  alarms,
  kpis,
  performance,
}: {
  alarms: AlarmCounts;
  kpis: LeadKpis;
  performance: PerformanceCounts;
}) {
  const zones: ZoneDef[] = [
    {
      tone: "red",
      emoji: "🔥",
      title: "Sofort handeln",
      subtitle: "Höchste Dringlichkeit — jetzt eingreifen",
      rows: [
        {
          label: "Hot Leads unkontaktiert",
          value: alarms.hotUncontacted,
          href: "/crm/leads?priority=HOT&uncontacted=1" as Route,
        },
        {
          label: "Rückrufe überfällig",
          value: alarms.callbacksOverdue,
          href: "/crm/sales/followups" as Route,
        },
        {
          label: "SLA-Verstöße",
          value: alarms.slaBreached,
          href: "/crm/leads?sla=1" as Route,
        },
      ],
    },
    {
      tone: "emerald",
      emoji: "🎯",
      title: "Heute abschließbar",
      subtitle: "Bereit für den nächsten Gewinn",
      rows: [
        {
          label: "Qualifizierte Leads",
          value: kpis.byStatus[LeadStatus.QUALIFIED] ?? 0,
          href: "/crm/leads?status=QUALIFIED" as Route,
        },
        {
          label: "Gutschein beantragt",
          value: kpis.gutscheinPending,
          href: "/crm/bildungsgutschein" as Route,
        },
        {
          label: "Gutschein bewilligt",
          value: kpis.gutscheinApproved,
          href: "/crm/leads?status=GUTSCHEIN_APPROVED" as Route,
        },
      ],
    },
    {
      tone: "amber",
      emoji: "⚠️",
      title: "Blockierte Vorgänge",
      subtitle: "Hängt fest — Blocker auflösen",
      rows: [
        {
          label: "Unterlagen fehlen",
          value: alarms.documentsMissing,
          href: "/crm/unterlagen" as Route,
        },
        {
          label: "Behörde / Gutschein blockiert",
          value: alarms.voucherBlocked,
          href: "/crm/bildungsgutschein" as Route,
        },
        {
          label: "Ohne Bearbeiter",
          value: alarms.leadsUnassigned,
          href: "/crm/leads?unassigned=1" as Route,
        },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {zones.map((zone) => (
          <ZoneCard key={zone.title} zone={zone} />
        ))}
      </div>

      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <span aria-hidden className="text-[15px]">
            📈
          </span>
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-soft">
            Live Performance · heute
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PerfTile
            label="Leads heute"
            value={performance.leadsToday}
            href={"/crm/leads?createdToday=1" as Route}
          />
          <PerfTile
            label="Kontakte heute"
            value={performance.contactsToday}
            href={"/crm/multichat" as Route}
          />
          <PerfTile
            label="Termine heute"
            value={performance.appointmentsToday}
            href={"/crm/agenturtermine" as Route}
          />
          <PerfTile
            label="Abschlüsse heute"
            value={performance.closesToday}
            href={"/crm/leads?status=GUTSCHEIN_APPROVED" as Route}
          />
        </div>
      </section>
    </div>
  );
}
