/**
 * Executive KPI strip for the Lead Control Center.
 *
 * Two-tiered: a hero row of four headline metrics (Pipeline, Hot, Conversion,
 * Förderquote) plus a compact secondary strip of four supporting metrics
 * (Neu heute, Ø Bearbeitungszeit, Gutscheine bewilligt, Ausbildungsstarts).
 *
 * Design notes:
 *   - The hero cards carry the visual weight: gradient top rule, tinted icon,
 *     soft corner glow on hover, oversized tabular-nums value.
 *   - The secondary strip is intentionally calmer (no glow, smaller icon) so
 *     the eye reads the hero row first, then drops into the detail row.
 *   - Every card is a deep-link. Where the metric is a ratio the link target
 *     is the next-best-action list (e.g. Conversion → CLOSED/Won leads).
 *   - Naming: `HeroKpiRow` stays exported as an alias of `ExecutiveKpiStrip`
 *     so any older imports keep working.
 */
import Link from "next/link";
import type { ComponentProps } from "react";

import type { LeadKpis } from "../types";
import { formatHours, formatPercent, KPI_ACCENT, type KpiAccent } from "./DashboardKpiAccent";
import { KPI_ICONS } from "./DashboardKpiIcons";

type LinkHref = ComponentProps<typeof Link>["href"];
type Accent = KpiAccent;

interface KpiStripProps {
  kpis: LeadKpis;
}

export function ExecutiveKpiStrip({ kpis }: KpiStripProps) {
  const wonShare = formatPercent(kpis.conversionRate);
  const foerderShare = formatPercent(kpis.foerderquote);
  const hotShare =
    kpis.total === 0
      ? "—"
      : `${Math.round((kpis.hot / kpis.total) * 100)} %`;
  const avgHours = formatHours(kpis.avgProcessingHours);

  return (
    <div className="space-y-4">
      {/* Hero row — four executive headline metrics */}
      <section
        aria-label="Executive KPIs"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <HeroCard
          label="Pipeline gesamt"
          value={kpis.total}
          sub={
            kpis.total === 0
              ? "Noch keine Leads"
              : `${kpis.docsOpen} mit offenen Unterlagen`
          }
          accent="brand"
          href="/crm/leads"
          icon={KPI_ICONS.layers}
        />
        <HeroCard
          label="Hot Leads"
          value={kpis.hot}
          sub={kpis.total === 0 ? "—" : `${hotShare} der Pipeline`}
          accent="hot"
          href="/crm/leads?priority=HOT"
          icon={KPI_ICONS.flame}
        />
        <HeroCard
          label="Conversion"
          value={wonShare}
          sub={
            kpis.total === 0
              ? "—"
              : "Gewonnene Vorgänge (ohne Blockiert/Abgelehnt)"
          }
          accent="won"
          href="/crm/leads?status=CLOSED"
          icon={KPI_ICONS.trending}
        />
        <HeroCard
          label="Förderquote"
          value={foerderShare}
          sub={
            kpis.gutscheinPending + kpis.gutscheinApproved === 0
              ? "Noch keine Anträge"
              : `${kpis.gutscheinApproved} von ${
                  kpis.gutscheinPending + kpis.gutscheinApproved
                } Anträgen bewilligt`
          }
          accent="approve"
          href="/crm/leads?status=GUTSCHEIN_APPROVED"
          icon={KPI_ICONS.award}
        />
      </section>

      {/* Secondary strip — operational signals at a glance */}
      <section
        aria-label="Operative Kennzahlen"
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <SecondaryCard
          label="Neu heute"
          value={kpis.newToday}
          sub={kpis.newToday === 0 ? "Noch nichts heute" : "Frisch eingegangen"}
          accent="neutral"
          href="/crm/leads"
          icon={KPI_ICONS.sparkle}
        />
        <SecondaryCard
          label="Ø Bearbeitungszeit"
          value={avgHours}
          sub={
            kpis.avgProcessingHours === null
              ? "Noch keine abgeschlossenen Leads"
              : "Mittel der letzten 30 Tage"
          }
          accent="ink"
          href="/crm/leads?status=CLOSED"
          icon={KPI_ICONS.clock}
        />
        <SecondaryCard
          label="Gutscheine beantragt"
          value={kpis.gutscheinPending + kpis.gutscheinApproved}
          sub={
            kpis.gutscheinPending > 0
              ? `${kpis.gutscheinPending} in Bearbeitung`
              : kpis.gutscheinApproved > 0
                ? "Alle Anträge bewilligt"
                : "Noch keine Anträge"
          }
          accent="approve"
          href="/crm/leads?status=GUTSCHEIN_PENDING"
          icon={KPI_ICONS.briefcase}
        />
        <SecondaryCard
          label="Ausbildungsstarts"
          value={kpis.ausbildungsstartsMonth}
          sub={
            kpis.ausbildungsstartsMonth === 0
              ? "Diesen Monat noch keine"
              : "Diesen Monat erfolgreich"
          }
          accent="won"
          href="/crm/leads?status=CLOSED"
          icon={KPI_ICONS.flag}
        />
      </section>
    </div>
  );
}

