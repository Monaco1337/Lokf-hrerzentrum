"use client";

/**
 * MultichatInbox — unified WhatsApp inbox across all business numbers.
 *
 * Left: filterable conversation list (search, number, unread-only).
 * Right: the selected thread + inline reply. Replies are sent via the
 * `sendWhatsAppText` action, which auto-picks the sending number.
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  EMPLOYMENT_BUCKET_LABEL,
  type EmploymentBucket,
  type MultichatData,
} from "@/features/fairtrain-funnel/messaging/types";
import type { ManualResolutionId } from "@/features/fairtrain-funnel/types";
import {
  resolveMultichatConversation,
  sendWhatsAppText,
} from "@/server/actions/messaging";
import { sendMagicLink } from "@/server/actions/sendMagicLink";

import { ConversationRow, Thread } from "./MultichatThread";

type Tab = "alle" | "neu";
type BucketFilter = "alle" | EmploymentBucket;

const BUCKET_ORDER: EmploymentBucket[] = ["job_seeking", "employed", "other"];

export function MultichatInbox({ data }: { data: MultichatData }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("alle");
  const [bucket, setBucket] = useState<BucketFilter>("alle");
  const [search, setSearch] = useState("");
  const [numberFilter, setNumberFilter] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    data.conversations[0]?.leadId ?? null,
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.conversations.filter((c) => {
      if (tab === "neu" && !c.hasNewReply) return false;
      if (bucket !== "alle" && c.employmentBucket !== bucket) return false;
      if (numberFilter && c.businessPhoneNumberId !== numberFilter) return false;
      if (unreadOnly && c.unread === 0) return false;
      if (!q) return true;
      return (
        c.leadName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.assignedName ?? "").toLowerCase().includes(q)
      );
    });
  }, [data.conversations, tab, bucket, search, numberFilter, unreadOnly]);

  const selected =
    data.conversations.find((c) => c.leadId === selectedId) ?? null;

  const totalUnread = data.conversations.reduce((s, c) => s + c.unread, 0);
  const newReplies = data.conversations.filter((c) => c.hasNewReply).length;

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

  function handleResolve(resolution: ManualResolutionId) {
    if (!selected) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await resolveMultichatConversation({
        leadId: selected.leadId,
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
    if (!selected) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await sendMagicLink({
        leadId: selected.leadId,
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
    <div data-ops className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">Multichat</h1>
          <p className="mt-0.5 text-sm text-[#6B7280]">
            {`${data.totalConversations} Chats · alle WhatsApp-Nummern in einem Posteingang`}
            {totalUnread > 0 ? ` · ${totalUnread} ungelesen` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#E5E7EB] bg-white p-0.5">
            <button
              type="button"
              onClick={() => setTab("alle")}
              className={
                tab === "alle"
                  ? "rounded-md bg-[#111827] px-3 py-1.5 text-[13px] font-medium text-white"
                  : "rounded-md px-3 py-1.5 text-[13px] text-[#374151]"
              }
            >
              Alle
            </button>
            <button
              type="button"
              onClick={() => setTab("neu")}
              className={
                tab === "neu"
                  ? "inline-flex items-center gap-1.5 rounded-md bg-[#111827] px-3 py-1.5 text-[13px] font-medium text-white"
                  : "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] text-[#374151]"
              }
            >
              Neue Antworten
              {newReplies > 0 ? (
                <span className="rounded-full bg-[#16A34A] px-1.5 text-[10.5px] font-semibold text-white">
                  {newReplies}
                </span>
              ) : null}
            </button>
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
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* Conversation list */}
        <aside className="flex max-h-[72vh] flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          <div className="space-y-2 border-b border-[#EEF0F3] p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen (Name, Nummer, Vertriebler)…"
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#111827]"
            />
            <div className="flex flex-wrap gap-1.5">
              <BucketChip
                active={bucket === "alle"}
                label="Alle"
                count={data.totalConversations}
                onClick={() => setBucket("alle")}
              />
              {BUCKET_ORDER.map((b) => (
                <BucketChip
                  key={b}
                  active={bucket === b}
                  label={EMPLOYMENT_BUCKET_LABEL[b]}
                  count={data.bucketCounts[b]}
                  onClick={() => setBucket(b)}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <select
                value={numberFilter}
                onChange={(e) => setNumberFilter(e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-[13px] outline-none focus:border-[#111827]"
              >
                <option value="">Alle Nummern</option>
                {data.numbers.map((n) => (
                  <option key={n.phoneNumberId} value={n.phoneNumberId}>
                    {n.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setUnreadOnly((v) => !v)}
                className={
                  unreadOnly
                    ? "shrink-0 rounded-lg bg-[#111827] px-3 py-1.5 text-[13px] font-medium text-white"
                    : "shrink-0 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-[13px] text-[#374151]"
                }
              >
                Ungelesen
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-[#EEF0F3] bg-[#FAFAFA] px-3 py-1.5 text-[11.5px] text-[#6B7280]">
            <span>
              {filtered.length === data.totalConversations
                ? `Alle ${data.totalConversations} Chats`
                : `${filtered.length} von ${data.totalConversations} Chats`}
            </span>
            {tab === "alle" &&
            bucket === "alle" &&
            !numberFilter &&
            !unreadOnly &&
            !search.trim() ? (
              <span className="font-medium text-[#15803D]">vollständig</span>
            ) : (
              <span className="text-[#9CA3AF]">gefiltert</span>
            )}
          </div>

          <ul className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[#6B7280]">
                Keine Konversationen.
              </li>
            ) : (
              filtered.map((c) => (
                <ConversationRow
                  key={c.leadId}
                  convo={c}
                  active={c.leadId === selectedId}
                  onSelect={() => setSelectedId(c.leadId)}
                />
              ))
            )}
          </ul>
        </aside>

        {/* Thread */}
        <section className="flex max-h-[72vh] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
          {selected ? (
            <Thread
              convo={selected}
              draft={draft}
              setDraft={setDraft}
              onSend={handleSend}
              onResolve={handleResolve}
              onSelfCheck={handleSelfCheck}
              pending={pending}
              error={error}
              notice={notice}
              live={data.whatsappLive}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-[#6B7280]">
              Wähle links eine Konversation.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BucketChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition " +
        (active
          ? "bg-[#111827] text-white"
          : "border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]")
      }
    >
      {label}
      <span
        className={
          "rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums " +
          (active ? "bg-white/20 text-white" : "bg-[#F3F4F6] text-[#6B7280]")
        }
      >
        {count}
      </span>
    </button>
  );
}
