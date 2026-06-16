/**
 * PriorityBriefing — "Heute wichtig" row of the Lead Control Center.
 *
 * Renders the LeadIntelligenceService's pre-classified priority signals as a
 * row of fully-clickable, deep-linking briefing cards. The first card is
 * always the most important one of the day (critical → urgent → warning →
 * active → wait → success).
 *
 * Design notes:
 *   - Premium, executive feel: lots of whitespace, soft tint per tone, a
 *     single accent rule on the left edge that intensifies on hover.
 *   - All copy lives in PrioritySignal so the briefing stays cognitively
 *     consistent with whatever the intelligence layer decides today.
 *   - Cards self-rank in the service layer; UI just paints them in order.
 */
import Link from "next/link";
import type { ComponentProps } from "react";

import type { PrioritySignal } from "../types";

type LinkHref = ComponentProps<typeof Link>["href"];
type Tone = PrioritySignal["tone"];

interface PriorityBriefingProps {
  signals: ReadonlyArray<PrioritySignal>;
}

export function PriorityBriefing({ signals }: PriorityBriefingProps) {
  if (signals.length === 0) return null;
  return (
    <section
      aria-label="Heute wichtig"
      className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3"
    >
      {signals.map((signal) => (
        <BriefingCard key={signal.id} signal={signal} />
      ))}
    </section>
  );
}

// Back-compat: the old Dashboard imported `ActionRow`. Some callers might
// still type-reference it; we keep the name exported but the implementation
// is the new PriorityBriefing so nothing diverges.
export { PriorityBriefing as ActionRow };

// ---------------------------------------------------------------------------

const TONE_STYLE: Record<
  Tone,
  {
    ring: string;
    rail: string;
    chipBg: string;
    chipText: string;
    dot: string;
    arrow: string;
    glow: string;
  }
> = {
  critical: {
    ring: "ring-red-100 hover:ring-red-200",
    rail: "bg-gradient-to-b from-red-500 to-red-700",
    chipBg: "bg-red-50",
    chipText: "text-red-700",
    dot: "bg-red-500",
    arrow: "text-red-600",
    glow: "bg-red-500/10",
  },
  urgent: {
    ring: "ring-accent-100 hover:ring-accent-200",
    rail: "bg-gradient-to-b from-accent-500 to-accent-700",
    chipBg: "bg-accent-50",
    chipText: "text-accent-700",
    dot: "bg-accent-500",
    arrow: "text-accent-600",
    glow: "bg-accent-500/10",
  },
  warning: {
    ring: "ring-amber-100 hover:ring-amber-200",
    rail: "bg-gradient-to-b from-amber-400 to-amber-600",
    chipBg: "bg-amber-50",
    chipText: "text-amber-800",
    dot: "bg-amber-500",
    arrow: "text-amber-700",
    glow: "bg-amber-400/10",
  },
  active: {
    ring: "ring-brand-100 hover:ring-brand-200",
    rail: "bg-gradient-to-b from-brand-500 to-brand-700",
    chipBg: "bg-brand-50",
    chipText: "text-brand-700",
    dot: "bg-brand-500",
    arrow: "text-brand-700",
    glow: "bg-brand-500/10",
  },
  wait: {
    ring: "ring-indigo-100 hover:ring-indigo-200",
    rail: "bg-gradient-to-b from-indigo-400 to-indigo-600",
    chipBg: "bg-indigo-50",
    chipText: "text-indigo-700",
    dot: "bg-indigo-500",
    arrow: "text-indigo-600",
    glow: "bg-indigo-500/10",
  },
  success: {
    ring: "ring-emerald-100 hover:ring-emerald-200",
    rail: "bg-gradient-to-b from-emerald-400 to-emerald-600",
    chipBg: "bg-emerald-50",
    chipText: "text-emerald-700",
    dot: "bg-emerald-500",
    arrow: "text-emerald-700",
    glow: "bg-emerald-500/10",
  },
};

function BriefingCard({ signal }: { signal: PrioritySignal }) {
  const t = TONE_STYLE[signal.tone];
  const isCalm = signal.count === 0 && signal.tone === "success";
  const href = signal.href as unknown as LinkHref;
  return (
    <Link
      href={href}
      className={[
        "group relative isolate overflow-hidden rounded-2xl bg-white",
        "ring-1 transition-all duration-[250ms] ease-out",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:-translate-y-0.5 hover:shadow-card",
        t.ring,
      ].join(" ")}
    >
      {/* left accent rail */}
      <span
        aria-hidden
        className={[
          "absolute inset-y-3 left-3 w-[3px] rounded-full opacity-90 transition-opacity duration-300 group-hover:opacity-100",
          t.rail,
        ].join(" ")}
      />
      {/* corner glow on hover */}
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          t.glow,
        ].join(" ")}
      />

      <div className="relative flex items-start gap-4 p-5 pl-7 md:p-6 md:pl-9">
        <ToneIcon tone={signal.tone} className={t.chipText} />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-semibold leading-tight tracking-tight text-navy-950 md:text-[14px]">
              {signal.label}
            </p>
            {!isCalm ? (
              <span
                className={[
                  "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[12.5px] font-bold tabular-nums",
                  t.chipBg,
                  t.chipText,
                ].join(" ")}
              >
                {signal.count}
              </span>
            ) : (
              <span
                aria-hidden
                className={[
                  "inline-flex h-2 w-2 rounded-full",
                  t.dot,
                ].join(" ")}
              />
            )}
          </div>
          <p className="mt-2 max-w-[36ch] text-[13px] leading-relaxed text-ink-soft">
            {signal.hint}
          </p>
          <span
            className={[
              "mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold tracking-tight",
              t.arrow,
              "transition-transform duration-300 group-hover:translate-x-0.5",
            ].join(" ")}
          >
            {signal.action} <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function ToneIcon({
  tone,
  className,
}: {
  tone: Tone;
  className: string;
}) {
  // One coherent stroke-icon set — different glyphs per tone, identical
  // geometry & padding so the row scans evenly.
  const wrap = [
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-ink/5",
    className,
  ].join(" ");
  switch (tone) {
    case "critical":
      return (
        <span className={wrap} aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M12 9v4M12 17h.01" />
            <path d="m3.5 19 8-14a1 1 0 0 1 1.7 0l8 14a1 1 0 0 1-.85 1.5h-16a1 1 0 0 1-.85-1.5Z" />
          </svg>
        </span>
      );
    case "urgent":
      return (
        <span className={wrap} aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M12 2c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.7-2.5C9 9 9.5 10 11 10c0-2.5 0-5 1-8Z" />
            <path d="M12 22a6 6 0 0 0 6-6c0-2-1-3.5-2-5" />
          </svg>
        </span>
      );
    case "warning":
      return (
        <span className={wrap} aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
      );
    case "active":
      return (
        <span className={wrap} aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <path d="M14 2v6h6M8 13h8M8 17h5" />
          </svg>
        </span>
      );
    case "wait":
      return (
        <span className={wrap} aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <rect x="3" y="4" width="18" height="18" rx="2.5" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </span>
      );
    case "success":
      return (
        <span className={wrap} aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
      );
  }
}
