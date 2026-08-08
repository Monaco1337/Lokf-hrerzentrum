/**
 * DashboardTimeline — business-only activity feed. Shows exclusively the events
 * that matter operationally (funnel started/completed, documents uploaded,
 * callback requested, document approved, voucher granted). No technical logs.
 * Styled with the remap-proof `.dash-*` layer so tone dots stay vivid on dark.
 */
import Link from "next/link";
import type { Route } from "next";

import type { BusinessEvent, BusinessEventTone } from "./DashboardLoader";

const TONE: Record<BusinessEventTone, { dot: string; text: string }> = {
  sky: { dot: "bg-sky-400", text: "text-sky-300" },
  blue: { dot: "bg-blue-400", text: "text-blue-300" },
  violet: { dot: "bg-violet-400", text: "text-violet-300" },
  amber: { dot: "bg-amber-400", text: "text-amber-300" },
  emerald: { dot: "bg-emerald-400", text: "text-emerald-300" },
};

const TIME_FMT = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});

function relTime(d: Date): string {
  const min = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  return `vor ${Math.round(h / 24)} T.`;
}

export function DashboardTimeline({
  events,
}: {
  events: ReadonlyArray<BusinessEvent>;
}) {
  return (
    <section className="dash-card dash-t-violet flex flex-col p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="dash-tile dash-tile--sm" aria-hidden>
            <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 2" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <h2 className="text-[15px] font-bold tracking-tight text-white">
            Aktivität
          </h2>
        </div>
        <span className="dash-eyebrow">Ereignisse</span>
      </header>

      {events.length === 0 ? (
        <p className="flex-1 rounded-xl bg-white/[0.02] px-3 py-10 text-center text-[13px] text-[#7f8a83]">
          Noch keine geschäftsrelevanten Ereignisse.
        </p>
      ) : (
        <ul className="max-h-[360px] space-y-0 overflow-y-auto pr-1">
          {events.map((e) => {
            const tone = TONE[e.tone];
            const body = (
              <div className="flex gap-3 py-2.5">
                <span aria-hidden className="relative mt-1 flex">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-snug">
                    <span className={`font-semibold ${tone.text}`}>
                      {e.label}
                    </span>
                    {e.leadName ? (
                      <span className="text-[#c3ccc6]"> · {e.leadName}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-[#7f8a83]">
                    {relTime(e.at)} ·{" "}
                    <span className="tabular-nums">{TIME_FMT.format(e.at)}</span>
                  </p>
                </div>
              </div>
            );
            return (
              <li key={e.id} className="border-b border-white/[0.05] last:border-0">
                {e.leadId ? (
                  <Link
                    href={`/crm/leads/${e.leadId}` as Route}
                    className="-mx-2 block rounded-lg px-2 transition hover:bg-white/[0.03]"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="px-2">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
