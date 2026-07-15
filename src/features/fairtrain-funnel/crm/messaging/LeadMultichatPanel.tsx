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
import type { ManualResolutionId } from "@/features/fairtrain-funnel/types";
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
    <section className="flex max-h-[70vh] min-h-[440px] flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
      <Thread
        convo={conversation}
        draft={draft}
        setDraft={setDraft}
        onSend={handleSend}
        onResolve={handleResolve}
        onSelfCheck={handleSelfCheck}
        pending={pending}
        error={error}
        notice={notice}
        live={whatsappLive}
      />
    </section>
  );
}
