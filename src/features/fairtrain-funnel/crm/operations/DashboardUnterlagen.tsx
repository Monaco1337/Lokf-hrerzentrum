"use client";
/**
 * "Neue Unterlagen" — applicants whose freshly uploaded documents await a
 * review decision. Live-counted via SSE. Each row opens the lead straight on
 * the document reviewer tab (`?tab=unterlagen`) — one click to review.
 * Styled with the remap-proof `.dash-*` layer (tone: cyan).
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
      className="dash-card dash-t-cyan scroll-mt-6 flex flex-col p-4"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="dash-tile dash-tile--sm" aria-hidden>
            <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
              <path d="M14 3v5h5" />
              <path d="M9 13h6M9 17h4" />
            </svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold tracking-tight text-white">
                Neue Unterlagen
              </h2>
              <span
                className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-white/25"}`}
                title={connected ? "Live verbunden" : "Aktualisiert per Intervall"}
              />
            </div>
            <p className="mt-0.5 text-[11px] text-[#7f8a83]">
              Warten auf Prüfung &amp; Freigabe
            </p>
          </div>
        </div>
        <span className={liveCount > 0 ? "dash-chip" : "dash-chip dash-chip--muted"}>
          {liveCount}
        </span>
      </header>

      {leads.length === 0 ? (
        <p className="mt-4 flex-1 rounded-xl bg-white/[0.02] px-3 py-10 text-center text-[13px] text-[#7f8a83]">
          Aktuell keine Unterlagen zur Prüfung.
        </p>
      ) : (
        <ul className="mt-3.5 space-y-2">
          {leads.map((lead) => (
            <li key={lead.leadId}>
              <Link
                href={`/crm/leads/${lead.leadId}?tab=unterlagen` as Route}
                className="dash-row group flex items-center justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-[#e9efeb]">
                    {lead.leadName}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-[#7f8a83]">
                    {lead.documents.join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[10.5px] text-[#7f8a83]">
                    {relTime(lead.latestAt)}
                  </span>
                  <span className="dash-chip px-2 py-0.5 text-[11px]">
                    {lead.pending}
                  </span>
                  <svg className="h-4 w-4 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        className="mt-3.5 block border-t border-white/[0.06] pt-3 text-center text-[12px] font-semibold text-sky-300 transition hover:text-sky-200"
      >
        Alle Bewerberakten →
      </Link>
    </section>
  );
}
