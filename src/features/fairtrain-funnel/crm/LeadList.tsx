"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { deleteLead } from "@/server/actions/deleteLead";
import {
  type EnrichedLeadSummary,
  type LeadFilters,
  LeadStatus,
} from "../types";
import { humanizeSource, STATUS_TONE } from "./leadLabels";
import { LeadFormModal, type LeadEditValues } from "./LeadFormModal";
import { LeadListRow, type SortKey } from "./LeadListRow";

interface LeadUser {
  id: string;
  name: string;
}

interface LeadListProps {
  leads: ReadonlyArray<EnrichedLeadSummary>;
  filters: LeadFilters;
  users: ReadonlyArray<LeadUser>;
}

const STATUS_OPTIONS: ReadonlyArray<string> = [
  "",
  ...(Object.values(LeadStatus) as string[]),
];
const PRIORITY_OPTIONS: ReadonlyArray<string> = ["", "HOT", "WARM", "COLD", "BLOCKED"];
const LOCATION_OPTIONS: ReadonlyArray<string> = ["", "BERLIN", "SAALFELD", "UNDECIDED"];
const FUNNEL_OPTIONS: ReadonlyArray<string> = ["", "UNEMPLOYED", "EMPLOYED"];

const OPTION_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(STATUS_TONE).map(([key, tone]) => [key, tone.label]),
  ),
  HOT: "Hot", WARM: "Warm", COLD: "Kalt", BLOCKED: "Blockiert",
  BERLIN: "Berlin", SAALFELD: "Saalfeld",
  UNDECIDED: "Noch offen", UNEMPLOYED: "Arbeitssuchend", EMPLOYED: "Berufstätig",
};

const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "score", label: "Lead Score" },
  { value: "urgency", label: "Dringlichkeit" },
  { value: "createdAt", label: "Eingang" },
  { value: "lastContact", label: "Letzter Kontakt" },
  { value: "nextAction", label: "Nächste Aktion" },
];

