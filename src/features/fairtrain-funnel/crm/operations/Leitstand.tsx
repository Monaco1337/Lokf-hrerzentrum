/**
 * Leitstand — the Lead Operations Center dashboard.
 *
 * Composition:
 *  1. KritischeAlarme   — large clickable cards for the 7 ops alarms
 *  2. AbschlussFunnel   — 9-stage funnel, always visible, every stage clickable
 *  3. HeutigePrioritaeten — auto-ranked priority list (impact, probability, SLA)
 *  4. LiveAktivitaeten  — system-wide chronological feed from real audit logs
 *
 * Everything here is server-rendered from real DB data — no mocks, no demo
 * fillers, no "Mitarbeiter dieser Woche: 23" fake stats.
 */
import type {
  AuditLogEntry,
  EnrichedLeadSummary,
  LeadKpis,
  UserSummary,
} from "../../types";
import { LeadStatus } from "../../types";

import {
  AbschlussFunnel,
  type FunnelData,
} from "./LeitstandFunnel";
import { HeutigePrioritaeten } from "./LeitstandPrioritaeten";
import { LiveAktivitaeten } from "./LiveAktivitaeten";
import {
  KritischeAlarme,
  type AlarmCounts,
} from "./LeitstandAlarme";

export interface LeitstandProps {
  user: UserSummary;
  kpis: LeadKpis;
  alarms: AlarmCounts;
  funnel: FunnelData;
  priorities: ReadonlyArray<EnrichedLeadSummary>;
  activity: ReadonlyArray<AuditLogEntry>;
  /** id → display name lookup for the activity feed */
  actors: Record<string, string>;
}

const DATE_FMT = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

export function Leitstand({
  user,
  kpis,
  alarms,
  funnel,
  priorities,
  activity,
  actors,
}: LeitstandProps) {
  const today = new Date();
  const firstName = user.name.trim().split(/\s+/)[0] ?? user.name;
  const totalActive =
    kpis.total -
    (kpis.byStatus[LeadStatus.CLOSED] ?? 0) -
    (kpis.byStatus[LeadStatus.LOST] ?? 0) -
    (kpis.byStatus[LeadStatus.REJECTED] ?? 0);

  return (
    <div className="space-y-7">
      {/* Header strip */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ops-eyebrow">Leitstand</p>
          <h1 className="mt-1 font-display text-[26px] font-bold tracking-tight text-white sm:text-[30px]">
            {firstName}, Stand{" "}
            <span className="text-zinc-500">{DATE_FMT.format(today)}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SummaryChip label="Aktive Bewerber" value={totalActive} tone="white" />
          <SummaryChip label="Heute neu" value={kpis.newToday} tone="blue" />
          <SummaryChip label="Hot" value={kpis.hot} tone="orange" />
          <SummaryChip
            label="SLA"
            value={kpis.slaBreached}
            tone={kpis.slaBreached > 0 ? "red" : "slate"}
          />
        </div>
      </header>

      {/* 1) Kritische Alarme */}
      <KritischeAlarme alarms={alarms} />

      {/* 2) Abschluss Funnel */}
      <AbschlussFunnel funnel={funnel} />

      {/* 3+4) Prioritäten + Aktivitäten */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <HeutigePrioritaeten leads={priorities} />
        <LiveAktivitaeten events={activity} actors={actors} />
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "white" | "blue" | "orange" | "red" | "slate";
}) {
  const map = {
    white: "border-white/[0.08] bg-white/[0.04] text-zinc-200",
    blue: "border-blue-500/30 bg-blue-500/10 text-blue-200",
    orange: "border-orange-500/30 bg-orange-500/10 text-orange-200",
    red: "border-red-500/30 bg-red-500/10 text-red-200",
    slate: "border-white/[0.06] bg-white/[0.03] text-zinc-400",
  } as const;
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold",
        map[tone],
      ].join(" ")}
    >
      <span className="tabular-nums text-[13px]">{value}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}

