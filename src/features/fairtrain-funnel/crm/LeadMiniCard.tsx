/**
 * LeadMiniCard — the unit of currency for the Lead Control Center.
 *
 * Used inside the priority strip ("Jetzt bearbeiten") and the pipeline
 * kanban columns. Encapsulates avatar, identity, urgency rail, status pill,
 * score badge and next-best-action verb in a single clickable card.
 */
import Link from "next/link";

import type { EnrichedLeadSummary, LeadUrgency } from "../types";
import { LOCATION_LABEL, STATUS_TONE } from "./leadLabels";

const URGENCY_RAIL: Record<LeadUrgency, string> = {
  overdue: "bg-gradient-to-b from-red-500 to-red-700",
  today: "bg-gradient-to-b from-amber-400 to-amber-600",
  soon: "bg-gradient-to-b from-brand-500 to-brand-700",
  normal: "bg-gradient-to-b from-slate-300 to-slate-400",
};

const URGENCY_TEXT: Record<LeadUrgency, string> = {
  overdue: "Überfällig",
  today: "Heute",
  soon: "Bald",
  normal: "Im Plan",
};

const URGENCY_CHIP: Record<LeadUrgency, string> = {
  overdue: "bg-red-50 text-red-700 ring-red-100",
  today: "bg-amber-50 text-amber-800 ring-amber-100",
  soon: "bg-brand-50 text-brand-700 ring-brand-100",
  normal: "bg-surface-muted text-ink-soft ring-ink/10",
};

const SCORE_CHIP = (score: number): string => {
  if (score >= 90) return "bg-accent-50 text-accent-700 ring-accent-200";
  if (score >= 70) return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
};

const ACTION_TEXT: Record<
  EnrichedLeadSummary["insights"]["nextBestAction"]["tone"],
  string
> = {
  critical: "text-red-700",
  urgent: "text-accent-700",
  warning: "text-amber-700",
  active: "text-brand-700",
  wait: "text-indigo-600",
  success: "text-emerald-700",
};

const TIME_FMT = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });

function relativeFromNow(at: Date | null): string | null {
  if (!at) return null;
  const diffMs = at.getTime() - Date.now();
  const min = Math.round(diffMs / 60_000);
  if (Math.abs(min) < 60) return TIME_FMT.format(min, "minute");
  const hours = Math.round(min / 60);
  if (Math.abs(hours) < 24) return TIME_FMT.format(hours, "hour");
  const days = Math.round(hours / 24);
  return TIME_FMT.format(days, "day");
}

export function LeadMiniCard({
  entry,
  variant = "kanban",
}: {
  entry: EnrichedLeadSummary;
  /** kanban → compact (column constraint), strip → wider (horizontal strip) */
  variant?: "kanban" | "strip";
}) {
  const { lead, insights } = entry;
  const status = STATUS_TONE[lead.status];
  const initials =
    `${lead.firstName[0] ?? ""}${lead.lastName[0] ?? ""}`.toUpperCase() || "·";
  const rail = URGENCY_RAIL[insights.urgency];
  const since = relativeFromNow(lead.createdAt);
  const lastContact = relativeFromNow(insights.lastContactAt);

  return (
    <Link
      href={`/crm/leads/${lead.id}`}
      className={[
        "group relative block overflow-hidden rounded-xl bg-white ring-1 ring-ink/[0.06]",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-[250ms] ease-out",
        "hover:-translate-y-0.5 hover:shadow-card hover:ring-ink/15",
        variant === "strip" ? "w-[280px] shrink-0" : "",
      ].join(" ")}
    >
      <span aria-hidden className={`absolute inset-y-3 left-0 w-[3px] rounded-r-full ${rail}`} />

      <div className="flex items-start gap-3 p-3.5 pl-4 md:p-4 md:pl-5">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-navy-900 to-brand-700 text-[11.5px] font-bold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)] ring-1 ring-white"
        >
          {initials}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-[13.5px] font-semibold tracking-tight text-navy-950 group-hover:text-brand-700">
              {lead.firstName} {lead.lastName}
            </p>
            <span
              className={[
                "inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ring-1",
                SCORE_CHIP(insights.score),
              ].join(" ")}
              title={`Lead Score: ${insights.score}`}
            >
              {insights.score}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-ink-muted">
            {LOCATION_LABEL[lead.preferredLocation]}
            {since ? ` · ${since}` : ""}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1",
                status.pill,
              ].join(" ")}
            >
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            <span
              className={[
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-semibold ring-1",
                URGENCY_CHIP[insights.urgency],
              ].join(" ")}
            >
              {URGENCY_TEXT[insights.urgency]}
            </span>
          </div>

          <p
            className={[
              "mt-2.5 truncate text-[12px] font-semibold tracking-tight",
              ACTION_TEXT[insights.nextBestAction.tone],
            ].join(" ")}
          >
            → {insights.nextBestAction.label}
          </p>
          {lastContact ? (
            <p className="mt-0.5 truncate text-[10.5px] text-ink-muted">
              Letzter Kontakt {lastContact}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
