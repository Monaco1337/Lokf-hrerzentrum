/**
 * Editorial hero for knowledge pages: breadcrumb, eyebrow, H1, lede and an
 * optional key-facts rail. Answer-first layout so the most citable facts sit
 * at the very top of the page.
 */
import { Breadcrumbs } from "./Breadcrumbs";
import { Eyebrow } from "./blocks";

import type { Crumb, KeyFact } from "../types";

interface ArticleHeroProps {
  crumbs: Crumb[];
  eyebrow: string;
  title: string;
  lede: string;
  facts?: ReadonlyArray<KeyFact>;
  updated?: string;
}

export function ArticleHero({
  crumbs,
  eyebrow,
  title,
  lede,
  facts,
  updated,
}: ArticleHeroProps) {
  return (
    <header className="mb-10">
      <Breadcrumbs crumbs={crumbs} />
      <div className="mt-5">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-3 font-display text-[clamp(1.9rem,4.6vw,3.1rem)] font-extrabold leading-[1.04] tracking-tight text-navy-950">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-[16.5px] leading-relaxed text-ink-soft">
          {lede}
        </p>
        {updated ? (
          <p className="mt-3 text-[12.5px] text-ink-muted">
            Zuletzt aktualisiert: {updated}
          </p>
        ) : null}
      </div>

      {facts && facts.length > 0 ? (
        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {facts.map((f) => (
            <div
              key={f.label}
              className="rounded-2xl border border-ink/[0.07] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {f.label}
              </dt>
              <dd className="mt-1.5 text-[18px] font-bold leading-tight text-navy-950">
                {f.value}
              </dd>
              {f.hint ? (
                <p className="mt-1 text-[11.5px] leading-snug text-ink-muted">
                  {f.hint}
                </p>
              ) : null}
            </div>
          ))}
        </dl>
      ) : null}
    </header>
  );
}
