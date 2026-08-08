/**
 * Dashboard — the operative Operations Center (formerly "Leitstand").
 *
 * Built around the real application process: in seconds an operator sees what
 * matters. Scoped to leadType=neu (see DashboardLoader) — no reactivation/alt/
 * marketing noise.
 *
 * Design intent: a dense, premium command surface — nothing stretched out.
 * Layout (top → bottom, fully responsive):
 *   1. Slim command hero — greeting + date + "heute eingegangen"
 *   2. Compact KPI row — four clickable metric cards with trend flourish
 *   3. Bewerbungs-Pipeline — one coherent funnel with conversion rates
 *   4. Work cards side-by-side — Neue Funnel-Leads · Neue Unterlagen · Aktivität
 *   5. Rückruf-Center — full width, two-up on wide screens
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

type KpiTone = "blue" | "orange" | "sky" | "emerald";

interface KpiCard {
  label: string;
  value: number;
  href: string;
  tone: KpiTone;
  icon: ReactNode;
}

const KPI_TONE: Record<
  KpiTone,
  { ring: string; icon: string; value: string; spark: string; glow: string }
> = {
  blue: {
    ring: "hover:ring-blue-200",
    icon: "bg-blue-50 text-blue-600",
    value: "text-blue-700",
    spark: "#60a5fa",
    glow: "from-blue-500/[0.10]",
  },
  orange: {
    ring: "hover:ring-orange-200",
    icon: "bg-orange-50 text-orange-600",
    value: "text-orange-700",
    spark: "#fb923c",
    glow: "from-orange-500/[0.10]",
  },
  sky: {
    ring: "hover:ring-sky-200",
    icon: "bg-sky-50 text-sky-600",
    value: "text-sky-700",
    spark: "#38bdf8",
    glow: "from-sky-500/[0.10]",
  },
  emerald: {
    ring: "hover:ring-emerald-200",
    icon: "bg-emerald-50 text-emerald-600",
    value: "text-emerald-700",
    spark: "#4ade80",
    glow: "from-emerald-500/[0.10]",
  },
};

/**
 * A restrained decorative trend flourish that mirrors the reference's KPI
 * silhouette. Purely visual (aria-hidden) — it makes no numeric claim, so no
 * business metric is fabricated.
 */
function Sparkline({ color }: { color: string }) {
  return (
    <svg
      aria-hidden
      width="70"
      height="22"
      viewBox="0 0 70 22"
      fill="none"
      className="shrink-0 opacity-90"
    >
      <path
        d="M1 17 L11 13 L20 15 L30 8 L40 11 L50 5 L59 8 L69 3"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FunnelIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.71 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.71A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      <span
        aria-hidden
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${t.glow} to-transparent blur-xl`}
      />
      <div className="relative flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.icon}`} aria-hidden>
          {card.icon}
        </span>
        <Sparkline color={t.spark} />
      </div>
      <p className={`relative mt-3 text-[34px] font-bold leading-none tabular-nums ${t.value}`}>
        {card.value}
      </p>
      <div className="relative mt-1.5 flex items-center justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-ink-soft">{card.label}</p>
        <svg className="h-4 w-4 text-ink-muted/40 transition group-hover:translate-x-0.5 group-hover:text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </div>
    </>
  );
  const cls = `group relative flex flex-col overflow-hidden rounded-2xl border border-ink/[0.07] bg-white p-4 shadow-card ring-1 ring-transparent transition hover:-translate-y-0.5 ${t.ring}`;
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

  return (
    <div className="space-y-4">
      {/* 1) Slim command hero */}
      <header
        className="ops-hero relative flex flex-col gap-3 rounded-2xl px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6"
        style={
          {
            "--ops-hero-image": "url(/brand/dashboard-hero.jpg)",
          } as CSSProperties
        }
      >
        <span aria-hidden className="ops-hero__art" />
        <div className="relative min-w-0">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#6b776f]">
            Dashboard · Operations Center
          </p>
          <h1 className="mt-1 font-display text-[22px] font-bold tracking-tight text-white sm:text-[27px]">
            Guten Tag, {firstName}
            <span aria-hidden className="ml-1.5 align-middle">
              👋
            </span>
          </h1>
          <p className="mt-0.5 text-[13px] font-medium text-[#9aa6a0]">
            {DATE_FMT.format(new Date())}
          </p>
        </div>
        <div className="relative flex shrink-0 items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.06] px-3.5 py-1.5 backdrop-blur">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
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
