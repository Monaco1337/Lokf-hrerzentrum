/**
 * LeadCopilotPanel — KI Copilot card shown on the right column of the
 * Lead Workbench. Pure presentation; recommendations come from a
 * deterministic heuristic today and from a real LLM call tomorrow.
 */
import type { CopilotRecommendation } from "./copilotHeuristics";

const URGENCY_STYLE: Record<
  CopilotRecommendation["urgency"],
  { dot: string; pill: string }
> = {
  hot: {
    dot: "bg-rose-500",
    pill: "bg-rose-50 text-rose-800 ring-rose-200",
  },
  today: {
    dot: "bg-amber-500",
    pill: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  "this-week": {
    dot: "bg-indigo-500",
    pill: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  },
  watch: {
    dot: "bg-slate-400",
    pill: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

function ProgressRing({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "accent" | "brand";
}) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  const stroke = tone === "accent" ? "#3F7248" : "#1a3a73";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 72 72" className="h-16 w-16">
        <circle cx="36" cy="36" r={r} stroke="#e6e8ee" strokeWidth="6" fill="none" />
        <circle
          cx="36"
          cy="36"
          r={r}
          stroke={stroke}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 36 36)"
        />
        <text
          x="36"
          y="40"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fill="#0a1a3a"
        >
          {Math.round(value)}%
        </text>
      </svg>
      <span className="text-[10.5px] font-medium uppercase tracking-wider text-ink-muted">
        {label}
      </span>
    </div>
  );
}

export function LeadCopilotPanel({ rec }: { rec: CopilotRecommendation }) {
  const u = URGENCY_STYLE[rec.urgency];
  return (
    <section className="rounded-2xl border border-ink/[0.07] bg-white/80 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/70">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-emerald-50/80 text-[10px] font-bold text-brand-700 ring-1 ring-inset ring-brand-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            KI
          </span>
          <h3 className="text-[13.5px] font-semibold text-navy-950">
            KI Operator
          </h3>
        </div>
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset",
            u.pill,
          ].join(" ")}
        >
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${u.dot}`} />
          {rec.urgencyLabel}
        </span>
      </header>

      <div className="mt-4 flex items-center justify-between gap-4">
        <ProgressRing
          value={rec.fundingProbability}
          label="Förder­wahrsch."
          tone="accent"
        />
        <ProgressRing
          value={rec.closeProbability}
          label="Abschluss­wahrsch."
          tone="brand"
        />
      </div>

      {rec.risks.length > 0 && (
        <div className="mt-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Risiken
          </p>
          <ul className="mt-1.5 space-y-1">
            {rec.risks.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-[12px] text-ink-soft"
              >
                <span
                  aria-hidden
                  className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-rose-400"
                />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Empfehlungen
        </p>
        <ul className="mt-1.5 space-y-1.5">
          {rec.recommendations.map((r, i) => (
            <li
              key={i}
              className={[
                "rounded-lg border px-3 py-2",
                r.primary
                  ? "border-accent-200 bg-accent-50/60"
                  : "border-ink/10 bg-white",
              ].join(" ")}
            >
              <p
                className={[
                  "text-[12.5px] font-semibold",
                  r.primary ? "text-accent-900" : "text-navy-950",
                ].join(" ")}
              >
                {r.label}
              </p>
              <p className="mt-0.5 text-[11.5px] text-ink-soft">{r.rationale}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
