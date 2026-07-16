"use client";

/**
 * MultichatInbox — the reactivation work surface ("Arbeitszentrale").
 *
 * A 3-pane layout: filterable conversation list · message thread + reply ·
 * action panel with everything needed to fully handle an Alt-Lead. A live
 * reactivation-funnel overview sits on top. Apple-style: light, glassy,
 * rounded, soft shadows, green accents — no dark surfaces.
 */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  EMPLOYMENT_BUCKET_LABEL,
  type EmploymentBucket,
  type MultichatData,
  WORK_STATUS_LABEL,
  type WorkStatus,
} from "@/features/fairtrain-funnel/messaging/types";
import { sendWhatsAppText } from "@/server/actions/messaging";

import { MultichatActionPanel } from "./MultichatActionPanel";
import { ConversationRow, Thread } from "./MultichatThread";

type Tab = "alle" | "neu";
type BucketFilter = "alle" | EmploymentBucket;
type WorkFilter = "alle" | WorkStatus;

const BUCKET_ORDER: EmploymentBucket[] = ["job_seeking", "employed", "other"];
const WORK_ORDER: WorkStatus[] = [
  "new_reply",
  "callback",
  "waiting",
  "followup",
  "open",
  "no_interest",
  "done",
];

export function MultichatInbox({ data }: { data: MultichatData }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("alle");
  const [bucket, setBucket] = useState<BucketFilter>("alle");
  const [workFilter, setWorkFilter] = useState<WorkFilter>("alle");
  const [search, setSearch] = useState("");
  const [numberFilter, setNumberFilter] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    data.conversations[0]?.leadId ?? null,
  );
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.conversations.filter((c) => {
      if (tab === "neu" && !c.hasNewReply) return false;
      if (bucket !== "alle" && c.employmentBucket !== bucket) return false;
      if (workFilter !== "alle" && c.workStatus !== workFilter) return false;
      if (numberFilter && c.businessPhoneNumberId !== numberFilter) return false;
      if (unreadOnly && c.unread === 0) return false;
      if (!q) return true;
      return (
        c.leadName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.assignedName ?? "").toLowerCase().includes(q)
      );
    });
  }, [data.conversations, tab, bucket, workFilter, search, numberFilter, unreadOnly]);

  const selected =
    data.conversations.find((c) => c.leadId === selectedId) ?? null;
  const totalUnread = data.conversations.reduce((s, c) => s + c.unread, 0);
  const newReplies = data.conversations.filter((c) => c.hasNewReply).length;
  const s = data.reactivationStats;

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

  const noFilters =
    tab === "alle" &&
    bucket === "alle" &&
    workFilter === "alle" &&
    !numberFilter &&
    !unreadOnly &&
    !search.trim();

  return (
    <div data-ops className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Reaktivierung · Multichat
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {`${data.totalConversations} Chats · zentrale Arbeitsoberfläche`}
            {totalUnread > 0 ? ` · ${totalUnread} ungelesen` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-black/5 bg-white/70 p-0.5 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => setTab("alle")}
              className={
                tab === "alle"
                  ? "rounded-full bg-emerald-500 px-3.5 py-1.5 text-[13px] font-semibold text-white"
                  : "rounded-full px-3.5 py-1.5 text-[13px] text-slate-600"
              }
            >
              Alle
            </button>
            <button
              type="button"
              onClick={() => setTab("neu")}
              className={
                tab === "neu"
                  ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-1.5 text-[13px] font-semibold text-white"
                  : "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] text-slate-600"
              }
            >
              Neue Antworten
              {newReplies > 0 ? (
                <span className="rounded-full bg-white/25 px-1.5 text-[10.5px] font-semibold">
                  {newReplies}
                </span>
              ) : null}
            </button>
          </div>
          <span
            className={
              data.whatsappLive
                ? "rounded-full bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"
                : "rounded-full bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200"
            }
          >
            {data.whatsappLive ? "Live" : "Simulation"}
          </span>
        </div>
      </header>

      {/* Live reactivation overview */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
        <StatCard label="Importiert" value={s.imported} tone="slate" />
        <StatCard label="Kontaktiert" value={s.contacted} tone="sky" />
        <StatCard label="Antworten" value={s.replied} tone="emerald" />
        <StatCard label="Ungelesen" value={s.unread} tone="amber" />
        <StatCard label="Wartet Rückruf" value={s.waitingCallback} tone="violet" />
        <StatCard label="Eignungscheck" value={s.eligibilityStarted} tone="blue" />
        <StatCard
          label="Bewerbungen"
          value={s.applicationsCompleted}
          tone="emerald"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr_330px]">
        {/* Conversation list */}
        <aside className="flex max-h-[74vh] flex-col overflow-hidden rounded-3xl border border-black/5 bg-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl">
          <div className="space-y-2 border-b border-black/5 p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen (Name, Nummer, Vertriebler)…"
              className="w-full rounded-2xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
            <div className="flex flex-wrap gap-1.5">
              <Chip
                active={bucket === "alle" && workFilter === "alle"}
                label="Alle"
                count={data.totalConversations}
                onClick={() => {
                  setBucket("alle");
                  setWorkFilter("alle");
                }}
              />
              {BUCKET_ORDER.map((b) => (
                <Chip
                  key={b}
                  active={bucket === b}
                  label={EMPLOYMENT_BUCKET_LABEL[b]}
                  count={data.bucketCounts[b]}
                  onClick={() => setBucket(bucket === b ? "alle" : b)}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {WORK_ORDER.map((w) =>
                data.workStatusCounts[w] > 0 || workFilter === w ? (
                  <Chip
                    key={w}
                    active={workFilter === w}
                    label={WORK_STATUS_LABEL[w]}
                    count={data.workStatusCounts[w]}
                    onClick={() => setWorkFilter(workFilter === w ? "alle" : w)}
                    tone="emerald"
                  />
                ) : null,
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={numberFilter}
                onChange={(e) => setNumberFilter(e.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none focus:border-emerald-400"
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
                    ? "shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-[13px] font-semibold text-white"
                    : "shrink-0 rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-[13px] text-slate-700"
                }
              >
                Ungelesen
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-black/5 bg-slate-50/60 px-3 py-1.5 text-[11.5px] text-slate-500">
            <span>
              {filtered.length === data.totalConversations
                ? `Alle ${data.totalConversations} Chats`
                : `${filtered.length} von ${data.totalConversations} Chats`}
            </span>
            <span className={noFilters ? "font-medium text-emerald-600" : "text-slate-400"}>
              {noFilters ? "vollständig" : "gefiltert"}
            </span>
          </div>

          <ul className="flex-1 divide-y divide-black/5 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-slate-400">
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
        <section className="flex max-h-[74vh] min-h-[440px] flex-col overflow-hidden rounded-3xl border border-black/5 bg-white/70 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl">
          {selected ? (
            <Thread
              convo={selected}
              draft={draft}
              setDraft={setDraft}
              onSend={handleSend}
              pending={pending}
              error={error}
              notice={null}
              live={data.whatsappLive}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-400">
              Wähle links eine Konversation.
            </div>
          )}
        </section>

        {/* Action panel */}
        <aside className="xl:max-h-[74vh]">
          {selected ? (
            <MultichatActionPanel
              key={selected.leadId}
              convo={selected}
              templates={data.templates}
            />
          ) : (
            <div className="rounded-3xl border border-black/5 bg-white/70 p-8 text-center text-sm text-slate-400 shadow-sm">
              Aktionen erscheinen hier.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

const STAT_TONE: Record<string, string> = {
  slate: "text-slate-700",
  sky: "text-sky-700",
  emerald: "text-emerald-700",
  amber: "text-amber-700",
  violet: "text-violet-700",
  blue: "text-blue-700",
};

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof STAT_TONE;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/70 px-3.5 py-3 shadow-sm backdrop-blur">
      <p className={`text-2xl font-semibold tabular-nums ${STAT_TONE[tone]}`}>
        {value.toLocaleString("de-DE")}
      </p>
      <p className="mt-0.5 text-[11.5px] font-medium text-slate-500">{label}</p>
    </div>
  );
}

function Chip({
  active,
  label,
  count,
  onClick,
  tone = "slate",
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  tone?: "slate" | "emerald";
}) {
  const activeCls =
    tone === "emerald" ? "bg-emerald-500 text-white" : "bg-slate-900 text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium transition " +
        (active
          ? activeCls
          : "border border-black/10 bg-white/80 text-slate-600 hover:bg-white")
      }
    >
      {label}
      <span
        className={
          "rounded-full px-1.5 text-[10.5px] font-semibold tabular-nums " +
          (active ? "bg-white/25" : "bg-slate-100 text-slate-500")
        }
      >
        {count}
      </span>
    </button>
  );
}
