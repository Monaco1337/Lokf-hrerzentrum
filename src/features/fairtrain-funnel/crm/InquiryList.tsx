"use client";
/**
 * Kontaktanfragen — premium, fully-clickable inbox.
 *
 * Each row is a single <Link> into the inquiry detail; a small delete control
 * sits on top as a sibling (never nested in the link) with an inline confirm,
 * so the whole bar is clickable yet deletion stays deliberate. Plain German.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteContactInquiry } from "@/server/actions/deleteContactInquiry";
import type { ContactInquirySummary } from "../types";

interface InquiryListProps {
  inquiries: ReadonlyArray<ContactInquirySummary>;
}

interface StatusMeta {
  label: string;
  pill: string;
  dot: string;
}

const DEFAULT_STATUS: StatusMeta = {
  label: "Neu",
  pill: "bg-amber-50 text-amber-800 ring-amber-100",
  dot: "bg-amber-500",
};

const STATUS: Record<string, StatusMeta> = {
  NEW: DEFAULT_STATUS,
  IN_PROGRESS: { label: "In Bearbeitung", pill: "bg-brand-50 text-brand-700 ring-brand-100", dot: "bg-brand-600" },
  DONE: { label: "Erledigt", pill: "bg-emerald-50 text-emerald-700 ring-emerald-100", dot: "bg-emerald-500" },
  SPAM: { label: "Spam", pill: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
};

const TIME = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const GRID =
  "md:grid md:grid-cols-[minmax(0,1.7fr)_minmax(0,2.2fr)_0.95fr_0.85fr_32px] md:items-center md:gap-4";

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n).trimEnd()}…`;
}

export function InquiryList({ inquiries }: InquiryListProps) {
  const router = useRouter();
  const [rows, setRows] = useState<ContactInquirySummary[]>([...inquiries]);
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const newCount = rows.filter((i) => i.status === "NEW").length;

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteContactInquiry({ id });
      if (!res.ok) {
        setError("Löschen nicht möglich. Bitte erneut versuchen.");
        return;
      }
      setRows((r) => r.filter((x) => x.id !== id));
      setConfirmId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy-950">
            Kontaktanfragen
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {rows.length} insgesamt
            {newCount > 0 ? ` · ${newCount} unbearbeitet` : ""}
          </p>
        </div>
      </header>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-surface-subtle/40 px-6 py-16 text-center text-sm text-ink-soft">
          Noch keine Kontaktanfragen.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-premium ring-1 ring-ink/[0.02]">
          <div
            className={[
              "hidden border-b border-ink/[0.07] bg-gradient-to-b from-surface-subtle to-white px-6 py-3.5",
              "text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted",
              GRID,
            ].join(" ")}
          >
            <span>Anfrage</span>
            <span>Nachricht</span>
            <span>Status</span>
            <span className="md:text-right">Eingang</span>
            <span aria-hidden />
          </div>

          <ul className="divide-y divide-ink/[0.06]">
            {rows.map((i) => (
              <InquiryRow
                key={i.id}
                inquiry={i}
                confirming={confirmId === i.id}
                pending={pending}
                onAskDelete={() => setConfirmId(i.id)}
                onCancelDelete={() => setConfirmId(null)}
                onConfirmDelete={() => remove(i.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function InquiryRow({
  inquiry: i,
  confirming,
  pending,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  inquiry: ContactInquirySummary;
  confirming: boolean;
  pending: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const initials =
    (i.firstName[0] ?? "").toUpperCase() + (i.lastName[0] ?? "").toUpperCase();
  const s = STATUS[i.status] ?? DEFAULT_STATUS;

  return (
    <li className="group relative">
      <Link
        href={`/crm/inquiries/${i.id}`}
        aria-label={`Anfrage von ${i.firstName} ${i.lastName} öffnen`}
        className={[
          "flex flex-col gap-3 px-6 py-4 pr-16 transition-colors duration-200",
          "hover:bg-gradient-to-r hover:from-surface-subtle/80 hover:via-surface-subtle/30 hover:to-transparent",
          "focus:bg-surface-subtle/60 focus:outline-none",
          GRID,
        ].join(" ")}
      >
        <span
          aria-hidden
          className="absolute inset-y-2 left-0 w-[3px] origin-top scale-y-0 rounded-full bg-gradient-to-b from-brand-500 to-brand-700 opacity-0 transition-all duration-200 group-hover:scale-y-100 group-hover:opacity-100"
        />

        <span className="flex items-center gap-3.5">
          <span
            aria-hidden
            className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-[12.5px] font-bold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_2px_6px_-1px_rgba(11,21,48,0.35)] ring-2 ring-white transition-transform duration-200 group-hover:scale-[1.06]"
          >
            {initials || "·"}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[14.5px] font-semibold tracking-tight text-navy-950 transition-colors group-hover:text-brand-700">
              {i.firstName} {i.lastName}
            </span>
            <span className="block truncate text-[12.5px] text-ink-muted">
              {i.email}
            </span>
          </span>
        </span>

        <span className="flex flex-wrap items-center gap-x-3 gap-y-2 md:contents">
          <span className="text-[13.5px] text-ink-soft md:truncate">
            {truncate(i.message, 90)}
          </span>
          <span className="md:min-w-0">
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1",
                s.pill,
              ].join(" ")}
            >
              <span aria-hidden className={["h-1.5 w-1.5 rounded-full", s.dot].join(" ")} />
              {s.label}
            </span>
          </span>
          <span className="text-[12.5px] tabular-nums text-ink-muted md:text-right">
            {TIME.format(i.createdAt)}
          </span>
        </span>
      </Link>

      {/* delete control — sibling of the link, sits on top */}
      <div className="absolute right-4 top-1/2 z-10 -translate-y-1/2">
        {confirming ? (
          <span className="flex items-center gap-1 rounded-full bg-white px-1.5 py-1 shadow-sm ring-1 ring-ink/10">
            <button
              type="button"
              disabled={pending}
              onClick={onConfirmDelete}
              aria-label="Löschen bestätigen"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              aria-label="Abbrechen"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={onAskDelete}
            aria-label="Anfrage löschen"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 bg-white text-ink-muted shadow-sm transition-all duration-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:opacity-100 md:opacity-0 md:group-hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </li>
  );
}
