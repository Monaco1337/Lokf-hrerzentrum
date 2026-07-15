"use client";
/**
 * "Neue Unterlagen" — applicants whose freshly uploaded documents await a
 * review decision. Live-counted via SSE. Each row opens the lead straight on
 * the document reviewer tab (`?tab=unterlagen`) — one click to review.
 */
import Link from "next/link";
import type { Route } from "next";

import type { DocumentUploadLead } from "./DashboardLoader";
import { useCrmLiveUpdates } from "./useCrmLiveUpdates";

function relTime(date: Date | null): string {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return `vor ${d} T.`;
}

export function DashboardUnterlagen({
  count,
  leads,
}: {
  count: number;
  leads: ReadonlyArray<DocumentUploadLead>;
}) {
  const { connected, docsAwaiting } = useCrmLiveUpdates();
  const liveCount = docsAwaiting ?? count;

  return (
    <section
      id="neue-unterlagen"
      className="scroll-mt-6 rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-card"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
          >
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
              <path d="M14 3v5h5" />
            </svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold tracking-tight text-navy-950">
                Neue Unterlagen
              </h2>
              <span
                className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-300"}`}
                title={connected ? "Live verbunden" : "Aktualisiert per Intervall"}
              />
            </div>
            <p className="text-[11.5px] text-ink-muted">
              Warten auf Prüfung &amp; Freigabe
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold tabular-nums ${
            liveCount > 0 ? "bg-blue-100 text-blue-700" : "bg-surface-subtle text-ink-muted"
          }`}
        >
          {liveCount}
        </span>
      </header>

      {leads.length === 0 ? (
        <p className="mt-4 rounded-xl bg-surface-subtle px-3 py-8 text-center text-sm text-ink-muted">
          Aktuell keine Unterlagen zur Prüfung.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {leads.map((lead) => (
            <li key={lead.leadId}>
              <Link
                href={`/crm/leads/${lead.leadId}?tab=unterlagen` as Route}
                className="group flex items-center justify-between gap-3 rounded-xl border border-ink/[0.07] bg-surface-subtle/60 px-3.5 py-2.5 transition hover:border-blue-200 hover:bg-blue-50/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">
                    {lead.leadName}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">
                    {lead.documents.join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[11px] text-ink-muted">
                    {relTime(lead.latestAt)}
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-blue-700">
                    {lead.pending}
                  </span>
                  <svg
                    className="h-4 w-4 text-ink-muted/50 transition group-hover:translate-x-0.5 group-hover:text-blue-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={"/crm/unterlagen" as Route}
        className="mt-4 block text-center text-[12px] font-semibold text-brand-700 hover:text-brand-800"
      >
        Alle Bewerberakten ansehen →
      </Link>
    </section>
  );
}
