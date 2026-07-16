"use client";
/**
 * CallbackRequestsInbox — "Rückrufe angefordert".
 *
 * Left: queue of Alt-Leads whose reply was detected as a callback/consultation
 * request (oldest first). Right: everything an operator needs to act — full
 * chat history, last inbound message, current status, a call button, and the
 * next-step resolution (Eignungscheck senden / Beratung erforderlich /
 * Termin vereinbart / Erledigt).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  CALLBACK_NEXT_STEP_LABEL,
  type CallbackNextStep,
  type CallbackRequestItem,
  type CallbackRequestsData,
} from "@/features/fairtrain-funnel/messaging/types";
import { resolveCallbackRequest } from "@/server/actions/callbackRequests";
import { sendWhatsAppText } from "@/server/actions/messaging";

const REQUEST_DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const MSG_TIME = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.floor(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  return `vor ${Math.floor(h / 24)} Tg.`;
}

function RequestRow({
  item,
  active,
  onSelect,
}: {
  item: CallbackRequestItem;
  active: boolean;
  onSelect: () => void;
}) {
  const name = `${item.firstName} ${item.lastName}`.trim() || item.phone;
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
          <span className="truncate font-medium text-[#111827]">{name}</span>
          <span className="shrink-0 text-[11px] text-[#9CA3AF]">
            {timeAgo(item.callbackRequestedAt)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-[#6B7280]">
          {item.lastInboundMessage ?? "Keine Nachricht"}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10.5px] font-semibold text-[#B91C1C] ring-1 ring-inset ring-[#FECACA]">
            {item.funnelPhaseLabel}
          </span>
          <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10.5px] text-[#6B7280]">
            {item.phone}
          </span>
        </div>
      </button>
    </li>
  );
}

function DetailPanel({
  item,
  draft,
  setDraft,
  onSend,
  onResolve,
  pending,
  error,
  notice,
  live,
}: {
  item: CallbackRequestItem;
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  onResolve: (step: CallbackNextStep) => void;
  pending: boolean;
  error: string | null;
  notice: string | null;
  live: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const name = `${item.firstName} ${item.lastName}`.trim() || item.phone;
  const messages = item.conversation?.messages ?? [];
  const actionCls =
    "shrink-0 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[13px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50";

  return (
    <>
      <header className="border-b border-[#EEF0F3] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate font-semibold text-[#111827]">{name}</div>
            <div className="truncate text-[12px] text-[#6B7280]">
              {item.phone} · {item.email}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-semibold text-[#B91C1C] ring-1 ring-inset ring-[#FECACA]">
            {item.funnelPhaseLabel}
          </span>
        </div>
        <p className="mt-1.5 text-[11.5px] text-[#92400E]">
          Rückruf angefordert am {REQUEST_DATE.format(new Date(item.callbackRequestedAt))} ({timeAgo(item.callbackRequestedAt)})
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <a href={`tel:${item.phone}`} className={actionCls}>
            Anrufen
          </a>
          <a href={`/crm/leads/${item.leadId}`} className={actionCls}>
            Lead öffnen
          </a>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={pending}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className={actionCls}
            >
              Nächster Schritt ▾
            </button>
            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-1 w-64 overflow-hidden rounded-lg border border-[#E5E7EB] bg-white py-1 shadow-lg"
              >
                {(Object.keys(CALLBACK_NEXT_STEP_LABEL) as CallbackNextStep[]).map((step) => (
                  <button
                    key={step}
                    type="button"
                    role="menuitem"
                    disabled={pending}
                    onClick={() => {
                      setMenuOpen(false);
                      onResolve(step);
                    }}
                    className="block w-full px-3 py-2 text-left text-[13px] text-[#374151] transition hover:bg-[#F3F4F6] disabled:opacity-50"
                  >
                    {CALLBACK_NEXT_STEP_LABEL[step]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {notice ? (
          <p className="mt-2 rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-1.5 text-[12.5px] text-[#15803D]">
            {notice}
          </p>
        ) : null}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-[#F6F7F9] px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-[#9CA3AF]">
            Keine WhatsApp-Historie vorhanden.
          </p>
        ) : (
          messages.map((m) => (
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
                  {MSG_TIME.format(new Date(m.createdAt))}
                  {m.isDemo ? " · Sim" : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-[#EEF0F3] p-3">
        {error ? (
          <p className="mb-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-[13px] text-[#B91C1C]">
            {error}
          </p>
        ) : null}
        {!live ? (
          <p className="mb-2 text-[12px] text-[#92400E]">
            Simulationsmodus – Nachrichten werden protokolliert, aber nicht real versendet.
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

export function CallbackRequestsInbox({ data }: { data: CallbackRequestsData }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(
    data.items[0]?.leadId ?? null,
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = data.items.find((i) => i.leadId === selectedId) ?? null;

  function handleSend() {
    if (!selected || !draft.trim()) return;
    setError(null);
    const body = draft.trim();
    startTransition(async () => {
      const res = await sendWhatsAppText({ leadId: selected.leadId, body });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setDraft("");
      router.refresh();
    });
  }

  function handleResolve(nextStep: CallbackNextStep) {
    if (!selected) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await resolveCallbackRequest({
        leadId: selected.leadId,
        nextStep,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setNotice(`Nächster Schritt: ${CALLBACK_NEXT_STEP_LABEL[nextStep]}`);
      router.refresh();
    });
  }

  return (
    <div data-ops className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Rückrufe angefordert</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            Alt-Leads, die im Multichat einen Rückruf oder eine Beratung gewünscht haben
            {data.items.length > 0 ? ` · ${data.items.length} offen` : ""}
          </p>
        </div>
        <span
          className={
            data.whatsappLive
              ? "rounded-full bg-[#DCFCE7] px-3 py-1 text-[12px] font-medium text-[#15803D]"
              : "rounded-full bg-[#FEF3C7] px-3 py-1 text-[12px] font-medium text-[#92400E]"
          }
        >
          {data.whatsappLive ? "Live" : "Simulation"}
        </span>
      </header>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <aside className="flex max-h-[72vh] flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <ul className="flex-1 overflow-y-auto">
            {data.items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[#6B7280]">
                Keine offenen Rückrufe.
              </li>
            ) : (
              data.items.map((item) => (
                <RequestRow
                  key={item.leadId}
                  item={item}
                  active={item.leadId === selectedId}
                  onSelect={() => setSelectedId(item.leadId)}
                />
              ))
            )}
          </ul>
        </aside>

        <section className="flex max-h-[72vh] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          {selected ? (
            <DetailPanel
              item={selected}
              draft={draft}
              setDraft={setDraft}
              onSend={handleSend}
              onResolve={handleResolve}
              pending={pending}
              error={error}
              notice={notice}
              live={data.whatsappLive}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-[#6B7280]">
              Keine Auswahl.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
