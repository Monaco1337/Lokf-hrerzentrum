/**
 * KritischeAlarme — large clickable alarm tiles for the Leitstand.
 *
 * 7 fixed cards (per ops brief). Each shows a real count, a one-line action
 * label, and links into a pre-filtered view. Cards stay visible when count
 * = 0 but render in a muted "alles ruhig" state so the operator instantly
 * sees the room is clean instead of an empty section.
 */
import Link from "next/link";
import type { Route } from "next";

import { SyncPipelineButton } from "./SyncPipelineButton";

export interface AlarmCounts {
  hotUncontacted: number;
  callbacksOverdue: number;
  voucherBlocked: number;
  leadsUnassigned: number;
  slaBreached: number;
  appointmentsToday: number;
  documentsMissing: number;
}

interface AlarmDef {
  key: keyof AlarmCounts;
  label: string;
  hint: string;
  href: Route;
  tone: "red" | "orange" | "amber" | "blue";
}

const ALARMS: ReadonlyArray<AlarmDef> = [
  {
    key: "hotUncontacted",
    label: "Hot Leads unkontaktiert",
    hint: "Sofort anrufen — höchste Schließwahrscheinlichkeit",
    href: "/crm/leads?priority=HOT&uncontacted=1" as Route,
    tone: "red",
  },
  {
    key: "callbacksOverdue",
    label: "Rückrufe überfällig",
    hint: "Termin verstrichen — vertrauen rettet sich nur durch Anruf",
    href: "/crm/sales/followups" as Route,
    tone: "red",
  },
  {
    key: "voucherBlocked",
    label: "Bildungsgutscheine blockiert",
    hint: "Antrag/Bewilligung hakt — Behörde nachfassen",
    href: "/crm/bildungsgutschein" as Route,
    tone: "orange",
  },
  {
    key: "leadsUnassigned",
    label: "Leads ohne Bearbeiter",
    hint: "Niemand verantwortlich — Owner sofort setzen",
    href: "/crm/leads?unassigned=1" as Route,
    tone: "amber",
  },
  {
    key: "slaBreached",
    label: "SLA-Verstöße",
    hint: "Reaktionsfrist überschritten — eskalieren",
    href: "/crm/leads?sla=1" as Route,
    tone: "red",
  },
  {
    key: "appointmentsToday",
    label: "Agenturtermine heute",
    hint: "Vorbereitung sicherstellen — Unterlagen prüfen",
    href: "/crm/agenturtermine" as Route,
    tone: "blue",
  },
  {
    key: "documentsMissing",
    label: "Unterlagen fehlen",
    hint: "Anforderung versenden — Funnel hängt sonst",
    href: "/crm/unterlagen" as Route,
    tone: "orange",
  },
];

const TONE_MAP = {
  red: {
    border: "border-red-500/30",
    bg: "bg-gradient-to-br from-red-500/[0.12] via-red-500/[0.06] to-transparent",
    pill: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
    value: "text-red-300",
    dot: "bg-red-500",
  },
  orange: {
    border: "border-orange-500/30",
    bg: "bg-gradient-to-br from-orange-500/[0.10] via-orange-500/[0.05] to-transparent",
    pill: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30",
    value: "text-orange-300",
    dot: "bg-orange-500",
  },
  amber: {
    border: "border-amber-500/30",
    bg: "bg-gradient-to-br from-amber-500/[0.10] via-amber-500/[0.05] to-transparent",
    pill: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
    value: "text-amber-300",
    dot: "bg-amber-500",
  },
  blue: {
    border: "border-blue-500/30",
    bg: "bg-gradient-to-br from-blue-500/[0.10] via-blue-500/[0.05] to-transparent",
    pill: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30",
    value: "text-blue-300",
    dot: "bg-blue-500",
  },
} as const;

export function KritischeAlarme({ alarms }: { alarms: AlarmCounts }) {
  return (
    <section aria-labelledby="alarme-heading">
      <header className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-eyebrow">Kritische operative Alarme</p>
          <h2
            id="alarme-heading"
            className="mt-1 text-[18px] font-bold tracking-tight text-white"
          >
            Was jetzt eingreift, sichert den Abschluss
          </h2>
        </div>
        <SyncPipelineButton />
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ALARMS.map((alarm) => {
          const value = alarms[alarm.key];
          const isQuiet = value === 0;
          const tone = TONE_MAP[alarm.tone];
          return (
            <Link
              key={alarm.key}
              href={alarm.href}
              className={[
                "group relative overflow-hidden rounded-xl border p-4 transition",
                isQuiet
                  ? "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                  : `${tone.border} ${tone.bg} hover:brightness-110`,
              ].join(" ")}
              aria-label={`${alarm.label}: ${value}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={[
                      "h-2 w-2 rounded-full",
                      isQuiet ? "bg-emerald-500/60" : tone.dot,
                    ].join(" ")}
                  />
                  <span className="text-[11.5px] font-semibold uppercase tracking-wider text-zinc-400">
                    {isQuiet ? "Alles ruhig" : "Eskalation"}
                  </span>
                </div>
                <svg
                  className="h-4 w-4 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-zinc-300"
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
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span
                  className={[
                    "text-[34px] font-bold leading-none tabular-nums",
                    isQuiet ? "text-zinc-500" : tone.value,
                  ].join(" ")}
                >
                  {value}
                </span>
              </div>
              <p className="mt-2 text-[13.5px] font-semibold text-white">
                {alarm.label}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-400">
                {alarm.hint}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
