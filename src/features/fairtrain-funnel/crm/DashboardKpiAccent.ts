/**
 * Visual accent palette for the executive KPI strip.
 *
 * One entry per accent (brand / hot / neutral / won / approve / ink).
 * Extracted from DashboardKpis.tsx so the rendering component stays focused
 * and respects the max-lines guard.
 */
export type KpiAccent =
  | "brand"
  | "hot"
  | "neutral"
  | "won"
  | "approve"
  | "ink";

export interface KpiAccentStyle {
  ring: string;
  bar: string;
  value: string;
  iconWrap: string;
  glow: string;
}

export const KPI_ACCENT: Record<KpiAccent, KpiAccentStyle> = {
  brand: {
    ring: "ring-ink/[0.06] hover:ring-brand-200",
    bar: "from-brand-500 to-brand-700",
    value: "text-navy-950",
    iconWrap: "bg-brand-50 text-brand-700 ring-brand-100",
    glow: "bg-brand-500/10",
  },
  hot: {
    ring: "ring-accent-100 hover:ring-accent-200",
    bar: "from-accent-500 to-accent-700",
    value: "text-accent-700",
    iconWrap: "bg-accent-50 text-accent-700 ring-accent-100",
    glow: "bg-accent-500/12",
  },
  neutral: {
    ring: "ring-ink/[0.06] hover:ring-slate-300",
    bar: "from-slate-300 to-slate-500",
    value: "text-navy-950",
    iconWrap: "bg-slate-100 text-slate-600 ring-slate-200",
    glow: "bg-slate-400/10",
  },
  won: {
    ring: "ring-emerald-100 hover:ring-emerald-200",
    bar: "from-emerald-400 to-emerald-600",
    value: "text-emerald-700",
    iconWrap: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    glow: "bg-emerald-500/12",
  },
  approve: {
    ring: "ring-indigo-100 hover:ring-indigo-200",
    bar: "from-indigo-400 to-indigo-600",
    value: "text-indigo-700",
    iconWrap: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    glow: "bg-indigo-500/12",
  },
  ink: {
    ring: "ring-ink/[0.06] hover:ring-ink/15",
    bar: "from-ink/60 to-ink/80",
    value: "text-navy-950",
    iconWrap: "bg-surface-muted text-ink ring-ink/10",
    glow: "bg-ink/5",
  },
};

/** % formatter that picks 1-decimal precision under 10 % for readability. */
export function formatPercent(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) return "0 %";
  const pct = ratio * 100;
  return pct >= 10 ? `${Math.round(pct)} %` : `${pct.toFixed(1)} %`;
}

/** Friendly hours / days formatter for processing time. */
export function formatHours(h: number | null): string {
  if (h === null) return "—";
  if (h < 1) {
    const minutes = Math.max(1, Math.round(h * 60));
    return `${minutes} Min`;
  }
  if (h < 48) return `${h.toFixed(1)} h`;
  const days = h / 24;
  return `${days.toFixed(1)} Tage`;
}
