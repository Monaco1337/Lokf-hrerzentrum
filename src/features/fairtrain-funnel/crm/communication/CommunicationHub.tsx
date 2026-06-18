"use client";
/**
 * CommunicationHub — the central message inbox for the communication center.
 *
 * Shows every ledger message grouped into per-lead conversations with channel
 * filters, status chips, failed-message highlighting and a link into the
 * Bewerberakte. Read-only; sending/simulating happens in the Lead Detail.
 */
import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";

import {
  COMMUNICATION_CHANNEL_LABEL,
  MESSAGE_SENT_BY_LABEL,
  MESSAGE_STATUS_LABEL,
  type MessageSentByT,
  type MessageStatusT,
} from "@/features/fairtrain-funnel/types";

export interface HubStatusChange {
  status: MessageStatusT;
  at: string;
}

export interface HubMessage {
  id: string;
  leadId: string;
  leadName: string;
  channel: string;
  direction: "IN" | "OUT";
  type: string;
  status: MessageStatusT;
  sentBy: MessageSentByT;
  body: string;
  templateName: string | null;
  isDemo: boolean;
  failedReason: string | null;
  createdAt: string;
}

type FilterKey =
  | "all"
  | "WHATSAPP"
  | "EMAIL"
  | "INTERNAL"
  | "inbound"
  | "outbound"
  | "failed"
  | "unread"
  | "demo";

const FILTERS: ReadonlyArray<{ key: FilterKey; label: string }> = [
  { key: "all", label: "Alle" },
  { key: "WHATSAPP", label: "WhatsApp" },
  { key: "EMAIL", label: "E-Mail" },
  { key: "INTERNAL", label: "Intern" },
  { key: "inbound", label: "Eingehend" },
  { key: "outbound", label: "Ausgehend" },
  { key: "failed", label: "Fehlgeschlagen" },
  { key: "unread", label: "Ungelesen" },
  { key: "demo", label: "Demo" },
];

const DT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function matches(m: HubMessage, f: FilterKey): boolean {
  switch (f) {
    case "all":
      return true;
    case "WHATSAPP":
    case "EMAIL":
    case "INTERNAL":
      return m.channel === f;
    case "inbound":
      return m.direction === "IN";
    case "outbound":
      return m.direction === "OUT";
    case "failed":
      return m.status === "FAILED";
    case "unread":
      return m.direction === "IN" && m.status !== "READ";
    case "demo":
      return m.isDemo;
  }
}

function statusTone(status: MessageStatusT): string {
  switch (status) {
    case "READ":
    case "DELIVERED":
      return "bg-emerald-500/15 text-emerald-300";
    case "SENT":
    case "QUEUED":
      return "bg-blue-500/15 text-blue-300";
    case "FAILED":
      return "bg-red-500/15 text-red-300";
    default:
      return "bg-white/[0.08] text-zinc-300";
  }
}

interface Conversation {
  leadId: string;
  leadName: string;
  messages: HubMessage[];
  last: HubMessage;
  failedCount: number;
  unreadCount: number;
}

