"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  type EnrichedLeadSummary,
  LeadStatus,
} from "../../types";
import { updateLeadStatus } from "@/server/actions/updateLeadStatus";

export interface PipelineColumn {
  id: LeadStatus;
  label: string;
  hint: string;
  tone: "blue" | "amber" | "orange" | "violet" | "emerald" | "red" | "slate";
}

/** 12 board columns — the exact list from the operations brief. */
export const PIPELINE_COLUMNS: ReadonlyArray<PipelineColumn> = [
  { id: LeadStatus.NEW, label: "Neue Anfrage", hint: "Frisch eingegangen", tone: "blue" },
  { id: LeadStatus.CONTACT_PENDING, label: "Nicht erreicht", hint: "Erstversuch ohne Erfolg", tone: "amber" },
  { id: LeadStatus.CALL_SCHEDULED, label: "Rückruf geplant", hint: "Termin steht", tone: "amber" },
  { id: LeadStatus.CONTACTED, label: "Erstgespräch", hint: "Erstkontakt erfolgt", tone: "blue" },
  { id: LeadStatus.QUALIFIED, label: "Qualifiziert", hint: "Interesse + Eignung", tone: "violet" },
  { id: LeadStatus.DOC_PENDING, label: "Unterlagen offen", hint: "Wartet auf Bewerber", tone: "orange" },
  { id: LeadStatus.AA_APPOINTMENT_PENDING, label: "Agenturtermin offen", hint: "Termin koordinieren", tone: "orange" },
  { id: LeadStatus.GUTSCHEIN_PENDING, label: "Gutschein beantragt", hint: "Wartet auf Agentur", tone: "amber" },
  { id: LeadStatus.GUTSCHEIN_APPROVED, label: "Gutschein erhalten", hint: "Förderung gesichert", tone: "emerald" },
  { id: LeadStatus.ENROLLED, label: "Anmeldung vorbereitet", hint: "Vertrag vorbereitet", tone: "emerald" },
  { id: LeadStatus.STARTED, label: "Angemeldet", hint: "Weiterbildung läuft", tone: "emerald" },
  { id: LeadStatus.LOST, label: "Verloren", hint: "Geschlossen ohne Erfolg", tone: "red" },
];

const TONE_DOT: Record<PipelineColumn["tone"], string> = {
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  red: "bg-red-500",
  slate: "bg-zinc-500",
};

const URGENCY_DOT = {
  overdue: "bg-red-500",
  today: "bg-orange-500",
  soon: "bg-amber-500",
  normal: "bg-zinc-600",
} as const;

interface PipelineBoardProps {
  leads: ReadonlyArray<EnrichedLeadSummary>;
}

/**
 * 12-column kanban with native HTML5 drag & drop. Moving a card optimistically
 * relocates it client-side and fires the server action; on failure the card
 * snaps back and a toast appears. No external DnD library — keeps the bundle
 * lean and zero-hydration cost on first paint.
 */
