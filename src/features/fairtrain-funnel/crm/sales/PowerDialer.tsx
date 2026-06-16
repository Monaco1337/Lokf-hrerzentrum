"use client";
/**
 * PowerDialer — focused, single-lead-at-a-time call workflow.
 *
 * Loads a queue of leads (sorted by urgency on the server) and walks the
 * operator through one lead at a time. Each call ends in an outcome that
 * is persisted via `logCall` and (optionally) sets `nextFollowUpAt`. The
 * dialer then auto-advances to the next lead.
 */
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { Route } from "next";

import { logCall } from "@/server/actions/logCall";

import {
  CALL_OUTCOME_LABEL,
  CallOutcome,
  type LeadSummary,
} from "../../types";
import { PriorityBadge } from "../PriorityBadge";

interface QueueEntry {
  lead: LeadSummary;
  reason: string;
}

interface Props {
  queue: ReadonlyArray<QueueEntry>;
}

type OutcomeKey = CallOutcome;

const OUTCOME_BUTTONS: ReadonlyArray<{
  outcome: OutcomeKey;
  label: string;
  tone: "primary" | "muted" | "amber" | "rose" | "accent";
  hotkey: string;
  /** Whether this outcome should auto-advance to the next lead. */
  advances: boolean;
  /** Whether this outcome needs a callback timestamp. */
  needsCallback?: boolean;
}> = [
  { outcome: CallOutcome.TALKED, label: "Gespräch geführt", tone: "primary", hotkey: "1", advances: true },
  { outcome: CallOutcome.ATTEMPT_NO_ANSWER, label: "Nicht erreicht", tone: "muted", hotkey: "2", advances: true },
  { outcome: CallOutcome.CALLBACK_SCHEDULED, label: "Rückruf vereinbart", tone: "amber", hotkey: "3", advances: true, needsCallback: true },
  { outcome: CallOutcome.APPOINTMENT_SET, label: "Termin vereinbart", tone: "accent", hotkey: "4", advances: true, needsCallback: true },
  { outcome: CallOutcome.NOT_INTERESTED, label: "Kein Interesse", tone: "rose", hotkey: "5", advances: true },
  { outcome: CallOutcome.NOT_ELIGIBLE, label: "Nicht geeignet", tone: "rose", hotkey: "6", advances: true },
];

const TONE_CLASSES: Record<
  (typeof OUTCOME_BUTTONS)[number]["tone"],
  string
> = {
  primary:
    "bg-orange-500 text-black hover:bg-orange-400 border-orange-500 shadow-[0_8px_24px_-12px_rgba(249,115,22,0.6)]",
  muted:
    "bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08] border-white/10",
  amber:
    "bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 border-amber-500/40",
  rose: "bg-red-500/15 text-red-200 hover:bg-red-500/25 border-red-500/40",
  accent:
    "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 border-emerald-500/40",
};

function formatPhone(p: string): string {
  return p.replace(/\s+/g, " ");
}

function formatTime(d: Date | null): string {
  if (!d) return "—";
  const diffMs = Date.now() - d.getTime();
  const hours = Math.round(diffMs / 3600000);
  if (Math.abs(hours) < 24) return `vor ${Math.abs(hours)} Std.`;
  const days = Math.round(hours / 24);
  return `vor ${Math.abs(days)} Tagen`;
}

