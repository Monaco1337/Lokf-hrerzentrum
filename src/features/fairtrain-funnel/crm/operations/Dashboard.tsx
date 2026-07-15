/**
 * Dashboard — the operative Operations Center (formerly "Leitstand").
 *
 * Built around the real application process: in seconds an operator sees what
 * must be worked today. Scoped to leadType=neu (see DashboardLoader) — no
 * reactivation/alt/marketing noise.
 *
 * Layout (top → bottom, fully responsive):
 *   1. Hero — four big, clickable KPI cards
 *   2. Heute bearbeiten — the concrete task list for today
 *   3. Bewerbungs-Pipeline — compact, with conversion rates between phases
 *   4. Rückruf-Center + Neue Unterlagen  |  Aktivität (business events only)
 *   5. WhatsApp-Statistik — collapsible
 */
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import type { DashboardData } from "./DashboardLoader";
import { DashboardCallbacks } from "./DashboardCallbacks";
import { DashboardNewFunnel } from "./DashboardNewFunnel";
import { DashboardPipeline } from "./DashboardPipeline";
import { DashboardTimeline } from "./DashboardTimeline";
import { DashboardUnterlagen } from "./DashboardUnterlagen";
import { DashboardWhatsApp } from "./DashboardWhatsApp";

const DATE_FMT = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

type KpiTone = "blue" | "orange" | "sky" | "emerald";

interface KpiCard {
  label: string;
  value: number;
  href: string;
  tone: KpiTone;
  icon: ReactNode;
}

const KPI_TONE: Record<KpiTone, { ring: string; icon: string; value: string }> = {
  blue: { ring: "hover:ring-blue-200", icon: "bg-blue-50 text-blue-600", value: "text-blue-700" },
  orange: { ring: "hover:ring-orange-200", icon: "bg-orange-50 text-orange-600", value: "text-orange-700" },
  sky: { ring: "hover:ring-sky-200", icon: "bg-sky-50 text-sky-600", value: "text-sky-700" },
  emerald: { ring: "hover:ring-emerald-200", icon: "bg-emerald-50 text-emerald-600", value: "text-emerald-700" },
};

function FunnelIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.71 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.71A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function isAnchor(href: string): boolean {
  return href.startsWith("#");
}

