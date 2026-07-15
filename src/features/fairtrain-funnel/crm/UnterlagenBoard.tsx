"use client";
/**
 * UnterlagenBoard — the unified "Bewerberakte" control center.
 *
 * One place for every web-funnel applicant's documents: what the applicant
 * uploaded through the portal, what still needs a review decision, and what is
 * already approved. Each card deep-links into the lead's document reviewer
 * (`/crm/leads/{id}?tab=unterlagen`) so the full file preview + approve/reject
 * flow is exactly one click away.
 *
 * Light "ops" design; searchable + filterable premium cards.
 */
import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";

export type AkteDocStatus =
  | "MISSING"
  | "REQUESTED"
  | "UPLOADED"
  | "APPROVED"
  | "REJECTED";

export interface AkteDoc {
  label: string;
  status: AkteDocStatus;
  statusLabel: string;
}

export interface BewerberakteApplicant {
  id: string;
  name: string;
  isDemo: boolean;
  city: string;
  phaseLabel: string;
  createdAtLabel: string;
  /** Completion of the required documents, 0..100. */
  pct: number;
  uploadedCount: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  missingRequired: number;
}

type FilterKey = "all" | "review" | "complete" | "incomplete";

const STATUS_TONE: Record<AkteDocStatus, string> = {
  MISSING: "ops-chip ops-chip-slate",
  REQUESTED: "ops-chip ops-chip-amber",
  UPLOADED: "ops-chip ops-chip-blue",
  APPROVED: "ops-chip ops-chip-green",
  REJECTED: "ops-chip ops-chip-red",
};

export interface BewerberakteRow extends BewerberakteApplicant {
  docs: AkteDoc[];
}

