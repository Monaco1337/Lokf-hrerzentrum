"use client";
/**
 * "Neue Unterlagen" — Leitstand widget listing leads whose freshly uploaded
 * documents await a review decision. Live-counted via SSE; each row opens the
 * affected lead. Click-through lands on the lead detail (Unterlagen tab).
 */
import Link from "next/link";
import type { Route } from "next";

import type { NewDocumentsData } from "./LeitstandLoader";
import { useCrmLiveUpdates } from "./useCrmLiveUpdates";

function relativeTime(date: Date | null): string {
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

export function LeitstandNeueUnterlagen({ data }: { data: NewDocumentsData }) {
  const { connected, docsAwaiting } = useCrmLiveUpdates();
  // Prefer the live SSE count; fall back to the server-rendered snapshot.
  const count = docsAwaiting ?? data.count;

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-[15px] font-bold text-navy-950">
            Neue Unterlagen
          </h2>
          <span
            className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums ${
              count > 0
                ? "bg-blue-100 text-blue-700"
                : "bg-surface-subtle text-ink-muted"
            }`}
          >
            {count}
          </span>
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500" : "bg-slate-300"
            }`}
            title={connected ? "Live verbunden" : "Aktualisiert per Intervall"}
          />
        </div>
        <Link
          href={"/crm/applicants/uploads" as Route}
          className="text-[12px] font-semibold text-brand-700 hover:text-brand-800"
        >
          Alle ansehen
        </Link>
      </header>

      {data.leads.length === 0 ? (
        <p className="mt-3 rounded-xl bg-surface-subtle px-3 py-6 text-center text-sm text-ink-muted">
          Aktuell keine Unterlagen zur Prüfung.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {data.leads.map((lead) => (
            <li key={lead.leadId}>
              <Link
                href={`/crm/leads/${lead.leadId}` as Route}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-surface-subtle px-3 py-2 transition hover:border-brand-200 hover:bg-brand-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">
                    {lead.leadName}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {relativeTime(lead.latestAt)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-blue-700">
                  {lead.pending}{" "}
                  {lead.pending === 1 ? "Dokument" : "Dokumente"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