// Back-compat alias so any older callers keep working.
export { ExecutiveKpiStrip as HeroKpiRow };

// ---------------------------------------------------------------------------
// Card primitives — visual accents + formatters live in DashboardKpiAccent.ts
// ---------------------------------------------------------------------------

interface CardProps {
  label: string;
  value: number | string;
  sub: string;
  accent: Accent;
  href: LinkHref;
  icon: React.ReactNode;
}

function HeroCard({ label, value, sub, accent, href, icon }: CardProps) {
  const a = KPI_ACCENT[accent];
  return (
    <Link
      href={href}
      className={[
        "group relative overflow-hidden rounded-2xl bg-white p-5 ring-1 transition-all duration-[250ms] md:p-6",
        "shadow-card hover:-translate-y-1 hover:shadow-premium",
        a.ring,
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r",
          a.bar,
        ].join(" ")}
      />
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          a.glow,
        ].join(" ")}
      />

      <span className="relative flex items-start justify-between gap-3">
        <span
          aria-hidden
          className={[
            "inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1 transition-transform duration-300 group-hover:scale-105",
            a.iconWrap,
          ].join(" ")}
        >
          {icon}
        </span>
        <span
          aria-hidden
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/10 bg-white text-ink-muted shadow-sm transition-all duration-200 group-hover:border-ink/20 group-hover:translate-x-0.5"
        >
          {KPI_ICONS.chevron}
        </span>
      </span>

      <span className="relative mt-4 block text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
        {label}
      </span>
      <span
        className={[
          "relative mt-1.5 block font-display text-[40px] font-extrabold leading-none tabular-nums tracking-tight md:text-[46px]",
          a.value,
        ].join(" ")}
        style={{ letterSpacing: "-0.02em" }}
      >
        {value}
      </span>
      <span className="relative mt-2.5 block text-[13px] text-ink-muted">
        {sub}
      </span>
    </Link>
  );
}

function SecondaryCard({ label, value, sub, accent, href, icon }: CardProps) {
  const a = KPI_ACCENT[accent];
  return (
    <Link
      href={href}
      className={[
        "group flex items-center gap-3.5 rounded-xl bg-white p-4 ring-1 transition-all duration-[250ms] ease-out",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:-translate-y-px hover:shadow-card",
        a.ring,
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1",
          a.iconWrap,
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-soft">
          {label}
        </span>
        <span
          className={[
            "mt-0.5 block font-display text-[20px] font-extrabold leading-none tabular-nums tracking-tight",
            a.value,
          ].join(" ")}
        >
          {value}
        </span>
        <span className="mt-1 block truncate text-[12px] text-ink-muted">
          {sub}
        </span>
      </span>
      <span
        aria-hidden
        className="text-ink-muted transition-transform duration-300 group-hover:translate-x-0.5"
      >
        {KPI_ICONS.chevronSm}
      </span>
    </Link>
  );
}