export function LeadList({ leads, filters, users }: LeadListProps) {
  const router = useRouter();
  const [rows, setRows] = useState<EnrichedLeadSummary[]>([...leads]);
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("score");

  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LeadEditValues | null>(null);

  const sourceOptions = useMemo(() => {
    const set = new Map<string, string>();
    for (const e of rows) {
      const raw = e.lead.source ?? "";
      if (raw) set.set(raw, humanizeSource(raw));
    }
    return [...set.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((e) => {
      const l = e.lead;
      if (ownerFilter && (l.assignedToId ?? "") !== ownerFilter) return false;
      if (sourceFilter && (l.source ?? "") !== sourceFilter) return false;
      if (q) {
        const hay = [
          l.firstName,
          l.lastName,
          l.email,
          l.phone,
          l.city ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, ownerFilter, sourceFilter]);

  const sortedRows = useMemo(() => sortRows(filteredRows, sortKey), [filteredRows, sortKey]);

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await deleteLead({ id });
      if (!res.ok) {
        setError("Löschen nicht möglich. Bitte erneut versuchen.");
        return;
      }
      setRows((r) => r.filter((x) => x.lead.id !== id));
      setConfirmId(null);
      router.refresh();
    });
  }

  const overdue = sortedRows.filter((e) => e.insights.urgency === "overdue").length;
  const hot = sortedRows.filter((e) => e.insights.score >= 90).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-navy-950">
            Leads
          </h1>
          <p className="text-sm text-ink-soft">
            {sortedRows.length} Treffer
            {overdue > 0 ? (
              <>
                <span className="mx-1.5 text-ink-muted">·</span>
                <span className="font-semibold text-red-700">{overdue} überfällig</span>
              </>
            ) : null}
            {hot > 0 ? (
              <>
                <span className="mx-1.5 text-ink-muted">·</span>
                <span className="font-semibold text-accent-700">{hot} HOT</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted sm:inline">
            Sortieren
          </label>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="input h-9 w-44 py-1 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn-primary h-9" onClick={() => setCreating(true)}>
            + Neuer Lead
          </button>
        </div>
      </header>

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className="label" htmlFor="lead-search">Suche</label>
          <input
            id="lead-search"
            type="search"
            className="input"
            placeholder="Name, Telefon, E-Mail oder Stadt…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="owner-filter">Bearbeiter</label>
          <select
            id="owner-filter"
            className="input"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
          >
            <option value="">Alle</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="source-filter">Quelle</label>
          <select
            id="source-filter"
            className="input"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="">Alle</option>
            {sourceOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <form className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Select name="status" label="Status" value={asString(filters.status)} options={STATUS_OPTIONS} />
        <Select name="priority" label="Priorität" value={filters.priority} options={PRIORITY_OPTIONS} />
        <Select name="preferredLocation" label="Standort" value={filters.preferredLocation} options={LOCATION_OPTIONS} />
        <Select name="funnelPath" label="Funnel" value={filters.funnelPath} options={FUNNEL_OPTIONS} />
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="slaBreachedOnly"
              defaultChecked={filters.slaBreachedOnly === true}
              value="1"
            />
            Nur SLA-überschritten
          </label>
          <button type="submit" className="btn-primary ml-auto">Filtern</button>
        </div>
      </form>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-premium ring-1 ring-ink/[0.02]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink/[0.07] bg-gradient-to-b from-surface-subtle to-white text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Lead</th>
                <th className="px-3 py-3.5 font-semibold">Score</th>
                <th className="px-3 py-3.5 font-semibold">Status</th>
                <th className="px-3 py-3.5 font-semibold">Priorität</th>
                <th className="px-3 py-3.5 font-semibold">Nächste Aktion</th>
                <th className="px-3 py-3.5 font-semibold">Letzter Kontakt</th>
                <th className="px-3 py-3.5 font-semibold">Fortschritt</th>
                <th className="px-3 py-3.5 font-semibold">Quick</th>
                <th className="px-3 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.06]">
              {sortedRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center" colSpan={9}>
                    <p className="text-sm font-medium text-ink">Keine Leads gefunden</p>
                    <p className="mt-1 text-[13px] text-ink-muted">
                      Passe Suche und Filter an oder lege einen neuen Lead an.
                    </p>
                    <button
                      type="button"
                      className="btn-primary mt-4"
                      onClick={() => setCreating(true)}
                    >
                      + Neuer Lead
                    </button>
                  </td>
                </tr>
              ) : (
                sortedRows.map((entry) => (
                  <LeadListRow
                    key={entry.lead.id}
                    entry={entry}
                    confirming={confirmId === entry.lead.id}
                    pending={pending}
                    users={users}
                    onAsk={() => setConfirmId(entry.lead.id)}
                    onCancel={() => setConfirmId(null)}
                    onConfirm={() => remove(entry.lead.id)}
                    onEdit={() =>
                      setEditing({
                        id: entry.lead.id,
                        firstName: entry.lead.firstName,
                        lastName: entry.lead.lastName,
                        email: entry.lead.email,
                        phone: entry.lead.phone,
                        city: entry.lead.city,
                        source: entry.lead.source,
                      })
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <LeadFormModal
        open={creating}
        mode="create"
        users={users}
        onClose={() => setCreating(false)}
      />
      <LeadFormModal
        key={editing?.id ?? "edit"}
        open={editing !== null}
        mode="edit"
        users={users}
        initial={editing ?? undefined}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

function asString(v: LeadFilters["status"]): string | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.length === 1 ? v[0] : undefined;
  return v as string;
}

const URGENCY_RANK: Record<EnrichedLeadSummary["insights"]["urgency"], number> = {
  overdue: 0,
  today: 1,
  soon: 2,
  normal: 3,
};

function sortRows(
  rows: ReadonlyArray<EnrichedLeadSummary>,
  key: SortKey,
): EnrichedLeadSummary[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (key) {
      case "score":
        return b.insights.score - a.insights.score;
      case "urgency": {
        const u = URGENCY_RANK[a.insights.urgency] - URGENCY_RANK[b.insights.urgency];
        if (u !== 0) return u;
        return b.insights.score - a.insights.score;
      }
      case "createdAt":
        return b.lead.createdAt.getTime() - a.lead.createdAt.getTime();
      case "lastContact": {
        const aT = a.insights.lastContactAt?.getTime() ?? 0;
        const bT = b.insights.lastContactAt?.getTime() ?? 0;
        return bT - aT;
      }
      case "nextAction": {
        // Soonest scheduled action first; leads without a date sort last.
        const aT = a.lead.nextFollowUpAt?.getTime() ?? Number.POSITIVE_INFINITY;
        const bT = b.lead.nextFollowUpAt?.getTime() ?? Number.POSITIVE_INFINITY;
        return aT - bT;
      }
    }
  });
  return copy;
}

function Select({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string | undefined;
  options: ReadonlyArray<string>;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select id={name} name={name} className="input" defaultValue={value ?? ""}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o ? (OPTION_LABELS[o] ?? o) : "Alle"}
          </option>
        ))}
      </select>
    </div>
  );
}
