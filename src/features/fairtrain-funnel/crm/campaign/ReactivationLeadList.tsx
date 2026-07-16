"use client";

/**
 * ReactivationLeadList — the synchronized table of ALL imported Alt-Leads on the
 * Reaktivierung/Kommunikation page.
 *
 * Every imported lead is shown with a single, unambiguous status: Offen (still
 * to contact), Angeschrieben (Erstkontakt sent → locked against a second one),
 * Beantwortet, Erledigt or Fehlgeschlagen. Filter chips (with live counts),
 * search and pagination all live in the URL, so after a release the sibling
 * ReactivationCampaign's router.refresh() re-renders this list in sync — a lead
 * that was just contacted immediately flips from "Offen" to "Angeschrieben".
 */
import type { Route } from "next";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  REACTIVATION_LEAD_STATE_HINT,
  REACTIVATION_LEAD_STATE_LABEL,
  REACTIVATION_LEAD_STATE_TONE,
  REACTIVATION_LEAD_STATES,
  type ReactivationLeadRow,
  type ReactivationLeadState,
} from "@/features/fairtrain-funnel/campaign/reactivationLeadList";

const DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

type Counts = Record<ReactivationLeadState, number> & { total: number };

export function ReactivationLeadList({
  rows,
  total,
  counts,
  state,
  search,
  page,
  pageSize,
}: {
  rows: ReactivationLeadRow[];
  total: number;
  counts: Counts;
  state?: ReactivationLeadState | undefined;
  search: string;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [term, setTerm] = useState(search);

  const navigate = useCallback(
    (patch: Record<string, string | undefined>) => {
      const params = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") params.delete(k);
        else params.set(k, v);
      }
      const qs = params.toString();
      const url = (qs ? `${pathname}?${qs}` : pathname) as Route;
      startTransition(() => router.push(url, { scroll: false }));
    },
    [sp, router, pathname],
  );

  // Keep the input in sync if the URL changes elsewhere (e.g. chip reset).
  useEffect(() => setTerm(search), [search]);

  // Debounced live search.
  useEffect(() => {
    const h = setTimeout(() => {
      if (term.trim() !== search) {
        navigate({ q: term.trim() || undefined, p: undefined });
      }
    }, 350);
    return () => clearTimeout(h);
  }, [term, search, navigate]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const chips: { key: ReactivationLeadState | "all"; label: string; count: number }[] =
    [
      { key: "all", label: "Alle", count: counts.total },
      ...REACTIVATION_LEAD_STATES.map((s) => ({
        key: s,
        label: REACTIVATION_LEAD_STATE_LABEL[s],
        count: counts[s],
      })),
    ];

  return (
    <section className="rounded-2xl border border-black/[0.06] bg-white/70 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">
            Alle importierten Leads
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            <strong className="text-slate-700">
              {counts.total.toLocaleString("de-DE")}
            </strong>{" "}
            Leads insgesamt. Angeschriebene sind gesperrt und werden nie erneut
            erst-kontaktiert.
          </p>
        </div>
        <div className="relative">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Name, Telefon oder E-Mail…"
            className="w-64 rounded-xl border border-black/[0.08] bg-white/80 px-3.5 py-2 text-[13px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
          {term ? (
            <button
              type="button"
              onClick={() => setTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-1.5 text-[13px] text-slate-400 hover:text-slate-700"
              aria-label="Suche löschen"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {/* Filter chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {chips.map((c) => {
          const activeChip =
            c.key === "all" ? state === undefined : state === c.key;
          return (
            <button
              key={c.key}
              type="button"
              title={
                c.key === "all"
                  ? undefined
                  : REACTIVATION_LEAD_STATE_HINT[c.key as ReactivationLeadState]
              }
              onClick={() =>
                navigate({
                  state: c.key === "all" ? undefined : c.key,
                  p: undefined,
                })
              }
              className={[
                "rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition",
                activeChip
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-black/[0.08] bg-white/70 text-slate-600 hover:bg-white",
              ].join(" ")}
            >
              {c.label}
              <span
                className={[
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
                  activeChip ? "bg-white/25" : "bg-slate-100 text-slate-500",
                ].join(" ")}
              >
                {c.count.toLocaleString("de-DE")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-xl border border-black/[0.05]">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Telefon</th>
              <th className="hidden px-4 py-2.5 sm:table-cell">Ort</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="hidden px-4 py-2.5 md:table-cell">
                Letzte Aktivität
              </th>
              <th className="px-4 py-2.5 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.04]">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-[13px] text-slate-400"
                >
                  Keine Leads für diese Auswahl.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-medium text-slate-800">
                    {r.name}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {r.phone ?? "—"}
                  </td>
                  <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">
                    {r.city ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset ${REACTIVATION_LEAD_STATE_TONE[r.state]}`}
                    >
                      {r.state !== "offen" ? (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                        >
                          <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
                          <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
                        </svg>
                      ) : null}
                      {REACTIVATION_LEAD_STATE_LABEL[r.state]}
                    </span>
                  </td>
                  <td className="hidden px-4 py-2.5 text-slate-500 md:table-cell">
                    {r.lastActivityAt ? DATE.format(r.lastActivityAt) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/crm/leads/${r.id}` as Route}
                      className="rounded-lg border border-black/[0.08] bg-white/70 px-2.5 py-1 text-[12px] font-medium text-slate-700 transition hover:bg-white"
                    >
                      Öffnen
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-[12.5px] text-slate-500">
        <span>
          {from.toLocaleString("de-DE")}–{to.toLocaleString("de-DE")} von{" "}
          {total.toLocaleString("de-DE")}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending || page <= 1}
            onClick={() => navigate({ p: page - 1 <= 1 ? undefined : String(page - 1) })}
            className="rounded-lg border border-black/[0.08] bg-white/70 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-white disabled:opacity-40"
          >
            Zurück
          </button>
          <span className="tabular-nums">
            Seite {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={pending || page >= totalPages}
            onClick={() => navigate({ p: String(page + 1) })}
            className="rounded-lg border border-black/[0.08] bg-white/70 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-white disabled:opacity-40"
          >
            Weiter
          </button>
        </div>
      </div>
    </section>
  );
}
