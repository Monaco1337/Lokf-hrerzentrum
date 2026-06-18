/**
 * Visible breadcrumb trail. Pairs with breadcrumbSchema() for the machine-
 * readable equivalent. Last crumb is the current page (not a link).
 */
import type { Route } from "next";
import Link from "next/link";

import type { Crumb } from "../types";

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Brotkrumen" className="text-[12.5px] text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.path} className="inline-flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="font-medium text-ink-soft">
                  {c.name}
                </span>
              ) : (
                <Link
                  href={c.path as Route}
                  className="transition-colors hover:text-ink"
                >
                  {c.name}
                </Link>
              )}
              {!last && (
                <span aria-hidden className="text-ink-muted/50">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
