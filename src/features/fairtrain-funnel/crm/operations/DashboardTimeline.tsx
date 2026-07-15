/**
 * DashboardTimeline — business-only activity feed. Shows exclusively the events
 * that matter operationally (funnel started/completed, documents uploaded,
 * callback requested, document approved, voucher granted). No technical logs.
 */
import Link from "next/link";
import type { Route } from "next";

import type { BusinessEvent, BusinessEventTone } from "./DashboardLoader";

const TONE: Record<BusinessEventTone, { dot: string; text: string }> = {
  sky: { dot: "bg-sky-500", text: "text-sky-700" },
  blue: { dot: "bg-blue-500", text: "text-blue-700" },
  violet: { dot: "bg-violet-500", text: "text-violet-700" },
  amber: { dot: "bg-amber-500", text: "text-amber-700" },
  emerald: { dot: "bg-emerald-500", text: "text-emerald-700" },
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
    <section className="rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-card">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-bold tracking-tight text-navy-950">
          Aktivität
        </h2>
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
          Geschäftsereignisse
        </span>
      </header>

      {events.length === 0 ? (
        <p className="rounded-xl bg-surface-subtle px-3 py-8 text-center text-sm text-ink-muted">
          Noch keine geschäftsrelevanten Ereignisse.
        </p>
      ) : (
        <ul className="max-h-[440px] space-y-0 overflow-y-auto">
          {events.map((e) => {
            const tone = TONE[e.tone];
            const body = (
              <div className="flex gap-3 py-2.5">
                <span
                  aria-hidden
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug">
                    <span className={`font-semibold ${tone.text}`}>
                      {e.label}
                    </span>
                    {e.leadName ? (
                      <span className="text-ink"> · {e.leadName}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">
                    {relTime(e.at)} ·{" "}
                    <span className="tabular-nums">{TIME_FMT.format(e.at)}</span>
                  </p>
                </div>
              </div>
            );
            return (
              <li
                key={e.id}
                className="border-b border-ink/[0.05] last:border-0"
              >
                {e.leadId ? (
                  <Link
                    href={`/crm/leads/${e.leadId}` as Route}
                    className="-mx-2 block rounded-lg px-2 transition hover:bg-surface-subtle"
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
