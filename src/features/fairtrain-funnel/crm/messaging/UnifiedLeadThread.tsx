"use client";
/**
 * UnifiedLeadThread — the ONE conversation for a lead (Kommunikation tab).
 *
 * Shows the complete communication ledger in a single chronological thread:
 * WhatsApp, E-Mail, reactivation, funnel and manual messages — everything that
 * ever went out to or came in from this person, in one place, so a Vertriebler
 * always sees the full history without switching views. Replying sends a real
 * WhatsApp message (same server action + guards as the global inbox); the
 * footer keeps the Selbstcheck-Link and the "Erledigt"-resolutions.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  type CommunicationEntry,
  CommunicationChannel,
  CommunicationDirection,
} from "@/features/fairtrain-funnel/types";
import {
  MANUAL_RESOLUTIONS,
  type ManualResolutionId,
} from "@/features/fairtrain-funnel/contactState";
import {
  resolveMultichatConversation,
  sendWhatsAppText,
} from "@/server/actions/messaging";
import { sendMagicLink } from "@/server/actions/sendMagicLink";

const TIME = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const CHANNEL_LABEL: Record<CommunicationChannel, string> = {
  [CommunicationChannel.WHATSAPP]: "WhatsApp",
  [CommunicationChannel.EMAIL]: "E-Mail",
  [CommunicationChannel.SMS]: "SMS",
  [CommunicationChannel.INTERNAL]: "Intern",
};

const CHANNEL_TONE: Record<CommunicationChannel, string> = {
  [CommunicationChannel.WHATSAPP]: "bg-emerald-100 text-emerald-700",
  [CommunicationChannel.EMAIL]: "bg-sky-100 text-sky-700",
  [CommunicationChannel.SMS]: "bg-violet-100 text-violet-700",
  [CommunicationChannel.INTERNAL]: "bg-slate-100 text-slate-600",
};

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

export function UnifiedLeadThread({
  leadId,
  leadName,
  phone,
  optOut,
  whatsappLive,
  communications,
}: {
  leadId: string;
  leadName: string;
  phone: string;
  optOut: boolean;
  whatsappLive: boolean;
  communications: ReadonlyArray<CommunicationEntry>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const messages = [...communications].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  function handleSend() {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    startTransition(async () => {
      const res = await sendWhatsAppText({ leadId, body });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setDraft("");
      router.refresh();
    });
  }

  function handleResolve(resolution: ManualResolutionId) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await resolveMultichatConversation({ leadId, resolution });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setNotice(
        res.data.canceledJobs > 0
          ? `Erledigt · ${res.data.canceledJobs} geplante Nachricht(en) gestoppt.`
          : "Erledigt · Kontaktschutz aktiv.",
      );
      router.refresh();
    });
  }

  function handleSelfCheck() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await sendMagicLink({
        leadId,
        scope: "COMPLETE_PROFILE",
        channel: "WHATSAPP",
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setNotice("Selbstcheck-Link per WhatsApp gesendet.");
      router.refresh();
    });
  }

  return (
    <section className="flex max-h-[72vh] min-h-[460px] flex-col overflow-hidden rounded-3xl border border-black/5 bg-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <header className="border-b border-black/5 bg-white/60 px-5 py-3.5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-slate-900">
              {leadName}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-slate-500">
              {phone} · {messages.length} Nachrichten · vollständiger Verlauf
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            Ein Verlauf
          </span>
        </div>
        {notice ? (
          <p className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12.5px] text-emerald-700">
            {notice}
          </p>
        ) : null}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto bg-gradient-to-b from-slate-50/60 to-white px-5 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-[13px] text-slate-400">
            Noch keine Nachrichten in dieser Unterhaltung.
          </div>
        ) : (
          messages.map((m) => {
            const out = m.direction === CommunicationDirection.OUT;
            return (
              <div
                key={m.id}
                className={out ? "flex justify-end" : "flex justify-start"}
              >
                <div className="max-w-[80%]">
                  <div
                    className={
                      "flex items-center gap-1.5 " +
                      (out ? "justify-end" : "justify-start")
                    }
                  >
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold ${CHANNEL_TONE[m.channel]}`}
                    >
                      {CHANNEL_LABEL[m.channel]}
                    </span>
                    {m.templateName ? (
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-medium text-slate-500">
                        {m.templateName}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={
                      "mt-1 rounded-2xl px-3.5 py-2 text-[13.5px] shadow-sm ring-1 ring-inset " +
                      (out
                        ? "bg-emerald-50 text-slate-900 ring-emerald-100"
                        : "bg-white text-slate-900 ring-black/5")
                    }
                  >
                    <p className="whitespace-pre-wrap break-words">{m.payload}</p>
                    <div className="mt-1 text-right text-[10.5px] text-slate-400">
                      {TIME.format(m.createdAt)}
                      {out ? ` · ${statusLabel(m.status)}` : ""}
                      {m.isDemo ? " · Sim" : ""}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-black/5 bg-white/60 p-3 backdrop-blur">
        {error ? (
          <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[13px] text-rose-700">
            {error}
          </p>
        ) : null}
        {optOut ? (
          <p className="mb-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-[13px] font-medium text-rose-700">
            Dieser Lead hat sich per WhatsApp abgemeldet (Opt-out). Es können
            keine WhatsApp-Nachrichten mehr gesendet werden.
          </p>
        ) : null}
        {!whatsappLive ? (
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
                handleSend();
              }
            }}
            rows={2}
            disabled={optOut}
            placeholder={
              optOut
                ? "Lead abgemeldet – Versand deaktiviert"
                : "WhatsApp-Antwort schreiben… (⌘/Strg + Enter zum Senden)"
            }
            className="min-h-[46px] flex-1 resize-y rounded-2xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={pending || !draft.trim() || optOut}
            className="h-[46px] shrink-0 rounded-2xl bg-emerald-500 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-40"
          >
            {pending ? "Sendet…" : "Senden"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleSelfCheck}
            disabled={pending || optOut}
            className="rounded-full bg-emerald-500 px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-40"
          >
            Selbstcheck-Link senden
          </button>
          {MANUAL_RESOLUTIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleResolve(r.id)}
              disabled={pending}
              className="rounded-full border border-black/10 bg-white/80 px-3 py-1.5 text-[12.5px] font-medium text-slate-700 transition hover:bg-white disabled:opacity-40"
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
