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
import { AutoRefresh } from "./AutoRefresh";
import { HeutigePrioritaeten } from "./LeitstandPrioritaeten";
import { LiveAktivitaeten } from "./LiveAktivitaeten";
import { LeitstandWhatsApp } from "./LeitstandWhatsApp";
import { LeitstandZones } from "./LeitstandZones";
import type { AlarmCounts } from "./LeitstandAlarme";
import type { WhatsAppKpis } from "../../messaging/types";

export interface LeitstandProps {
  user: UserSummary;
  kpis: LeadKpis;
  whatsapp: WhatsAppKpis;
  alarms: AlarmCounts;
  funnel: FunnelData;
  priorities: ReadonlyArray<EnrichedLeadSummary>;
  activity: ReadonlyArray<AuditLogEntry>;
  /** id → display name lookup for the activity feed */
  actors: Record<string, string>;
  livePerformance: {
    leadsToday: number;
    contactsToday: number;
    appointmentsToday: number;
    closesToday: number;
  };
}

const DATE_FMT = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

export function Leitstand({
  user,
  kpis,
  whatsapp,
  alarms,
  funnel,
  priorities,
  activity,
  actors,
  livePerformance,
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
      {/* Near-real-time sync: re-runs the loaders on an interval + on focus. */}
      <AutoRefresh />
      {/* Header strip */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ops-eyebrow">Leitstand · Operations Center</p>
          <h1 className="mt-1 font-display text-[26px] font-bold tracking-tight text-navy-950 sm:text-[30px]">
            {firstName}, Stand{" "}
            <span className="text-ink-muted">{DATE_FMT.format(today)}</span>
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

      {/* 1) Operations triage — 4 zones */}
      <LeitstandZones
        alarms={alarms}
        kpis={kpis}
        performance={livePerformance}
      />

      {/* 1b) WhatsApp status tracking KPIs */}
      <LeitstandWhatsApp kpis={whatsapp} />

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
    white: "border-ink/10 bg-white text-ink",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    red: "border-red-200 bg-red-50 text-red-700",
    slate: "border-ink/10 bg-surface-subtle text-ink-muted",
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

