"use client";

/**
 * Presentational pieces for the Multichat work surface: the conversation list
 * row and the message thread + reply composer. Apple-style: light, glassy,
 * rounded, soft shadows, green accents — no dark surfaces.
 */
import { type MultichatConversation } from "@/features/fairtrain-funnel/messaging/types";

import {
  ContactStatePill,
  EmploymentBucketPill,
  FunnelPhasePill,
  MULTICHAT_TIME,
  relativeTime,
  WorkStatusPill,
} from "./MultichatBadges";

export { MULTICHAT_TIME } from "./MultichatBadges";

export function ConversationRow({
  convo,
  active,
  onSelect,
}: {
  convo: MultichatConversation;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={
          "w-full px-3 py-3 text-left transition " +
          (active
            ? "bg-emerald-50/70 ring-1 ring-inset ring-emerald-200"
            : "hover:bg-slate-50")
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded-lg bg-slate-900/5 px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-slate-500">
              #{convo.seq}
            </span>
            <span className="truncate font-semibold text-slate-900">
              {convo.leadName}
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-slate-400">
            {relativeTime(convo.lastAt)}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-1.5">
          <WorkStatusPill status={convo.workStatus} />
          {convo.unread > 0 ? (
            <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10.5px] font-semibold text-white">
              {convo.unread} neu
            </span>
          ) : null}
        </div>

        <p className="mt-1 truncate text-[13px] text-slate-500">
          {convo.preview}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <EmploymentBucketPill bucket={convo.employmentBucket} />
          <FunnelPhasePill phase={convo.funnelPhase} label={convo.funnelPhaseLabel} />
          {convo.leadType === "neu" ? (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
              Funnel-Lead
            </span>
          ) : null}
          {convo.numberLabel ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium text-slate-500">
              {convo.numberLabel}
            </span>
          ) : null}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-medium tabular-nums text-slate-500">
            {convo.total} Nachr.
          </span>
        </div>
      </button>
    </li>
  );
}

export function Thread({
  convo,
  draft,
  setDraft,
  onSend,
  pending,
  error,
  notice,
  live,
}: {
  convo: MultichatConversation;
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  pending: boolean;
  error: string | null;
  notice: string | null;
  live: boolean;
}) {
  return (
    <>
      <header className="border-b border-black/5 bg-white/60 px-5 py-3.5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-lg bg-slate-900/5 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-slate-500">
                #{convo.seq}
              </span>
              <span className="truncate text-[15px] font-semibold text-slate-900">
                {convo.leadName}
              </span>
              <WorkStatusPill status={convo.workStatus} />
            </div>
            <div className="mt-0.5 truncate text-[12px] text-slate-500">
              {convo.phone}
              {convo.numberLabel ? ` · via ${convo.numberLabel}` : ""}
              {convo.assignedName ? ` · ${convo.assignedName}` : ""}
              {` · ${convo.total} Nachrichten`}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <EmploymentBucketPill bucket={convo.employmentBucket} />
            <ContactStatePill state={convo.contactState} />
          </div>
        </div>
        {notice ? (
          <p className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12.5px] text-emerald-700">
            {notice}
          </p>
        ) : null}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-gradient-to-b from-slate-50/60 to-white px-5 py-4">
        {convo.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-[13px] text-slate-400">
            Noch keine Nachrichten in dieser Unterhaltung.
          </div>
        ) : (
          convo.messages.map((m) => (
            <div
              key={m.id}
              className={
                m.direction === "OUT" ? "flex justify-end" : "flex justify-start"
              }
            >
              <div
                className={
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-[13.5px] shadow-sm ring-1 ring-inset " +
                  (m.direction === "OUT"
                    ? "bg-emerald-50 text-slate-900 ring-emerald-100"
                    : "bg-white text-slate-900 ring-black/5")
                }
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <div className="mt-1 text-right text-[10.5px] text-slate-400">
                  {MULTICHAT_TIME.format(new Date(m.createdAt))}
                  {m.direction === "OUT" ? ` · ${statusLabel(m.status)}` : ""}
                  {m.isDemo ? " · Sim" : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-black/5 bg-white/60 p-3 backdrop-blur">
        {error ? (
          <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[13px] text-rose-700">
            {error}
          </p>
        ) : null}
        {convo.optOut ? (
          <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[13px] font-medium text-rose-700">
            Dieser Lead hat sich per WhatsApp abgemeldet (Opt-out). Es können
            keine WhatsApp-Nachrichten mehr gesendet werden.
          </p>
        ) : null}
        {!live ? (
          <p className="mb-2 text-[12px] text-amber-700">
            Simulationsmodus – Nachrichten werden protokolliert, aber nicht real
            versendet.
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={2}
            disabled={convo.optOut}
            placeholder={
              convo.optOut
                ? "Lead abgemeldet – Versand deaktiviert"
                : "Antwort schreiben… (⌘/Strg + Enter zum Senden)"
            }
            className="min-h-[46px] flex-1 resize-y rounded-2xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={pending || !draft.trim() || convo.optOut}
            className="h-[46px] shrink-0 rounded-2xl bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-40"
          >
            {pending ? "Sendet…" : "Senden"}
          </button>
        </div>
      </div>
    </>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "READ":
      return "gelesen";
    case "DELIVERED":
      return "zugestellt";
    case "SENT":
      return "gesendet";
    case "QUEUED":
      return "in Warteschlange";
    case "FAILED":
      return "fehlgeschlagen";
    default:
      return status.toLowerCase();
  }
}