export function PipelineBoard({ leads }: PipelineBoardProps) {
  const [optimistic, setOptimistic] = useState<Record<string, LeadStatus>>({});
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<LeadStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effective = (e: EnrichedLeadSummary): LeadStatus =>
    optimistic[e.lead.id] ?? e.lead.status;

  const byColumn = new Map<LeadStatus, EnrichedLeadSummary[]>();
  for (const col of PIPELINE_COLUMNS) byColumn.set(col.id, []);
  for (const entry of leads) {
    const status = effective(entry);
    const bucket = byColumn.get(status);
    if (bucket) bucket.push(entry);
  }

  const moveTo = (leadId: string, to: LeadStatus) => {
    const entry = leads.find((l) => l.lead.id === leadId);
    if (!entry) return;
    const previous = effective(entry);
    if (previous === to) return;
    setOptimistic((m) => ({ ...m, [leadId]: to }));
    startTransition(async () => {
      const res = await updateLeadStatus({
        leadId,
        toStatus: to,
        reason: "Pipeline drag & drop",
      });
      if (!res.ok) {
        setOptimistic((m) => {
          const next = { ...m };
          delete next[leadId];
          return next;
        });
        setError(res.message ?? "Statuswechsel fehlgeschlagen");
        setTimeout(() => setError(null), 5000);
      }
    });
  };

  const totalActive = leads.length;
  const hot = leads.filter((l) => l.lead.priority === "HOT").length;
  const overdue = leads.filter((l) => l.insights.urgency === "overdue").length;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-eyebrow">Pipeline</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
            Kanban — {totalActive} Bewerber im Fluss
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="ops-chip ops-chip-orange">{hot} HOT</span>
          <span className="ops-chip ops-chip-red">{overdue} Überfällig</span>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-200">
          {error}
        </div>
      )}

      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3 px-1">
          {PIPELINE_COLUMNS.map((col) => {
            const cards = byColumn.get(col.id) ?? [];
            const isTarget = dropTarget === col.id;
            const value = cards.length;
            return (
              <div
                key={col.id}
                className={[
                  "w-[280px] shrink-0 rounded-xl border transition",
                  isTarget
                    ? "border-orange-500/50 bg-orange-500/[0.04]"
                    : "border-white/[0.06] bg-[#0d0d0f]",
                ].join(" ")}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  if (dropTarget !== col.id) setDropTarget(col.id);
                }}
                onDragLeave={() => {
                  if (dropTarget === col.id) setDropTarget(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging) moveTo(dragging, col.id);
                  setDragging(null);
                  setDropTarget(null);
                }}
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[col.tone]}`}
                    />
                    <span className="truncate text-[12px] font-semibold uppercase tracking-wider text-zinc-300">
                      {col.label}
                    </span>
                  </div>
                  <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-zinc-300">
                    {value}
                  </span>
                </div>
                <div className="flex max-h-[68vh] flex-col gap-2 overflow-y-auto p-2.5">
                  {cards.length === 0 && (
                    <p className="px-2 py-6 text-center text-[11px] text-zinc-600">
                      Leer
                    </p>
                  )}
                  {cards.map((entry) => (
                    <PipelineCard
                      key={entry.lead.id}
                      entry={entry}
                      onDragStart={() => setDragging(entry.lead.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropTarget(null);
                      }}
                      isDragging={dragging === entry.lead.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const RELATIVE_FMT = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });

function relativeFromNow(d: Date | null): string {
  if (!d) return "noch nie";
  const diffMs = d.getTime() - Date.now();
  const diffH = Math.round(diffMs / 3_600_000);
  if (Math.abs(diffH) < 24) return RELATIVE_FMT.format(diffH, "hour");
  const diffD = Math.round(diffH / 24);
  return RELATIVE_FMT.format(diffD, "day");
}

function PipelineCard({
  entry,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  entry: EnrichedLeadSummary;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const { lead, insights } = entry;
  const urgencyDot = URGENCY_DOT[insights.urgency];
  const progress = Math.round(insights.progress * 100);
  const ownerName =
    lead.assignedToUser?.name ?? lead.assignedTo ?? null;
  return (
    <Link
      href={`/crm/leads/${lead.id}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", lead.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={[
        "block cursor-grab rounded-lg border border-white/[0.06] bg-[#161618] p-3 text-left transition active:cursor-grabbing",
        isDragging
          ? "opacity-40 ring-1 ring-emerald-500/40"
          : "hover:border-white/[0.16] hover:bg-[#1c1c20]",
      ].join(" ")}
    >
      {/* Row 1 — Name + Score + HOT */}
      <div className="flex items-start gap-2">
        <span aria-hidden className={`mt-1.5 h-1.5 w-1.5 rounded-full ${urgencyDot}`} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-white">
            {lead.firstName} {lead.lastName}
          </p>
          <p className="mt-0.5 truncate text-[10.5px] text-zinc-500">
            {lead.city ?? "Standort offen"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-zinc-200">
            {insights.score}
          </span>
          {lead.priority === "HOT" && (
            <span className="ops-chip ops-chip-orange text-[9px]">HOT</span>
          )}
        </div>
      </div>

      {/* Row 2 — Phone */}
      <a
        href={`tel:${lead.phone}`}
        onClick={(e) => e.stopPropagation()}
        className="mt-2 inline-flex items-center gap-1 text-[10.5px] tabular-nums text-emerald-300 hover:text-emerald-200"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
        </svg>
        {lead.phone}
      </a>

      {/* Row 3 — Last contact + SLA */}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
        <span>Letzter Kontakt: <span className="text-zinc-300">{relativeFromNow(insights.lastContactAt)}</span></span>
        {lead.slaBreachedAt ? (
          <span className="rounded-sm bg-red-500/15 px-1 py-px text-[9px] font-bold uppercase text-red-300">
            SLA
          </span>
        ) : (
          <span className="rounded-sm bg-emerald-500/12 px-1 py-px text-[9px] font-medium text-emerald-300">
            i.O.
          </span>
        )}
      </div>

      {/* Row 4 — Progress */}
      <div className="mt-2">
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>Fortschritt</span>
          <span className="tabular-nums text-zinc-300">{progress} %</span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.05]">
          <div
            aria-hidden
            className="h-full rounded-full bg-emerald-400/80"
            style={{ width: `${Math.max(3, progress)}%` }}
          />
        </div>
      </div>

      {/* Row 5 — Next action */}
      <p className="mt-2 line-clamp-2 text-[10.5px] leading-tight text-zinc-300">
        <span className="font-semibold text-emerald-300">›</span>{" "}
        {insights.nextBestAction.label}
      </p>

      {/* Row 6 — Owner */}
      <div className="mt-2 flex items-center justify-between border-t border-white/[0.04] pt-2">
        {ownerName ? (
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <span
              title={ownerName}
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[8px] font-bold text-black"
            >
              {ownerName
                .split(/\s+/)
                .map((p) => p[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <span className="truncate">{ownerName}</span>
          </span>
        ) : (
          <span className="text-[10px] text-red-300">⚠ unverteilt</span>
        )}
      </div>
    </Link>
  );
}