function KpiCardView({ card }: { card: KpiCard }) {
  const t = KPI_TONE[card.tone];
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${t.icon}`} aria-hidden>
          {card.icon}
        </span>
        <svg className="h-5 w-5 text-ink-muted/40 transition group-hover:translate-x-0.5 group-hover:text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>
      <p className={`mt-4 text-[42px] font-bold leading-none tabular-nums ${t.value}`}>
        {card.value}
      </p>
      <p className="mt-2 text-[13px] font-semibold text-ink-soft">{card.label}</p>
    </>
  );
  const cls = `group flex flex-col rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-card ring-1 ring-transparent transition ${t.ring}`;
  return isAnchor(card.href) ? (
    <a href={card.href} className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={card.href as Route} className={cls}>
      {inner}
    </Link>
  );
}

interface TodoRow {
  label: string;
  hint: string;
  value: number;
  href: string;
}

function TodoRowView({ row }: { row: TodoRow }) {
  const active = row.value > 0;
  const inner = (
    <>
      <span className="flex items-center gap-3">
        <span
          aria-hidden
          className={`h-2 w-2 rounded-full ${active ? "bg-brand-500" : "bg-ink/15"}`}
        />
        <span>
          <span className="block text-[13.5px] font-semibold text-ink group-hover:text-navy-950">
            {row.label}
          </span>
          <span className="block text-[11.5px] text-ink-muted">{row.hint}</span>
        </span>
      </span>
      <span className="flex items-center gap-2">
        <span className={`text-[22px] font-bold tabular-nums ${active ? "text-navy-950" : "text-ink-muted"}`}>
          {row.value}
        </span>
        <svg className="h-4 w-4 text-ink-muted/50 transition group-hover:translate-x-0.5 group-hover:text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </span>
    </>
  );
  const cls = "group flex items-center justify-between gap-3 px-5 py-3.5 transition hover:bg-surface-subtle/70";
  return isAnchor(row.href) ? (
    <a href={row.href} className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={row.href as Route} className={cls}>
      {inner}
    </Link>
  );
}

export function Dashboard(data: DashboardData) {
  const firstName = data.user.name.trim().split(/\s+/)[0] ?? data.user.name;

  const kpis: KpiCard[] = [
    {
      label: "Neue Funnel-Leads",
      value: data.hero.newFunnel,
      href: "#neue-funnel-leads",
      tone: "blue",
      icon: <FunnelIcon />,
    },
    {
      label: "Rückrufe offen",
      value: data.hero.callbacksOpen,
      href: "#rueckruf-center",
      tone: "orange",
      icon: <PhoneIcon />,
    },
    {
      label: "Neue Unterlagen",
      value: data.hero.docsAwaiting,
      href: "#neue-unterlagen",
      tone: "sky",
      icon: <DocIcon />,
    },
    {
      label: "Qualifizierte Bewerber",
      value: data.hero.qualified,
      href: "/crm/leads?status=QUALIFIED,HOT,DOC_REVIEW,DOC_READY,AA_APPOINTMENT_PENDING,AA_APPOINTMENT_DONE,GUTSCHEIN_PENDING,GUTSCHEIN_APPROVED,ENROLLED,STARTED",
      tone: "emerald",
      icon: <CheckIcon />,
    },
  ];

  const todos: TodoRow[] = [
    {
      label: "Neue Funnel-Leads",
      hint: "Eignungscheck gestartet oder abgeschlossen",
      value: data.todo.newFunnel,
      href: "#neue-funnel-leads",
    },
    {
      label: "Neue Unterlagen",
      hint: "Dokumente warten auf Prüfung",
      value: data.todo.docsAwaiting,
      href: "#neue-unterlagen",
    },
    {
      label: "Rückrufe",
      hint: "Bewerber wünschen einen Rückruf",
      value: data.todo.callbacks,
      href: "#rueckruf-center",
    },
    {
      label: "Fehlende Bearbeitung",
      hint: "Ohne Bearbeiter oder manuelle Prüfung nötig",
      value: data.todo.needsHandling,
      href: "/crm/leads?unassigned=1",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Dashboard · Operations Center
        </p>
        <h1 className="font-display text-[26px] font-bold tracking-tight text-navy-950 sm:text-[30px]">
          Guten Tag, {firstName}
          <span className="ml-2 text-[16px] font-medium text-ink-muted">
            {DATE_FMT.format(new Date())}
          </span>
        </h1>
      </header>

      {/* 1) Hero KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((c) => (
          <KpiCardView key={c.label} card={c} />
        ))}
      </div>

      {/* 2) Heute bearbeiten */}
      <section className="overflow-hidden rounded-2xl border border-ink/[0.07] bg-white shadow-card">
        <header className="flex items-center gap-2.5 border-b border-ink/[0.06] px-5 py-4">
          <span aria-hidden className="text-[18px]">📋</span>
          <h2 className="text-[16px] font-bold tracking-tight text-navy-950">
            Heute bearbeiten
          </h2>
        </header>
        <div className="divide-y divide-ink/[0.05]">
          {todos.map((row) => (
            <TodoRowView key={row.label} row={row} />
          ))}
        </div>
      </section>

      {/* 3) Pipeline */}
      <DashboardPipeline byStatus={data.byStatus} />

      {/* 4) Work cards + business timeline */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <DashboardNewFunnel leads={data.newFunnelLeads} />
          <DashboardCallbacks leads={data.callbacks} />
          <DashboardUnterlagen
            count={data.documents.count}
            leads={data.documents.leads}
          />
        </div>
        <DashboardTimeline events={data.timeline} />
      </div>

      {/* 5) WhatsApp — collapsible */}
      <DashboardWhatsApp kpis={data.whatsapp} />
    </div>
  );
}
