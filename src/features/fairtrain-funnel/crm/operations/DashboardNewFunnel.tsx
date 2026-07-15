"use client";
/**
 * "Neue Funnel-Leads" — the concrete applicants that just started or completed
 * the website Eignungscheck. So an operator instantly SEES who came in (name,
 * phone, when), not just a headline number. Each row is one click to the lead.
 * Live via the shared CRM SSE channel (whole-dashboard refresh on change).
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
      label: "Eignungscheck abgeschlossen",
      cls: "bg-blue-100 text-blue-700",
    };
  }
  return { label: "Eignungscheck gestartet", cls: "bg-sky-100 text-sky-700" };
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
      className="scroll-mt-6 rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-card"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"
          >
            <svg
              className="h-[18px] w-[18px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />
            </svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-bold tracking-tight text-navy-950">
                Neue Funnel-Leads
              </h2>
              <span
                className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-500" : "bg-slate-300"}`}
                title={connected ? "Live verbunden" : "Aktualisiert per Intervall"}
              />
            </div>
            <p className="text-[11.5px] text-ink-muted">
              Frisch über den Eignungscheck eingegangen
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold tabular-nums ${
            leads.length > 0
              ? "bg-brand-100 text-brand-700"
              : "bg-surface-subtle text-ink-muted"
          }`}
        >
          {leads.length}
        </span>
      </header>

      {leads.length === 0 ? (
        <p className="mt-4 rounded-xl bg-surface-subtle px-3 py-8 text-center text-sm text-ink-muted">
          Aktuell keine neuen Funnel-Leads.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {leads.map((lead) => {
            const badge = statusBadge(lead.status);
            return (
              <li key={lead.id}>
                <Link
                  href={`/crm/leads/${lead.id}` as Route}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-ink/[0.07] bg-surface-subtle/60 px-3.5 py-2.5 transition hover:border-brand-200 hover:bg-brand-50/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-ink">
                      {lead.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2">
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                      {lead.phone ? (
                        <span className="truncate text-[11.5px] tabular-nums text-ink-muted">
                          {lead.phone}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[11px] text-ink-muted">
                      {relTime(lead.at)}
                    </span>
                    <svg
                      className="h-4 w-4 text-ink-muted/50 transition group-hover:translate-x-0.5 group-hover:text-brand-600"
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
            );
          })}
        </ul>
      )}

      <Link
        href={"/crm/leads?status=FUNNEL_STARTED,FUNNEL_COMPLETED" as Route}
        className="mt-4 block text-center text-[12px] font-semibold text-brand-700 hover:text-brand-800"
      >
        Alle Funnel-Leads ansehen →
      </Link>
    </section>
  );
}
