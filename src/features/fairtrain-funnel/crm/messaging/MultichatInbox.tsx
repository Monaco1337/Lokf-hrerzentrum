"use client";

/**
 * MultichatInbox — the reactivation work surface ("Arbeitszentrale").
 *
 * A 3-pane layout: filterable conversation list · message thread + reply ·
 * action panel with everything needed to fully handle an Alt-Lead. A live
 * reactivation-funnel overview sits on top. Premium dark High-End surface via
 * the remap-proof `.dash-*` layer (matching the Dashboard). Behaviour is
 * unchanged — only styling was elevated.
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
          <h1 className="text-[21px] font-bold tracking-tight text-white">
            Reaktivierung · Multichat
          </h1>
          <p className="mt-1 text-[13px] text-[#9aa6a0]">
            {`${data.totalConversations} Chats · zentrale Arbeitsoberfläche`}
            {totalUnread > 0 ? ` · ${totalUnread} ungelesen` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full bg-white/[0.05] p-0.5 ring-1 ring-inset ring-white/[0.08]">
            <button
              type="button"
              onClick={() => setTab("alle")}
              className={
                tab === "alle"
                  ? "dash-pill dash-pill--active rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
                  : "rounded-full px-3.5 py-1.5 text-[13px] font-medium text-[#9aa6a0] transition hover:text-white"
              }
            >
              Alle
            </button>
            <button
              type="button"
              onClick={() => setTab("neu")}
              className={
                tab === "neu"
                  ? "dash-pill dash-pill--active inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
                  : "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-[#9aa6a0] transition hover:text-white"
              }
            >
              Neue Antworten
              {newReplies > 0 ? (
                <span className="rounded-full bg-black/20 px-1.5 text-[10.5px] font-semibold">
                  {newReplies}
                </span>
              ) : null}
            </button>
          </div>
          <span
            className={
              data.whatsappLive
                ? "rounded-full bg-emerald-500/15 px-3 py-1.5 text-[12px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/25"
                : "rounded-full bg-amber-500/15 px-3 py-1.5 text-[12px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-500/30"
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
        <aside className="dash-panel flex max-h-[74vh] flex-col overflow-hidden">
          <div className="space-y-2 border-b border-white/[0.06] p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen (Name, Nummer, Vertriebler)…"
              className="dash-field w-full px-3.5 py-2.5 text-sm"
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
                  />
                ) : null,
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={numberFilter}
                onChange={(e) => setNumberFilter(e.target.value)}
                className="dash-field min-w-0 flex-1 px-2.5 py-2 text-[13px]"
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
                    ? "dash-pill dash-pill--active shrink-0 rounded-xl px-3 py-2 text-[13px] font-semibold"
                    : "dash-soft shrink-0 rounded-xl px-3 py-2 text-[13px] font-medium"
                }
              >
                Ungelesen
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11.5px] text-[#7f8a83]">
            <span>
              {filtered.length === data.totalConversations
                ? `Alle ${data.totalConversations} Chats`
                : `${filtered.length} von ${data.totalConversations} Chats`}
            </span>
            <span className={noFilters ? "font-medium text-emerald-300" : "text-[#6b776f]"}>
              {noFilters ? "vollständig" : "gefiltert"}
            </span>
          </div>

          <ul className="flex-1 divide-y divide-white/[0.05] overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-[#7f8a83]">
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
        <section className="dash-panel flex max-h-[74vh] min-h-[440px] flex-col overflow-hidden">
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
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-[#7f8a83]">
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
            <div className="dash-panel p-8 text-center text-sm text-[#7f8a83]">
              Aktionen erscheinen hier.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

const STAT_DASH: Record<string, string> = {
  slate: "",
  sky: "dash-t-cyan",
  emerald: "dash-t-emerald",
  amber: "dash-t-amber",
  violet: "dash-t-violet",
  blue: "dash-t-blue",
};

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof STAT_DASH;
}) {
  return (
    <div className={`dash-card ${STAT_DASH[tone]} px-3.5 py-3`}>
      <p className="dash-num text-[22px]">{value.toLocaleString("de-DE")}</p>
      <p className="mt-1 text-[11.5px] font-medium text-[#9aa6a0]">{label}</p>
    </div>
  );
}

function Chip({
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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold transition " +
        (active ? "dash-pill dash-pill--active" : "dash-pill")
      }
    >
      {label}
      <span className="dash-pill__n px-1.5 text-[10.5px] font-semibold tabular-nums">
        {count}
      </span>
    </button>
  );
}
