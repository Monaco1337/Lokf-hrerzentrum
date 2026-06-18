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

const GLASS_SURFACE =
  "rounded-2xl border border-ink/[0.07] bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/70";

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
      return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    case "SENT":
    case "QUEUED":
      return "bg-blue-50 text-blue-700 ring-blue-100";
    case "FAILED":
      return "bg-red-50 text-red-700 ring-red-100";
    default:
      return "bg-surface-subtle text-ink-muted ring-ink/10";
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
    <section className={`${GLASS_SURFACE} p-4 sm:p-5`}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            Posteingang
          </p>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            Alle Konversationen nach Bewerber gruppiert · simulierte Demo-Schicht
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-surface-subtle/80 px-2.5 py-1 text-[12px] font-semibold tabular-nums text-ink-soft ring-1 ring-ink/10">
          {conversations.length} Threads
        </span>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition",
              filter === f.key
                ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200"
                : "border border-ink/10 bg-white/70 text-ink-soft hover:border-ink/20 hover:bg-white hover:text-ink",
            ].join(" ")}
          >
            {f.label}
            <span
              className={[
                "tabular-nums",
                filter === f.key ? "text-brand-600/70" : "text-ink-muted",
              ].join(" ")}
            >
              {counts[f.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink/15 bg-surface-subtle/40 px-6 py-10 text-center">
          <p className="text-[13px] font-semibold text-navy-950">Keine Nachrichten</p>
          <p className="mt-1 text-[12px] text-ink-muted">
            Für diesen Filter liegen keine Einträge vor.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {conversations.map((conv) => {
            const isOpen = open === conv.leadId;
            const initials = conv.leadName
              .split(/\s+/)
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();

            return (
              <li
                key={conv.leadId}
                className={[
                  "overflow-hidden rounded-2xl border transition-all duration-200",
                  conv.failedCount > 0
                    ? "border-red-200/80 bg-red-50/20"
                    : "border-ink/[0.07] bg-white/60 hover:border-ink/15 hover:bg-white/90 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)]",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : conv.leadId)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:gap-4"
                >
                  <span
                    aria-hidden
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-white via-white to-surface-subtle text-[12px] font-bold tracking-tight text-navy-950 ring-1 ring-inset ring-ink/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.06)]"
                  >
                    {initials || "?"}
                  </span>
                  <DirectionBadge direction={conv.last.direction} />
                  <span className="inline-flex shrink-0 rounded-full bg-surface-subtle/80 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-ink-soft ring-1 ring-ink/10">
                    {COMMUNICATION_CHANNEL_LABEL[
                      conv.last.channel as keyof typeof COMMUNICATION_CHANNEL_LABEL
                    ] ?? conv.last.channel}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[13.5px] font-bold tracking-tight text-navy-950">
                        {conv.leadName}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-50 px-1.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                          {conv.unreadCount}
                        </span>
                      )}
                      {conv.failedCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[9.5px] font-bold text-red-700 ring-1 ring-red-100">
                          {conv.failedCount} fehlgeschl.
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                      {conv.last.body.slice(0, 120)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${statusTone(conv.last.status)}`}
                    >
                      {MESSAGE_STATUS_LABEL[conv.last.status]}
                    </span>
                    <span className="text-[10.5px] tabular-nums text-ink-muted">
                      {DT.format(new Date(conv.last.createdAt))}
                    </span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-ink/[0.06] bg-white/50 px-4 py-3.5 backdrop-blur-sm">
                    <ol className="space-y-2">
                      {[...conv.messages]
                        .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
                        .map((m) => (
                          <li
                            key={m.id}
                            className={[
                              "flex gap-2.5 rounded-xl border px-3 py-2.5",
                              m.direction === "IN"
                                ? "border-emerald-100/80 bg-emerald-50/40"
                                : "border-blue-100/80 bg-blue-50/30",
                            ].join(" ")}
                          >
                            <DirectionBadge direction={m.direction} small />
                            <div className="min-w-0 flex-1">
                              <p className="text-[12.5px] leading-relaxed text-ink">
                                {m.body}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-ink-muted">
                                <span
                                  className={`inline-flex rounded-full px-1.5 py-0.5 font-semibold ring-1 ring-inset ${statusTone(m.status)}`}
                                >
                                  {MESSAGE_STATUS_LABEL[m.status]}
                                </span>
                                {m.templateName && (
                                  <span className="rounded-full bg-surface-subtle px-1.5 py-0.5 font-medium text-ink-soft ring-1 ring-ink/10">
                                    {m.templateName}
                                  </span>
                                )}
                                <span
                                  className={`inline-flex rounded-full px-1.5 py-0.5 font-semibold ring-1 ring-inset ${
                                    m.isDemo
                                      ? "bg-amber-50 text-amber-800 ring-amber-100"
                                      : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                  }`}
                                >
                                  {m.isDemo ? "Demo" : "Echt"}
                                </span>
                                <span>· {MESSAGE_SENT_BY_LABEL[m.sentBy]}</span>
                                <span>· {DT.format(new Date(m.createdAt))}</span>
                                {m.failedReason && (
                                  <span className="font-medium text-red-600">
                                    · {m.failedReason}
                                  </span>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                    </ol>
                    <Link
                      href={`/crm/leads/${conv.leadId}` as Route}
                      className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-bold uppercase tracking-[0.1em] text-brand-700 transition hover:text-brand-800"
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
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-lg font-bold tracking-wider ring-1 ring-inset",
        size,
        direction === "IN"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-blue-50 text-blue-700 ring-blue-100",
      ].join(" ")}
    >
      {direction === "IN" ? "EIN" : "AUS"}
    </span>
  );
}
