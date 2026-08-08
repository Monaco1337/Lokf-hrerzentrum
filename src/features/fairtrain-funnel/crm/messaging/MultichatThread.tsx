"use client";

/**
 * Presentational pieces for the Multichat work surface: the conversation list
 * row and the message thread + reply composer. Premium dark High-End surface
 * via the remap-proof `.dash-*` layer (matching the Dashboard). Behaviour is
 * unchanged — only styling was elevated.
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
            ? "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/25"
            : "hover:bg-white/[0.03]")
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded-lg bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums text-[#9aa6a0]">
              #{convo.seq}
            </span>
            <span className="truncate font-semibold text-[#e9efeb]">
              {convo.leadName}
            </span>
          </span>
          <span className="shrink-0 text-[11px] text-[#7f8a83]">
            {relativeTime(convo.lastAt)}
          </span>
        </div>

        <div className="mt-1.5 flex items-center gap-1.5">
          <WorkStatusPill status={convo.workStatus} />
          {convo.unread > 0 ? (
            <span className="rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10.5px] font-bold text-[#052e16]">
              {convo.unread} neu
            </span>
          ) : null}
        </div>

        <p className="mt-1.5 truncate text-[13px] text-[#9aa6a0]">
          {convo.preview}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <EmploymentBucketPill bucket={convo.employmentBucket} />
          <FunnelPhasePill phase={convo.funnelPhase} label={convo.funnelPhaseLabel} />
          {convo.leadType === "neu" ? (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/25">
              Funnel-Lead
            </span>
          ) : null}
          {convo.numberLabel ? (
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] font-medium text-[#9aa6a0]">
              {convo.numberLabel}
            </span>
          ) : null}
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10.5px] font-medium tabular-nums text-[#9aa6a0]">
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
      <header className="border-b border-white/[0.06] bg-white/[0.02] px-5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="shrink-0 rounded-lg bg-white/[0.06] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[#9aa6a0]">
                #{convo.seq}
              </span>
              <span className="truncate text-[15px] font-bold text-white">
                {convo.leadName}
              </span>
              <WorkStatusPill status={convo.workStatus} />
            </div>
            <div className="mt-0.5 truncate text-[12px] text-[#9aa6a0]">
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
          <p className="dash-note-ok mt-2.5 px-3 py-1.5 text-[12.5px]">{notice}</p>
        ) : null}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-white/[0.01] px-5 py-4">
        {convo.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-[13px] text-[#7f8a83]">
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
                  "max-w-[78%] rounded-2xl px-3.5 py-2 text-[13.5px] " +
                  (m.direction === "OUT" ? "dash-bubble-out" : "dash-bubble-in")
                }
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <div className="mt-1 text-right text-[10.5px] opacity-60">
                  {MULTICHAT_TIME.format(new Date(m.createdAt))}
                  {m.direction === "OUT" ? ` · ${statusLabel(m.status)}` : ""}
                  {m.isDemo ? " · Sim" : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-white/[0.06] bg-white/[0.02] p-3">
        {error ? (
          <p className="dash-note-err mb-2 px-3 py-1.5 text-[13px]">{error}</p>
        ) : null}
        {convo.optOut ? (
          <p className="dash-note-err mb-2 px-3 py-1.5 text-[13px] font-medium">
            Dieser Lead hat sich per WhatsApp abgemeldet (Opt-out). Es können
            keine WhatsApp-Nachrichten mehr gesendet werden.
          </p>
        ) : null}
        {!live ? (
          <p className="mb-2 text-[12px] text-amber-300">
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
            className="dash-field min-h-[46px] flex-1 resize-y px-3.5 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={pending || !draft.trim() || convo.optOut}
            className="dash-btn-primary h-[46px] shrink-0 rounded-2xl px-5 text-sm transition disabled:opacity-40"
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
