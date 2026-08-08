/**
 * Dashboard — the operative Operations Center (formerly "Leitstand").
 *
 * Built around the real application process (leadType=neu — see DashboardLoader).
 * A dense, premium dark command surface. All accent colour comes from the
 * bespoke, remap-proof `.dash-*` layer in globals.css (the generic [data-ops]
 * remap would otherwise flatten light utilities into grey), so every metric
 * keeps a vivid, cohesive identity.
 *
 * Layout (top → bottom, responsive):
 *   1. Slim command hero — greeting, date, "heute eingegangen"
 *   2. Compact KPI row — four clickable metric cards
 *   3. Bewerbungs-Pipeline — one coherent funnel with conversion rates
 *   4. Work cards side-by-side — Neue Funnel-Leads · Neue Unterlagen · Aktivität
 *   5. Rückruf-Center — full width
 *   6. WhatsApp-Statistik — collapsible
 */
import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties, ReactNode } from "react";

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

interface KpiCard {
  label: string;
  value: number;
  href: string;
  /** `.dash-t-*` modifier that drives the card's accent colour. */
  toneClass: string;
  icon: ReactNode;
}

function FunnelIcon() {
  return (
    <svg className="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg className="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.71 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.71A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg className="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="h-[19px] w-[19px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 4 5v6c0 5 3.4 8.5 8 10 4.6-1.5 8-5 8-10V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg className="h-[17px] w-[17px] opacity-40 transition group-hover:translate-x-0.5 group-hover:opacity-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function isAnchor(href: string): boolean {
  return href.startsWith("#");
}

function KpiCardView({ card }: { card: KpiCard }) {
  const inner = (
    <>
      <div className="relative flex items-center justify-between">
        <span className="dash-tile" aria-hidden>
          {card.icon}
        </span>
        <span className="text-[var(--text-tertiary)]">
          <ArrowIcon />
        </span>
      </div>
      <p className="dash-num relative mt-4 text-[38px]">{card.value}</p>
      <p className="relative mt-1.5 text-[12.5px] font-semibold text-[#aab4ae]">
        {card.label}
      </p>
    </>
  );
  const cls = `dash-card dash-glow ${card.toneClass} group flex flex-col p-4`;
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

export function Dashboard(data: DashboardData) {
  const firstName = data.user.name.trim().split(/\s+/)[0] ?? data.user.name;

  const kpis: KpiCard[] = [
    {
      label: "Neue Funnel-Leads",
      value: data.hero.newFunnel,
      href: "#neue-funnel-leads",
      toneClass: "dash-t-blue",
      icon: <FunnelIcon />,
    },
    {
      label: "Rückrufe offen",
      value: data.hero.callbacksOpen,
      href: "#rueckruf-center",
      toneClass: "dash-t-amber",
      icon: <PhoneIcon />,
    },
    {
      label: "Neue Unterlagen",
      value: data.hero.docsAwaiting,
      href: "#neue-unterlagen",
      toneClass: "dash-t-cyan",
      icon: <DocIcon />,
    },
    {
      label: "Qualifizierte Bewerber",
      value: data.hero.qualified,
      href: "/crm/leads?status=QUALIFIED,HOT,DOC_REVIEW,DOC_READY,AA_APPOINTMENT_PENDING,AA_APPOINTMENT_DONE,GUTSCHEIN_PENDING,GUTSCHEIN_APPROVED,ENROLLED,STARTED",
      toneClass: "dash-t-emerald",
      icon: <CheckIcon />,
    },
  ];

  return (
    <div className="space-y-4">
      {/* 1) Slim command hero */}
      <header
        className="ops-hero relative flex flex-col gap-3 rounded-[20px] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6"
        style={
          {
            "--ops-hero-image": "url(/brand/dashboard-hero.jpg)",
          } as CSSProperties
        }
      >
        <span aria-hidden className="ops-hero__art" />
        <div className="relative min-w-0">
          <p className="dash-eyebrow">Dashboard · Operations Center</p>
          <h1 className="mt-1.5 font-display text-[23px] font-bold tracking-tight text-white sm:text-[28px]">
            Guten Tag, {firstName}
            <span aria-hidden className="ml-1.5 align-middle">
              👋
            </span>
          </h1>
          <p className="mt-1 text-[13px] font-medium text-[#9aa6a0]">
            {DATE_FMT.format(new Date())}
          </p>
        </div>
        <div className="relative flex shrink-0 items-center self-start sm:self-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.06] px-3.5 py-1.5 backdrop-blur">
            <span aria-hidden className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[12.5px] font-semibold text-white">
              <span className="tabular-nums">{data.newToday}</span>{" "}
              <span className="font-medium text-[#9aa6a0]">heute eingegangen</span>
            </span>
          </span>
        </div>
      </header>

      {/* 2) Compact KPI row */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {kpis.map((c) => (
          <KpiCardView key={c.label} card={c} />
        ))}
      </div>

      {/* 3) Pipeline */}
      <DashboardPipeline byStatus={data.byStatus} />

      {/* 4) Work cards — side by side, not stretched */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardNewFunnel leads={data.newFunnelLeads.slice(0, 6)} />
        <DashboardUnterlagen
          count={data.documents.count}
          leads={data.documents.leads.slice(0, 6)}
        />
        <DashboardTimeline events={data.timeline} />
      </div>

      {/* 5) Rückruf-Center — full width, action-rich */}
      <DashboardCallbacks leads={data.callbacks} />

      {/* 6) WhatsApp — collapsible */}
      <DashboardWhatsApp kpis={data.whatsapp} />
    </div>
  );
}
