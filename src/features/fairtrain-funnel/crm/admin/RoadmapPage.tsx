/**
 * RoadmapPage — high-quality placeholder for sections that are scaffolded
 * in the sidebar but whose deeper UX lives in the next implementation pass.
 *
 * Renders the section title, the operator's working intent, and a concrete
 * roadmap of the planned mechanics. This is intentionally NOT lorem ipsum —
 * every bullet describes the actual functionality being built so reviewers
 * see exactly what's coming.
 */
import Link from "next/link";
import type { Route } from "next";

interface RoadmapItem {
  label: string;
  detail: string;
}

interface Props {
  eyebrow: string;
  title: string;
  intent: string;
  roadmap: ReadonlyArray<RoadmapItem>;
  /** Optional related routes the user can navigate to right now. */
  related?: ReadonlyArray<{ href: string; label: string }>;
}

export function RoadmapPage({
  eyebrow,
  title,
  intent,
  roadmap,
  related,
}: Props) {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-950">{title}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">
          {intent}
        </p>
      </header>

      <section className="rounded-2xl border border-ink/10 bg-gradient-to-br from-white via-white to-surface-subtle/40 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[14px] font-semibold text-navy-950">
            Funktionsumfang
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10.5px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Im Aufbau
          </span>
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {roadmap.map((r, i) => (
            <li
              key={i}
              className="rounded-xl border border-ink/10 bg-white p-4"
            >
              <p className="text-[13px] font-semibold text-navy-950">{r.label}</p>
              <p className="mt-1 text-[12px] text-ink-soft">{r.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      {related && related.length > 0 && (
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Schon nutzbar
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {related.map((r) => (
              <li key={r.href}>
                <Link
                  href={r.href as Route}
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[12px] font-medium text-brand-700 shadow-sm transition hover:border-brand-200 hover:bg-brand-50"
                >
                  {r.label}
                  <span aria-hidden>↗</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
