"use client";
/**
 * LeadMultichatPanel — the WhatsApp thread embedded directly in the Lead
 * Command Center (Kommunikation tab). Reuses the exact same `Thread` UI as the
 * global Multichat inbox, wired to the same server actions, so replying from a
 * lead behaves identically to the inbox (real send, opt-out/contact guard,
 * "Erledigt", Selbstcheck-Link).
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { MultichatConversation } from "@/features/fairtrain-funnel/messaging/types";
import {
  MANUAL_RESOLUTIONS,
  type ManualResolutionId,
} from "@/features/fairtrain-funnel/contactState";
import {
  resolveMultichatConversation,
  sendWhatsAppText,
} from "@/server/actions/messaging";
import { sendMagicLink } from "@/server/actions/sendMagicLink";

import { Thread } from "./MultichatThread";

export function LeadMultichatPanel({
  conversation,
  whatsappLive,
}: {
  conversation: MultichatConversation | null;
  whatsappLive: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!conversation) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm text-ink-muted">
        Keine WhatsApp-Konversation verfügbar.
      </div>
    );
  }

  function handleSend() {
    if (!conversation || !draft.trim()) return;
    setError(null);
    const body = draft.trim();
    startTransition(async () => {
      const res = await sendWhatsAppText({ leadId: conversation.leadId, body });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setDraft("");
      router.refresh();
    });
  }

  function handleResolve(resolution: ManualResolutionId) {
    if (!conversation) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await resolveMultichatConversation({
        leadId: conversation.leadId,
        resolution,
      });
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
    if (!conversation) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await sendMagicLink({
        leadId: conversation.leadId,
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
    <section className="flex max-h-[70vh] min-h-[440px] flex-col overflow-hidden rounded-3xl border border-black/5 bg-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl">
      <Thread
        convo={conversation}
        draft={draft}
        setDraft={setDraft}
        onSend={handleSend}
        pending={pending}
        error={error}
        notice={notice}
        live={whatsappLive}
      />
      <div className="flex flex-wrap items-center gap-1.5 border-t border-black/5 bg-white/60 px-3 py-2 backdrop-blur">
        <button
          type="button"
          onClick={handleSelfCheck}
          disabled={pending || conversation.optOut}
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
    </section>
  );
}
