/**
 * Salary dataset table with an inline visual bar per segment. Renders the
 * citable orientation data; methodology + disclaimer live alongside on the page.
 */
import type { SalarySegment } from "../types";

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function SalaryTable({ segments }: { segments: ReadonlyArray<SalarySegment> }) {
  const ceiling = Math.max(...segments.map((s) => s.max));

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">
          Monatsbrutto-Spannen für Lokführer nach Segment
        </caption>
        <thead>
          <tr className="border-b border-ink/[0.07] bg-surface-subtle/60 text-[11px] uppercase tracking-[0.12em] text-ink-muted">
            <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
              Segment
            </th>
            <th scope="col" className="px-4 py-3 font-semibold sm:px-5">
              Spanne (Monatsbrutto)
            </th>
            <th scope="col" className="hidden px-4 py-3 text-right font-semibold sm:table-cell sm:px-5">
              Median
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/[0.06]">
          {segments.map((s) => {
            const left = (s.min / ceiling) * 100;
            const width = ((s.max - s.min) / ceiling) * 100;
            const medianPct = (s.median / ceiling) * 100;
            return (
              <tr key={s.segment} className="align-top">
                <td className="px-4 py-4 sm:px-5">
                  <p className="text-[14px] font-semibold text-navy-950">
                    {s.segment}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">{s.context}</p>
                </td>
                <td className="px-4 py-4 sm:px-5">
                  <p className="text-[13.5px] font-medium text-ink-soft">
                    {EUR.format(s.min)} – {EUR.format(s.max)}
                  </p>
                  <div className="relative mt-2 h-2 w-full max-w-[260px] overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="absolute inset-y-0 rounded-full bg-gradient-to-r from-accent-400 to-accent-600"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                    <div
                      aria-hidden
                      className="absolute inset-y-0 w-0.5 bg-navy-950"
                      style={{ left: `${medianPct}%` }}
                    />
                  </div>
                </td>
                <td className="hidden px-4 py-4 text-right sm:table-cell sm:px-5">
                  <span className="text-[15px] font-bold text-navy-950">
                    {EUR.format(s.median)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
