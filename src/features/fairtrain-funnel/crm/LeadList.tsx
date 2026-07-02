"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { deleteLead } from "@/server/actions/deleteLead";
import {
  type EnrichedLeadSummary,
  type LeadFilters,
  LeadStatus,
} from "../types";
import { BatchFirstContactModal, type BatchLead } from "./BatchFirstContactModal";
import { humanizeSource, STATUS_TONE } from "./leadLabels";
import { LeadFormModal, type LeadEditValues } from "./LeadFormModal";
import { LeadListCard } from "./LeadListCard";
import type { SortKey } from "./LeadListRow";

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
  HOT: "Hot",
  WARM: "Warm",
  COLD: "Kalt",
  BLOCKED: "Blockiert",
  BERLIN: "Berlin",
  SAALFELD: "Saalfeld",
  UNDECIDED: "Noch offen",
  UNEMPLOYED: "Arbeitssuchend",
  EMPLOYED: "Berufstätig",
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
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<LeadEditValues | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

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
        const hay = [l.firstName, l.lastName, l.email, l.phone, l.city ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, ownerFilter, sourceFilter]);

  const sortedRows = useMemo(
    () => sortRows(filteredRows, sortKey),
    [filteredRows, sortKey],
  );

  const batchLeads: BatchLead[] = useMemo(
    () =>
      sortedRows.map((e) => ({
        id: e.lead.id,
        name: `${e.lead.firstName} ${e.lead.lastName}`.trim(),
        email: e.lead.email,
      })),
    [sortedRows],
  );

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
  const activeFilters =
    Boolean(filters.status) ||
    Boolean(filters.priority) ||
    Boolean(filters.preferredLocation) ||
    Boolean(filters.funnelPath) ||
    filters.slaBreachedOnly === true;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
            Bewerber · Operations
          </p>
          <h1 className="mt-1 font-display text-[28px] font-bold tracking-tight text-navy-950">
            Leads
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatPill label={`${sortedRows.length} aktiv`} />
            {overdue > 0 ? (
              <StatPill label={`${overdue} überfällig`} tone="red" />
            ) : null}
            {hot > 0 ? <StatPill label={`${hot} HOT`} tone="green" /> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-[13px] font-medium text-ink shadow-sm transition hover:border-ink/20"
            aria-label="Sortieren"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink/10 bg-white px-4 text-[13px] font-semibold text-ink-soft shadow-sm transition hover:border-ink/20 hover:text-ink"
            onClick={() => setBatchOpen(true)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M4 4h16v16H4z" />
              <path d="m4 6 8 6 8-6" />
            </svg>
            Erstkontakt (Batch)
          </button>
          <button type="button" className="btn-primary h-10 px-4" onClick={() => setCreating(true)}>
            + Neuer Lead
          </button>
        </div>
      </header>

      {/* Search + quick filters */}
      <section className="rounded-2xl border border-ink/[0.07] bg-white/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/70">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">
          <div>
            <label className="sr-only" htmlFor="lead-search">
              Suche
            </label>
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                id="lead-search"
                type="search"
                className="input h-10 w-full pl-10"
                placeholder="Name, Telefon, E-Mail oder Stadt…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <FilterSelect
            id="owner-filter"
            label="Bearbeiter"
            value={ownerFilter}
            onChange={setOwnerFilter}
            options={[
              { value: "", label: "Alle Bearbeiter" },
              ...users.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
          <FilterSelect
            id="source-filter"
            label="Quelle"
            value={sourceFilter}
            onChange={setSourceFilter}
            options={[
              { value: "", label: "Alle Quellen" },
              ...sourceOptions.map(([value, label]) => ({ value, label })),
            ]}
          />
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={[
              "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-[13px] font-semibold transition",
              filtersOpen || activeFilters
                ? "border-brand-200 bg-brand-50 text-brand-800"
                : "border-ink/10 bg-white text-ink-soft hover:border-ink/20",
            ].join(" ")}
          >
            Filter
            {activeFilters ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                !
              </span>
            ) : null}
          </button>
        </div>

        {filtersOpen ? (
          <form className="mt-4 grid gap-3 border-t border-ink/[0.06] pt-4 sm:grid-cols-2 lg:grid-cols-5">
            <Select
              name="status"
              label="Status"
              value={asString(filters.status)}
              options={STATUS_OPTIONS}
            />
            <Select
              name="priority"
              label="Priorität"
              value={filters.priority}
              options={PRIORITY_OPTIONS}
            />
            <Select
              name="preferredLocation"
              label="Standort"
              value={filters.preferredLocation}
              options={LOCATION_OPTIONS}
            />
            <Select
              name="funnelPath"
              label="Funnel"
              value={filters.funnelPath}
              options={FUNNEL_OPTIONS}
            />
            <div className="flex items-end gap-2">
              <label className="flex flex-1 items-center gap-2 rounded-xl border border-ink/10 bg-surface-subtle px-3 py-2.5 text-[13px] text-ink-soft">
                <input
                  type="checkbox"
                  name="slaBreachedOnly"
                  defaultChecked={filters.slaBreachedOnly === true}
                  value="1"
                  className="rounded border-ink/20"
                />
                Nur SLA-überschritten
              </label>
              <button type="submit" className="btn-primary h-10 shrink-0 px-4">
                Anwenden
              </button>
            </div>
          </form>
        ) : null}
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {/* Card list */}
      <div className="space-y-3">
        {sortedRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/15 bg-white px-6 py-16 text-center shadow-sm">
            <p className="text-[15px] font-semibold text-navy-950">Keine Leads gefunden</p>
            <p className="mt-1 text-[13px] text-ink-muted">
              Passe Suche und Filter an oder lege einen neuen Lead an.
            </p>
            <button type="button" className="btn-primary mt-5" onClick={() => setCreating(true)}>
              + Neuer Lead
            </button>
          </div>
        ) : (
          sortedRows.map((entry) => (
            <LeadListCard
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

      <BatchFirstContactModal
        open={batchOpen}
        leads={batchLeads}
        onClose={() => setBatchOpen(false)}
      />
    </div>
  );
}

function StatPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "red" | "green";
}) {
  const styles = {
    neutral: "bg-surface-subtle text-ink-soft ring-ink/10",
    red: "bg-red-50 text-red-700 ring-red-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  }[tone];
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1",
        styles,
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="min-w-[140px]">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="input h-10 w-full text-[13px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

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
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} className="input h-10" defaultValue={value ?? ""}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o ? (OPTION_LABELS[o] ?? o) : "Alle"}
          </option>
        ))}
      </select>
    </div>
  );
}
