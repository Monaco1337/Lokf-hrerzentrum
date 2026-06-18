/**
 * Glossary index — grouped by category, every term linking to its detail page.
 * A pure presentation component over the GLOSSARY content registry.
 */
import type { Route } from "next";
import Link from "next/link";

import type { GlossaryTerm } from "../types";

const CATEGORY_ORDER: ReadonlyArray<GlossaryTerm["category"]> = [
  "Beruf",
  "Qualifikation",
  "Technik",
  "Förderung",
  "Karriere",
  "Behörde",
];

export function GlossarIndex({ terms }: { terms: ReadonlyArray<GlossaryTerm> }) {
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: terms.filter((t) => t.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.category} aria-label={group.category}>
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
            {group.category}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {group.items.map((t) => (
              <Link
                key={t.slug}
                href={`/glossar/${t.slug}` as Route}
                className="group rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.18)]"
              >
                <p className="flex items-baseline gap-2 text-[15.5px] font-semibold text-navy-950">
                  {t.term}
                  {t.abbr ? (
                    <span className="rounded-md bg-ink/[0.05] px-1.5 py-0.5 text-[11px] font-semibold tracking-wide text-ink-muted">
                      {t.abbr}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft line-clamp-3">
                  {t.short}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
