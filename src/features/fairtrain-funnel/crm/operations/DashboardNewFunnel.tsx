"use client";
/**
 * "Neue Funnel-Leads" — the concrete applicants that just started or completed
 * the website Eignungscheck. So an operator instantly SEES who came in (name,
 * phone, when), not just a headline number. Each row is one click to the lead.
 * Live via the shared CRM SSE channel (whole-dashboard refresh on change).
 * Styled with the remap-proof `.dash-*` layer (tone: blue).
 */
import Link from "next/link";
import type { Route } from "next";

import { LeadStatus } from "../../types";
import type { FunnelLead } from "./DashboardLoader";
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

function statusBadge(status: LeadStatus): { label: string; cls: string } {
  if (status === LeadStatus.FUNNEL_COMPLETED) {
    return {
      label: "Abgeschlossen",
      cls: "bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/25",
    };
  }
  return {
    label: "Gestartet",
    cls: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/25",
  };
}

export function DashboardNewFunnel({
  leads,
}: {
  leads: ReadonlyArray<FunnelLead>;
}) {
  const { connected } = useCrmLiveUpdates();

  return (
    <section
      id="neue-funnel-leads"
      className="dash-card dash-t-blue scroll-mt-6 flex flex-col p-4"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="dash-tile dash-tile--sm" aria-hidden>
            <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />
            </svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-bold tracking-tight text-white">
                Neue Funnel-Leads
              </h2>
              <span
                className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-white/25"}`}
                title={connected ? "Live verbunden" : "Aktualisiert per Intervall"}
              />
            </div>
            <p className="mt-0.5 text-[11px] text-[#7f8a83]">
              Frisch über den Eignungscheck
            </p>
          </div>
        </div>
        <span className={leads.length > 0 ? "dash-chip" : "dash-chip dash-chip--muted"}>
          {leads.length}
        </span>
      </header>

      {leads.length === 0 ? (
        <p className="mt-4 flex-1 rounded-xl bg-white/[0.02] px-3 py-10 text-center text-[13px] text-[#7f8a83]">
          Aktuell keine neuen Funnel-Leads.
        </p>
      ) : (
        <ul className="mt-3.5 space-y-2">
          {leads.map((lead) => {
            const badge = statusBadge(lead.status);
            return (
              <li key={lead.id}>
                <Link
                  href={`/crm/leads/${lead.id}` as Route}
                  className="dash-row group flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-[#e9efeb]">
                      {lead.name}
                    </p>
                    <p className="mt-1 flex items-center gap-2">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      {lead.phone ? (
                        <span className="truncate text-[11px] tabular-nums text-[#7f8a83]">
                          {lead.phone}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[10.5px] text-[#7f8a83]">
                      {relTime(lead.at)}
                    </span>
                    <svg className="h-4 w-4 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={"/crm/leads?status=FUNNEL_STARTED,FUNNEL_COMPLETED" as Route}
        className="mt-3.5 block border-t border-white/[0.06] pt-3 text-center text-[12px] font-semibold text-blue-300 transition hover:text-blue-200"
      >
        Alle Funnel-Leads →
      </Link>
    </section>
  );
}
