/**
 * OperationalKpiBar — the "3-second" header.
 *
 * Carries the seven operational metrics an operator needs the moment they
 * land on the home screen:
 *   1. Neue Leads (heute)
 *   2. Sofort anrufen (HOT + uncontacted)
 *   3. Rückruf heute (follow-up due today)
 *   4. Überfällig (urgency = overdue)
 *   5. Qualifiziert
 *   6. Termine vereinbart (CALL_SCHEDULED + AA_APPOINTMENT_PENDING)
 *   7. Abschlüsse (ENROLLED + STARTED + CLOSED)
 *
 * Each tile is a deep-link into the matching filtered list. Large tabular-nums
 * value, status dot for tone, calm gradient micro-bar — Linear/HubSpot feel.
 */
import type { Route } from "next";
import Link from "next/link";

import {
  type EnrichedLeadSummary,
  LeadPriority,
  LeadStatus,
  type LeadKpis,
  type LeadUrgency,
} from "../types";

interface KpiTileSpec {
  key: string;
  label: string;
  hint: string;
  value: number;
  href: string;
  tone: "neutral" | "critical" | "urgent" | "warning" | "active" | "wait" | "success";
}

interface OperationalKpiBarProps {
  active: ReadonlyArray<EnrichedLeadSummary>;
  kpis: LeadKpis;
}

const FIRST_CONTACT_STATUSES: ReadonlySet<LeadStatus> = new Set([
  LeadStatus.NEW,
  LeadStatus.QUALIFIED,
  LeadStatus.HOT,
  LeadStatus.CONTACT_PENDING,
]);

function isToday(at: Date, now: Date = new Date()): boolean {
  return (
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate()
  );
}

function deriveTiles(
  active: ReadonlyArray<EnrichedLeadSummary>,
  kpis: LeadKpis,
): KpiTileSpec[] {
  const now = new Date();

  const sofortAnrufen = active.filter(
    (e) =>
      FIRST_CONTACT_STATUSES.has(e.lead.status) &&
      (e.lead.priority === LeadPriority.HOT || e.lead.status === LeadStatus.HOT),
  ).length;

  const rueckrufHeute = active.filter(
    (e) => e.lead.nextFollowUpAt && isToday(e.lead.nextFollowUpAt, now),
  ).length;

  const ueberfaellig = active.filter((e) => {
    const u: LeadUrgency = e.insights.urgency;
    return u === "overdue";
  }).length;

  const qualifiziert = active.filter(
    (e) => e.lead.status === LeadStatus.QUALIFIED,
  ).length;

  const termineVereinbart = active.filter(
    (e) =>
      e.lead.status === LeadStatus.CALL_SCHEDULED ||
      e.lead.status === LeadStatus.AA_APPOINTMENT_PENDING,
  ).length;

  const abschluesse =
    (kpis.byStatus.CLOSED ?? 0) +
    (kpis.byStatus.ENROLLED ?? 0) +
    (kpis.byStatus.STARTED ?? 0);

  return [
    {
      key: "neu",
      label: "Neue Leads",
      hint: "Heute eingegangen",
      value: kpis.newToday,
      href: "/crm/leads",
      tone: kpis.newToday > 0 ? "active" : "neutral",
    },
    {
      key: "sofort",
      label: "Sofort anrufen",
      hint: "HOT + noch unkontaktiert",
      value: sofortAnrufen,
      href: "/crm/leads?priority=HOT&status=NEW,QUALIFIED,HOT,CONTACT_PENDING",
      tone: sofortAnrufen > 0 ? "urgent" : "neutral",
    },
    {
      key: "rueckruf",
      label: "Rückruf heute",
      hint: "Fällige Folgekontakte",
      value: rueckrufHeute,
      href: "/crm/leads",
      tone: rueckrufHeute > 0 ? "warning" : "neutral",
    },
    {
      key: "ueberfaellig",
      label: "Überfällig",
      hint: "SLA / Antwortfenster überschritten",
      value: ueberfaellig,
      href: "/crm/leads?slaBreachedOnly=1",
      tone: ueberfaellig > 0 ? "critical" : "neutral",
    },
    {
      key: "qualifiziert",
      label: "Qualifiziert",
      hint: "Bereit für Kontakt",
      value: qualifiziert,
      href: "/crm/leads?status=QUALIFIED",
      tone: "active",
    },
    {
      key: "termine",
      label: "Termine",
      hint: "Anruf + AA-Termin geplant",
      value: termineVereinbart,
      href: "/crm/leads?status=CALL_SCHEDULED,AA_APPOINTMENT_PENDING",
      tone: termineVereinbart > 0 ? "wait" : "neutral",
    },
    {
      key: "abschluesse",
      label: "Abschlüsse",
      hint: "Eingeschrieben · Gestartet · Erfolgreich",
      value: abschluesse,
      href: "/crm/leads?status=ENROLLED,STARTED,CLOSED",
      tone: abschluesse > 0 ? "success" : "neutral",
    },
  ];
}

const TONE: Record<
  KpiTileSpec["tone"],
  { dot: string; bar: string; value: string }
> = {
  neutral: { dot: "bg-slate-300", bar: "from-slate-200 to-slate-300", value: "text-ink" },
  critical: { dot: "bg-red-500", bar: "from-red-400 to-red-600", value: "text-red-700" },
  urgent: { dot: "bg-accent-500", bar: "from-accent-400 to-accent-600", value: "text-accent-700" },
  warning: { dot: "bg-amber-500", bar: "from-amber-400 to-amber-600", value: "text-amber-700" },
  active: { dot: "bg-brand-500", bar: "from-brand-400 to-brand-600", value: "text-brand-700" },
  wait: { dot: "bg-indigo-500", bar: "from-indigo-400 to-indigo-600", value: "text-indigo-700" },
  success: { dot: "bg-emerald-500", bar: "from-emerald-400 to-emerald-600", value: "text-emerald-700" },
};

export function OperationalKpiBar({ active, kpis }: OperationalKpiBarProps) {
  const tiles = deriveTiles(active, kpis);

  return (
    <section
      aria-label="Operative Kennzahlen"
      className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7"
    >
      {tiles.map((t) => (
        <Tile key={t.key} tile={t} />
      ))}
    </section>
  );
}

function Tile({ tile }: { tile: KpiTileSpec }) {
  const tone = TONE[tile.tone];
  return (
    <Link
      href={tile.href as Route}
      className="group relative flex flex-col gap-1.5 overflow-hidden rounded-xl bg-white p-3.5 ring-1 ring-ink/[0.06] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-[250ms] ease-out hover:-translate-y-0.5 hover:shadow-card hover:ring-ink/15 md:p-4"
    >
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${tone.bar} opacity-80`}
      />
      <span className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
          {tile.label}
        </span>
      </span>
      <span
        className={[
          "font-display text-[28px] font-extrabold leading-none tabular-nums tracking-tight",
          tone.value,
        ].join(" ")}
        style={{ letterSpacing: "-0.02em" }}
      >
        {tile.value}
      </span>
      <span className="block truncate text-[11px] text-ink-muted">{tile.hint}</span>
    </Link>
  );
}