export function UnterlagenBoard({
  applicants,
}: {
  applicants: ReadonlyArray<BewerberakteRow>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const totals = useMemo(() => {
    return applicants.reduce(
      (acc, a) => {
        acc.pendingReview += a.pendingReview;
        acc.approved += a.approved;
        acc.incomplete += a.missingRequired > 0 ? 1 : 0;
        return acc;
      },
      { pendingReview: 0, approved: 0, incomplete: 0 },
    );
  }, [applicants]);

  const counts = useMemo(
    () => ({
      all: applicants.length,
      review: applicants.filter((a) => a.pendingReview > 0).length,
      complete: applicants.filter((a) => a.missingRequired === 0).length,
      incomplete: applicants.filter((a) => a.missingRequired > 0).length,
    }),
    [applicants],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return applicants.filter((a) => {
      if (filter === "review" && a.pendingReview === 0) return false;
      if (filter === "complete" && a.missingRequired !== 0) return false;
      if (filter === "incomplete" && a.missingRequired === 0) return false;
      if (q) {
        const hay = `${a.name} ${a.city}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [applicants, query, filter]);

  return (
    <div className="space-y-5">
      <header className="space-y-4">
        <div>
          <p className="ops-eyebrow">Bewerberakten-Center</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight ops-text-primary sm:text-[28px]">
            Bewerberakte
          </h1>
          <p className="mt-1 max-w-2xl text-[13px] ops-text-muted">
            Alle Bewerber, die den Eignungscheck über unseren Funnel
            abgeschlossen haben – mit allen hochgeladenen Unterlagen. Klicke auf
            eine Akte, um die Dokumente zu sichten, freizugeben oder abzulehnen.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Bewerber" value={applicants.length} tone="neutral" />
          <StatTile label="Zu prüfen" value={totals.pendingReview} tone="amber" />
          <StatTile label="Freigegeben" value={totals.approved} tone="green" />
          <StatTile label="Unvollständig" value={totals.incomplete} tone="red" />
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-xs sm:flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ops-text-dim"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            className="ops-input h-10 w-full pl-9"
            placeholder="Bewerber oder Stadt suchen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label="Alle" count={counts.all} />
          <FilterPill active={filter === "review"} onClick={() => setFilter("review")} label="Zu prüfen" count={counts.review} tone="amber" />
          <FilterPill active={filter === "complete"} onClick={() => setFilter("complete")} label="Vollständig" count={counts.complete} tone="green" />
          <FilterPill active={filter === "incomplete"} onClick={() => setFilter("incomplete")} label="Unvollständig" count={counts.incomplete} tone="red" />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="ops-card p-12 text-center text-[13px] ops-text-muted">
          Keine Bewerber für diese Ansicht.
        </div>
      ) : (
        <ul className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((a) => (
            <li key={a.id}>
              <ApplicantCard applicant={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ApplicantCard({ applicant: a }: { applicant: BewerberakteRow }) {
  const tone = completionTone(a.pct);
  return (
    <Link
      href={`/crm/leads/${a.id}?tab=unterlagen` as Route}
      className="ops-card group flex h-full flex-col p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-16px_rgba(15,23,42,0.18)]"
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ring-1",
            tone.avatar,
          ].join(" ")}
        >
          {initials(a.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[14px] font-semibold ops-text-primary">
              {displayName(a.name)}
            </p>
            {a.isDemo ? (
              <span className="shrink-0 rounded-md bg-[#f3f4f6] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#6b7280]">
                Demo
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[11.5px] ops-text-muted">
            {a.city || "—"} · {a.phaseLabel}
          </p>
        </div>
        {a.pendingReview > 0 ? (
          <span className="shrink-0 rounded-full bg-[#eff6ff] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#1d4ed8] ring-1 ring-[#bfdbfe]">
            {a.pendingReview} neu
          </span>
        ) : (
          <span
            className={[
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ring-1",
              tone.badge,
            ].join(" ")}
          >
            {a.pct}%
          </span>
        )}
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#eef0f3]">
        <div
          className={["h-full rounded-full transition-all", tone.bar].join(" ")}
          style={{ width: `${Math.max(3, a.pct)}%` }}
        />
      </div>

      {a.docs.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {a.docs.map((d, i) => (
            <span key={i} className={STATUS_TONE[d.status]}>
              {d.label} · {d.statusLabel}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[11.5px] ops-text-dim">Noch keine Unterlagen hochgeladen.</p>
      )}

      <div className="mt-auto grid grid-cols-3 gap-1.5 pt-3.5 text-[11px] font-medium tabular-nums">
        <CountCell label="zu prüfen" value={a.pendingReview} tone={a.pendingReview > 0 ? "amber" : "muted"} />
        <CountCell label="freigegeben" value={a.approved} tone={a.approved > 0 ? "green" : "muted"} />
        <CountCell label="fehlt" value={a.missingRequired} tone={a.missingRequired > 0 ? "red" : "muted"} />
      </div>

      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0f766e] opacity-0 transition group-hover:opacity-100">
        Akte öffnen
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}

function CountCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "red" | "amber" | "green" | "muted";
}) {
  const styles = {
    red: "bg-[#fef2f2] text-[#991b1b]",
    amber: "bg-[#fffbeb] text-[#92400e]",
    green: "bg-[#ecfdf5] text-[#065f46]",
    muted: "bg-[#f6f7f9] text-[#9ca3af]",
  }[tone];
  return (
    <span className={["flex items-center justify-between rounded-lg px-2 py-1.5", styles].join(" ")}>
      <span>{label}</span>
      <span className="font-bold">{value}</span>
    </span>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "red" | "amber" | "green";
}) {
  const accent = {
    neutral: "text-[#111827]",
    red: "text-[#dc2626]",
    amber: "text-[#d97706]",
    green: "text-[#059669]",
  }[tone];
  return (
    <div className="ops-card px-4 py-3">
      <p className={["text-[24px] font-bold leading-none tabular-nums", accent].join(" ")}>
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] font-medium ops-text-muted">{label}</p>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  tone = "neutral",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  tone?: "neutral" | "red" | "amber" | "green";
}) {
  const dot = {
    neutral: "bg-[#9ca3af]",
    red: "bg-[#ef4444]",
    amber: "bg-[#f59e0b]",
    green: "bg-[#10b981]",
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition",
        active
          ? "border-[#111827] bg-[#111827] text-[#ffffff]"
          : "border-[#e5e7eb] bg-white text-[#374151] hover:border-[#d1d5db] hover:bg-[#f9fafb]",
      ].join(" ")}
    >
      {tone !== "neutral" ? (
        <span className={["h-1.5 w-1.5 rounded-full", active ? "bg-[#ffffff]/70" : dot].join(" ")} />
      ) : null}
      {label}
      <span
        className={[
          "rounded-full px-1.5 text-[10.5px] font-bold tabular-nums",
          active ? "bg-[#ffffff]/20 text-[#ffffff]" : "bg-[#f3f4f6] text-[#6b7280]",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function completionTone(pct: number): {
  bar: string;
  badge: string;
  avatar: string;
} {
  if (pct >= 100) {
    return {
      bar: "bg-gradient-to-r from-emerald-400 to-emerald-500",
      badge: "bg-[#ecfdf5] text-[#065f46] ring-[#a7f3d0]",
      avatar: "bg-[#ecfdf5] text-[#065f46] ring-[#a7f3d0]",
    };
  }
  if (pct >= 50) {
    return {
      bar: "bg-gradient-to-r from-amber-400 to-amber-500",
      badge: "bg-[#fffbeb] text-[#92400e] ring-[#fde68a]",
      avatar: "bg-[#fffbeb] text-[#92400e] ring-[#fde68a]",
    };
  }
  return {
    bar: "bg-gradient-to-r from-rose-400 to-red-500",
    badge: "bg-[#fef2f2] text-[#991b1b] ring-[#fecaca]",
    avatar: "bg-[#fef2f2] text-[#991b1b] ring-[#fecaca]",
  };
}

function displayName(name: string): string {
  return name.replace(/^\[DEMO\]\s*/i, "").trim() || name;
}

function initials(name: string): string {
  const clean = displayName(name);
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