export function CommunicationHub({ messages }: { messages: HubMessage[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = {} as Record<FilterKey, number>;
    for (const f of FILTERS) c[f.key] = messages.filter((m) => matches(m, f.key)).length;
    return c;
  }, [messages]);

  const conversations = useMemo<Conversation[]>(() => {
    const filtered = messages.filter((m) => matches(m, filter));
    const byLead = new Map<string, HubMessage[]>();
    for (const m of filtered) {
      const arr = byLead.get(m.leadId) ?? [];
      arr.push(m);
      byLead.set(m.leadId, arr);
    }
    const list: Conversation[] = [];
    for (const [leadId, msgs] of byLead) {
      msgs.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
      const first = msgs[0];
      if (!first) continue;
      list.push({
        leadId,
        leadName: first.leadName,
        messages: msgs,
        last: first,
        failedCount: msgs.filter((m) => m.status === "FAILED").length,
        unreadCount: msgs.filter((m) => m.direction === "IN" && m.status !== "READ").length,
      });
    }
    list.sort((a, b) => +new Date(b.last.createdAt) - +new Date(a.last.createdAt));
    return list;
  }, [messages, filter]);

  return (
    <section className="rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="ops-eyebrow">Posteingang</p>
          <p className="text-[12.5px] text-zinc-400">
            Alle Konversationen nach Bewerber gruppiert · simulierte Demo-Schicht
          </p>
        </div>
      </header>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition ${
              filter === f.key
                ? "bg-white text-[#0d0d0f]"
                : "border border-white/[0.08] text-zinc-400 hover:text-white"
            }`}
          >
            {f.label}
            <span
              className={`tabular-nums ${filter === f.key ? "text-[#0d0d0f]/60" : "text-zinc-600"}`}
            >
              {counts[f.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {conversations.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-zinc-500">
          Keine Nachrichten für diesen Filter.
        </p>
      ) : (
        <ul className="space-y-2">
          {conversations.map((conv) => {
            const isOpen = open === conv.leadId;
            return (
              <li
                key={conv.leadId}
                className={`rounded-xl border bg-[#0a0a0c] transition ${
                  conv.failedCount > 0
                    ? "border-red-500/25"
                    : "border-white/[0.06]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : conv.leadId)}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
                >
                  <DirectionBadge direction={conv.last.direction} />
                  <span className="inline-flex shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[9.5px] uppercase tracking-wider text-zinc-300">
                    {COMMUNICATION_CHANNEL_LABEL[
                      conv.last.channel as keyof typeof COMMUNICATION_CHANNEL_LABEL
                    ] ?? conv.last.channel}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[12.5px] font-semibold text-white">
                        {conv.leadName}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500/20 px-1 text-[9.5px] font-bold text-emerald-300">
                          {conv.unreadCount}
                        </span>
                      )}
                      {conv.failedCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-red-500/15 px-1.5 text-[9.5px] font-bold text-red-300">
                          {conv.failedCount} fehlgeschl.
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-zinc-500">
                      {conv.last.body.slice(0, 120)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-semibold ${statusTone(conv.last.status)}`}
                    >
                      {MESSAGE_STATUS_LABEL[conv.last.status]}
                    </span>
                    <span className="text-[10px] tabular-nums text-zinc-600">
                      {DT.format(new Date(conv.last.createdAt))}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-white/[0.06] px-3.5 py-3">
                    <ol className="space-y-1.5">
                      {[...conv.messages]
                        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
                        .map((m) => (
                          <li
                            key={m.id}
                            className={`flex gap-2 rounded-lg px-2.5 py-1.5 ${
                              m.direction === "IN"
                                ? "bg-white/[0.03]"
                                : "bg-blue-500/[0.06]"
                            }`}
                          >
                            <DirectionBadge direction={m.direction} small />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11.5px] text-zinc-200">{m.body}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9.5px] text-zinc-500">
                                <span
                                  className={`rounded px-1 py-0.5 font-semibold ${statusTone(m.status)}`}
                                >
                                  {MESSAGE_STATUS_LABEL[m.status]}
                                </span>
                                {m.templateName && (
                                  <span className="rounded bg-white/[0.06] px-1 py-0.5 text-zinc-300">
                                    {m.templateName}
                                  </span>
                                )}
                                <span
                                  className={`rounded px-1 py-0.5 font-semibold ${
                                    m.isDemo
                                      ? "bg-amber-500/15 text-amber-300"
                                      : "bg-emerald-500/15 text-emerald-300"
                                  }`}
                                >
                                  {m.isDemo ? "Demo" : "Echt"}
                                </span>
                                <span>· {MESSAGE_SENT_BY_LABEL[m.sentBy]}</span>
                                <span>· {DT.format(new Date(m.createdAt))}</span>
                                {m.failedReason && (
                                  <span className="text-red-300">· {m.failedReason}</span>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                    </ol>
                    <Link
                      href={`/crm/leads/${conv.leadId}` as Route}
                      className="mt-2.5 inline-block ops-eyebrow text-orange-300 hover:text-orange-200"
                    >
                      Zur Bewerberakte →
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function DirectionBadge({
  direction,
  small,
}: {
  direction: "IN" | "OUT";
  small?: boolean;
}) {
  const size = small ? "h-5 w-9 text-[8.5px]" : "h-6 w-12 text-[9.5px]";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-md font-bold tracking-wider ${size} ${
        direction === "IN"
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-blue-500/15 text-blue-300"
      }`}
    >
      {direction === "IN" ? "EIN" : "AUS"}
    </span>
  );
}
