/**
 * LeadListCard — premium applicant row for the Leads operations view.
 *
 * The entire surface navigates to the Lead Command Center. Quick actions and
 * the overflow menu sit in a pointer-events island so they never steal the
 * primary click target.
 */
"use client";

import type { Route } from "next";
import Link from "next/link";

import {
  type EnrichedLeadSummary,
  type LeadUrgency,
  type NextBestAction,
} from "../types";
import { InlineDeleteControl } from "./InlineDeleteControl";
import { LeadRowActions } from "./LeadRowActions";
import { STATUS_TONE } from "./leadLabels";
import { OpenIcon, PhoneIcon, WhatsappIcon } from "./LeadListIcons";
import { PriorityBadge } from "./PriorityBadge";

const URGENCY_RAIL: Record<LeadUrgency, string> = {
  overdue: "from-red-500 to-red-600",
  today: "from-amber-400 to-amber-500",
  soon: "from-brand-500 to-brand-600",
  normal: "from-slate-200 to-slate-300",
};

const URGENCY_LABEL: Record<LeadUrgency, string> = {
  overdue: "Überfällig",
  today: "Heute",
  soon: "Bald",
  normal: "Im Plan",
};

const ACTION_TONE: Record<
  NextBestAction["tone"],
  { chip: string; bar: string; text: string }
> = {
  critical: {
    chip: "bg-red-50 text-red-700 ring-red-100",
    bar: "bg-red-500",
    text: "text-red-700",
  },
  urgent: {
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
  },
  warning: {
    chip: "bg-amber-50 text-amber-800 ring-amber-100",
    bar: "bg-amber-500",
    text: "text-amber-800",
  },
  active: {
    chip: "bg-brand-50 text-brand-700 ring-brand-100",
    bar: "bg-brand-500",
    text: "text-brand-700",
  },
  wait: {
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    bar: "bg-indigo-500",
    text: "text-indigo-700",
  },
  success: {
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    bar: "bg-emerald-500",
    text: "text-emerald-700",
  },
};

const REL = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });

function relTime(at: Date | null): string {
  if (!at) return "Noch kein Kontakt";
  const diffMs = at.getTime() - Date.now();
  const min = Math.round(diffMs / 60_000);
  if (Math.abs(min) < 60) return REL.format(min, "minute");
  const hours = Math.round(min / 60);
  if (Math.abs(hours) < 24) return REL.format(hours, "hour");
  const days = Math.round(hours / 24);
  return REL.format(days, "day");
}

function waLink(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+")
    ? digits.slice(1)
    : digits.startsWith("0")
      ? `49${digits.slice(1)}`
      : digits;
  return `https://wa.me/${e164}`;
}

function scoreStyle(score: number): string {
  if (score >= 90) return "from-emerald-600 to-teal-600";
  if (score >= 70) return "from-amber-500 to-orange-500";
  return "from-slate-400 to-slate-500";
}

export interface LeadListCardProps {
  entry: EnrichedLeadSummary;
  confirming: boolean;
  pending: boolean;
  users: ReadonlyArray<{ id: string; name: string }>;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onEdit: () => void;
}

export function LeadListCard({
  entry,
  confirming,
  pending,
  users,
  onAsk,
  onCancel,
  onConfirm,
  onEdit,
}: LeadListCardProps) {
  const { lead, insights } = entry;
  const status = STATUS_TONE[lead.status];
  const action = ACTION_TONE[insights.nextBestAction.tone];
  const progressPct = Math.round(insights.progress * 100);
  const detailHref = `/crm/leads/${lead.id}` as Route;
  const initials =
    `${lead.firstName[0] ?? ""}${lead.lastName[0] ?? ""}`.toUpperCase() || "?";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-ink/[0.06] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:border-ink/15 hover:shadow-card">
      <Link
        href={detailHref}
        className="absolute inset-0 z-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        aria-label={`${lead.firstName} ${lead.lastName} öffnen`}
      />

      <span
        aria-hidden
        className={`absolute inset-y-3 left-0 z-[1] w-[3px] rounded-r-full bg-gradient-to-b ${URGENCY_RAIL[insights.urgency]}`}
      />

      <div className="relative z-[2] flex flex-col gap-4 p-4 pl-5 sm:flex-row sm:items-center sm:gap-5 sm:p-5 sm:pl-6">
        {/* Identity */}
        <div className="flex min-w-0 flex-1 items-center gap-3.5 pointer-events-none">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-navy-900 to-brand-700 text-[12px] font-bold text-white shadow-sm ring-1 ring-white/20">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[15px] font-bold tracking-tight text-navy-950 group-hover:text-brand-700">
                {lead.firstName} {lead.lastName}
              </p>
              <span
                className={[
                  "inline-flex h-7 min-w-[2rem] items-center justify-center rounded-lg bg-gradient-to-br px-2 text-[13px] font-bold tabular-nums text-white shadow-sm",
                  scoreStyle(insights.score),
                ].join(" ")}
              >
                {insights.score}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">
              {lead.email}
              {lead.city ? ` · ${lead.city}` : ""}
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
              <PriorityBadge priority={lead.priority} />
              <span className="inline-flex items-center rounded-full bg-surface-subtle px-2 py-0.5 text-[10.5px] font-semibold text-ink-soft ring-1 ring-ink/10">
                {URGENCY_LABEL[insights.urgency]}
              </span>
            </div>
          </div>
        </div>

        {/* Next action + progress */}
        <div className="min-w-0 flex-1 pointer-events-none sm:max-w-[280px]">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            Nächste Aktion
          </p>
          <p className={`mt-1 text-[13px] font-semibold ${action.text}`}>
            {insights.nextBestAction.label}
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
              <div
                className={`h-full rounded-full transition-all ${action.bar}`}
                style={{ width: `${Math.max(progressPct, 4)}%` }}
              />
            </div>
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink-muted">
              {progressPct}%
            </span>
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-muted">
            Kontakt: {relTime(insights.lastContactAt)}
          </p>
        </div>

        {/* Quick actions — isolated from card navigation */}
        <div
          className="relative z-[3] flex shrink-0 items-center gap-1.5 self-end sm:self-center"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <QuickIcon
            href={insights.nextBestAction.href ?? `tel:${lead.phone}`}
            label="Anrufen"
            external
          >
            <PhoneIcon />
          </QuickIcon>
          <QuickIcon href={waLink(lead.phone)} label="WhatsApp" external>
            <WhatsappIcon />
          </QuickIcon>
          <QuickIcon href={detailHref} label="Akte öffnen">
            <OpenIcon />
          </QuickIcon>
          <LeadRowActions lead={lead} users={users} onEdit={onEdit} />
          <InlineDeleteControl
            confirming={confirming}
            pending={pending}
            onAsk={onAsk}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        </div>
      </div>
    </article>
  );
}

function QuickIcon({
  href,
  label,
  external,
  children,
}: {
  href: string | Route;
  label: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const cls =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink/10 bg-white text-ink-soft shadow-sm transition hover:border-ink/20 hover:bg-surface-subtle hover:text-brand-700";
  if (external) {
    return (
      <a
        href={href as string}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className={cls}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </a>
    );
  }
  return (
    <Link
      href={href as Route}
      aria-label={label}
      title={label}
      className={cls}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}
