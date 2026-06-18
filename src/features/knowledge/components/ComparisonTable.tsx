/**
 * Employer comparison table. Compact, scannable overview of all employer hubs
 * with deep links — an internal-linking surface and a genuine decision aid.
 */
import type { Route } from "next";
import Link from "next/link";

import type { EmployerData } from "../types";

export function ComparisonTable({
  employers,
  activeSlug,
}: {
  employers: ReadonlyArray<EmployerData>;
  activeSlug?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <table className="w-full min-w-[640px] border-collapse text-left text-[13.5px]">
        <caption className="sr-only">Vergleich der Bahn-Arbeitgeber</caption>
        <thead>
          <tr className="border-b border-ink/[0.07] bg-surface-subtle/60 text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            <th scope="col" className="px-4 py-3 font-semibold">Arbeitgeber</th>
            <th scope="col" className="px-4 py-3 font-semibold">Typ</th>
            <th scope="col" className="px-4 py-3 font-semibold">Verkehrsart</th>
            <th scope="col" className="px-4 py-3 font-semibold">Reichweite</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/[0.06]">
          {employers.map((e) => {
            const active = e.slug === activeSlug;
            return (
              <tr
                key={e.slug}
                className={active ? "bg-brand-50/50" : undefined}
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/arbeitgeber/${e.slug}` as Route}
                    className="font-semibold text-navy-950 underline-offset-2 hover:text-brand-700 hover:underline"
                  >
                    {e.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-soft">{e.kind}</td>
                <td className="px-4 py-3 text-ink-soft">{e.verkehrsart}</td>
                <td className="px-4 py-3 text-ink-soft">{e.coverage}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