export function PowerDialer({ queue }: Props) {
  const [idx, setIdx] = useState(0);
  const [note, setNote] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<Array<{ leadId: string; outcome: OutcomeKey }>>(
    [],
  );

  const total = queue.length;
  const current = queue[idx];
  const progressPct = total === 0 ? 100 : Math.round((idx / total) * 100);

  const advance = () => {
    setNote("");
    setCallbackAt("");
    setError(null);
    setIdx((i) => Math.min(i + 1, total));
  };

  const submit = (config: (typeof OUTCOME_BUTTONS)[number]) => {
    if (!current) return;
    if (config.needsCallback && !callbackAt) {
      setError("Bitte einen Rückruftermin auswählen.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await logCall({
        leadId: current.lead.id,
        outcome: config.outcome,
        note,
        nextStep: "",
        callbackAt: callbackAt ? new Date(callbackAt).toISOString() : "",
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setDone((d) => [...d, { leadId: current.lead.id, outcome: config.outcome }]);
      if (config.advances) advance();
    });
  };

  const handleKeyboard = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    const match = OUTCOME_BUTTONS.find((b) => b.hotkey === e.key);
    if (match) {
      e.preventDefault();
      submit(match);
    }
  };

  const summary = useMemo(() => {
    const tally: Record<string, number> = {};
    for (const d of done) tally[d.outcome] = (tally[d.outcome] ?? 0) + 1;
    return tally;
  }, [done]);

  if (total === 0) {
    return (
      <EmptyDialer reason="Aktuell sind keine Leads für das Anrufcenter eingereiht. Sobald neue Hot-Leads oder fällige Rückrufe entstehen, erscheinen sie automatisch hier." />
    );
  }

  if (!current) {
    return <DialerSummary tally={summary} total={total} />;
  }

  return (
    <div className="space-y-4" onKeyDown={handleKeyboard} tabIndex={-1}>
      {/* Progress strip */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Anrufcenter
          </span>
          <span className="text-[13px] font-semibold text-navy-950">
            Lead {idx + 1} von {total}
          </span>
        </div>
        <div className="flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-700 to-accent-600"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
        <span className="text-[11.5px] font-medium text-ink-soft">
          {done.length} dokumentiert
        </span>
      </div>

      {/* Lead card */}
      <article className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              Aktiver Lead
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-navy-950">
              {current.lead.firstName} {current.lead.lastName}
            </h2>
            <p className="mt-1 text-[13px] text-ink-soft">
              {current.lead.city ?? "Ort offen"} · Score{" "}
              <span className="font-semibold text-navy-950">{current.lead.score}</span>{" "}
              · Letzte Aktivität {formatTime(current.lead.updatedAt)}
            </p>
            <p className="mt-2 text-[12.5px] text-ink-soft">
              <span className="font-medium text-navy-950">Empfehlung:</span>{" "}
              {current.reason}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <PriorityBadge priority={current.lead.priority} />
            <Link
              href={`/crm/leads/${current.lead.id}` as Route}
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-brand-700 hover:underline"
            >
              Lead öffnen ↗
            </Link>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <a
            href={`tel:${current.lead.phone}`}
            className="flex items-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/[0.10] px-3.5 py-2.5 text-[13.5px] font-semibold text-orange-200 transition hover:bg-orange-500/15"
          >
            <span aria-hidden className="text-[16px]">☎</span>
            {formatPhone(current.lead.phone)}
          </a>
          <a
            href={`mailto:${current.lead.email}`}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-zinc-300 transition hover:bg-white/[0.06]"
          >
            <span aria-hidden className="text-[14px]">✉</span>
            <span className="truncate">{current.lead.email}</span>
          </a>
          <div
            className={[
              "flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12.5px]",
              current.lead.slaBreachedAt
                ? "border-red-500/40 bg-red-500/[0.10] text-red-200"
                : "border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-200",
            ].join(" ")}
          >
            <span aria-hidden className="text-[14px]">⏱</span>
            <span>SLA {current.lead.slaBreachedAt ? "überschritten" : "im Plan"}</span>
          </div>
        </div>

        <div className="mt-5">
          <label className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Gesprächsnotiz
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Stichworte: Interesse, Bedenken, vereinbarter nächster Schritt …"
            className="input mt-1"
            maxLength={2000}
          />
        </div>

        <div className="mt-3">
          <label className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Rückruf / Termin (optional)
          </label>
          <input
            type="datetime-local"
            value={callbackAt}
            onChange={(e) => setCallbackAt(e.target.value)}
            className="input mt-1"
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-3">
          {OUTCOME_BUTTONS.map((b) => (
            <button
              key={b.outcome}
              type="button"
              disabled={pending}
              onClick={() => submit(b)}
              className={[
                "flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[13px] font-semibold shadow-sm transition disabled:cursor-wait disabled:opacity-60",
                TONE_CLASSES[b.tone],
              ].join(" ")}
              title={CALL_OUTCOME_LABEL[b.outcome]}
            >
              <span>{b.label}</span>
              <kbd className="rounded-md border border-current/20 bg-white/40 px-1.5 py-0.5 text-[10px] font-bold opacity-70">
                {b.hotkey}
              </kbd>
            </button>
          ))}
          <button
            type="button"
            onClick={advance}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-[13px] font-semibold text-zinc-300 transition hover:bg-white/[0.06]"
            title="Überspringen"
          >
            <span>Nächster Lead</span>
            <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-bold opacity-70">
              ↵
            </kbd>
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-200">
            {error}
          </p>
        )}

        <p className="mt-4 text-[11px] text-ink-muted">
          Tipp: Tastenkürzel 1–6 entscheiden direkt. Notizen werden mitgespeichert.
        </p>
      </article>
    </div>
  );
}

function EmptyDialer({ reason }: { reason: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-10 text-center">
      <p className="text-[14px] font-medium text-ink-soft">Anrufcenter leer</p>
      <p className="mt-1 text-[12.5px] text-ink-muted">{reason}</p>
    </div>
  );
}

function DialerSummary({
  tally,
  total,
}: {
  tally: Record<string, number>;
  total: number;
}) {
  return (
    <div className="rounded-2xl border border-accent-200 bg-accent-50/40 p-8">
      <h2 className="text-xl font-semibold text-navy-950">Session beendet</h2>
      <p className="mt-1 text-[13px] text-ink-soft">
        {total} Leads durchgearbeitet. Zusammenfassung:
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {Object.entries(tally).map(([k, v]) => (
          <li
            key={k}
            className="flex items-center justify-between rounded-lg border border-accent-200 bg-white px-3 py-2 text-[13px]"
          >
            <span>{CALL_OUTCOME_LABEL[k as CallOutcome]}</span>
            <span className="font-semibold text-navy-950">{v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
