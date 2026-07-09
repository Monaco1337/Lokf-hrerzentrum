"use client";

/**
 * Presentational pieces for the Multichat inbox: the conversation list row and
 * the message thread + reply composer. Kept separate from MultichatInbox so the
 * container stays focused on state/filtering.
 */
import Link from "next/link";

import {
  type MultichatConversation,
  WHATSAPP_TRACKING_LABEL,
} from "@/features/fairtrain-funnel/messaging/types";

export const MULTICHAT_TIME = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

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
          "w-full border-b border-[#F3F4F6] px-4 py-3 text-left transition " +
          (active ? "bg-[#F3F4F6]" : "hover:bg-[#F9FAFB]")
        }
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium text-[#111827]">
            {convo.leadName}
          </span>
          <span className="shrink-0 text-[11px] text-[#9CA3AF]">
            {MULTICHAT_TIME.format(new Date(convo.lastAt))}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-[#6B7280]">{convo.preview}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {convo.numberLabel ? (
            <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10.5px] font-medium text-[#4338CA]">
              {convo.numberLabel}
            </span>
          ) : null}
          {convo.assignedName ? (
            <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10.5px] text-[#6B7280]">
              {convo.assignedName}
            </span>
          ) : null}
          <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10.5px] text-[#6B7280]">
            {WHATSAPP_TRACKING_LABEL[convo.whatsappStatus]}
          </span>
          <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10.5px] font-semibold tabular-nums text-[#374151]">
            {convo.leadScore}
          </span>
          {convo.hasNewReply ? (
            <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10.5px] font-semibold text-[#15803D]">
              Antwort
            </span>
          ) : null}
          {convo.unread > 0 ? (
            <span className="ml-auto rounded-full bg-[#16A34A] px-2 py-0.5 text-[10.5px] font-semibold text-white">
              {convo.unread}
            </span>
          ) : null}
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
  onMarkDone,
  onSelfCheck,
  pending,
  error,
  notice,
  live,
}: {
  convo: MultichatConversation;
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  onMarkDone: () => void;
  onSelfCheck: () => void;
  pending: boolean;
  error: string | null;
  notice: string | null;
  live: boolean;
}) {
  const actionCls =
    "shrink-0 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[13px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50";
  return (
    <>
      <header className="border-b border-[#EEF0F3] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold text-[#111827]">
              {convo.leadName}
            </div>
            <div className="truncate text-[12px] text-[#6B7280]">
              {convo.phone}
              {convo.numberLabel ? ` · via ${convo.numberLabel}` : ""}
              {convo.assignedName ? ` · ${convo.assignedName}` : ""}
              {convo.source ? ` · ${convo.source}` : ""}
              {` · Score ${convo.leadScore}`}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-medium text-[#374151]">
            {WHATSAPP_TRACKING_LABEL[convo.whatsappStatus]}
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Link href={`/crm/leads/${convo.leadId}`} className={actionCls}>
            Lead öffnen
          </Link>
          <a href={`tel:${convo.phone}`} className={actionCls}>
            Anrufen
          </a>
          <button
            type="button"
            onClick={onSelfCheck}
            disabled={pending}
            className={actionCls}
          >
            Selbstcheck-Link senden
          </button>
          <button
            type="button"
            onClick={onMarkDone}
            disabled={pending || !convo.hasNewReply}
            className={actionCls}
          >
            Als erledigt markieren
          </button>
        </div>
        {notice ? (
          <p className="mt-2 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-1.5 text-[12.5px] text-[#15803D]">
            {notice}
          </p>
        ) : null}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-[#F6F7F9] px-4 py-4">
        {convo.messages.map((m) => (
          <div
            key={m.id}
            className={m.direction === "OUT" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                "max-w-[78%] rounded-2xl px-3.5 py-2 text-[13.5px] shadow-sm " +
                (m.direction === "OUT"
                  ? "bg-[#DCF8C6] text-[#111827]"
                  : "border border-[#EEF0F3] bg-white text-[#111827]")
              }
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <div className="mt-1 text-right text-[10.5px] text-[#9CA3AF]">
                {MULTICHAT_TIME.format(new Date(m.createdAt))}
                {m.direction === "OUT" ? ` · ${statusLabel(m.status)}` : ""}
                {m.isDemo ? " · Sim" : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[#EEF0F3] p-3">
        {error ? (
          <p className="mb-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-[13px] text-[#B91C1C]">
            {error}
          </p>
        ) : null}
        {!live ? (
          <p className="mb-2 text-[12px] text-[#92400E]">
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
            placeholder="Antwort schreiben… (⌘/Strg + Enter zum Senden)"
            className="min-h-[44px] flex-1 resize-y rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#111827]"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={pending || !draft.trim()}
            className="h-[44px] shrink-0 rounded-lg bg-[#16A34A] px-4 text-sm font-medium text-white transition hover:bg-[#15803D] disabled:opacity-50"
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
