/**
 * LeadListRow — single row inside the Lead Control Center table.
 *
 * Encapsulates urgency rail, identity, score badge, next-best-action verb,
 * last-contact timestamp, progress bar, quick-action buttons (call, WhatsApp,
 * open) and the inline delete control. Kept in its own file so the parent
 * table component stays under the max-lines guard.
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

export type SortKey =
  | "score"
  | "urgency"
  | "createdAt"
  | "lastContact"
  | "nextAction";

const URGENCY_RAIL: Record<LeadUrgency, string> = {
  overdue: "bg-red-500",
  today: "bg-amber-500",
  soon: "bg-brand-500",
  normal: "bg-transparent",
};

const ACTION_TONE: Record<
  NextBestAction["tone"],
  { chip: string; bar: string }
> = {
  critical: {
    chip: "bg-red-50 text-red-700 ring-red-200",
    bar: "bg-red-500",
  },
  urgent: {
    chip: "bg-accent-50 text-accent-700 ring-accent-200",
    bar: "bg-accent-500",
  },
  warning: {
    chip: "bg-amber-50 text-amber-800 ring-amber-200",
    bar: "bg-amber-500",
  },
  active: {
    chip: "bg-brand-50 text-brand-700 ring-brand-200",
    bar: "bg-brand-500",
  },
  wait: {
    chip: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    bar: "bg-indigo-500",
  },
  success: {
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    bar: "bg-emerald-500",
  },
};

const SCORE_CHIP = (score: number): string => {
  if (score >= 90) return "bg-accent-600 text-white ring-accent-700/40";
  if (score >= 70) return "bg-amber-500 text-white ring-amber-600/40";
  return "bg-slate-200 text-slate-800 ring-slate-300/40";
};

const SCORE_TAG = (score: number): string => {
  if (score >= 90) return "HOT";
  if (score >= 70) return "WARM";
  return "COLD";
};

const REL = new Intl.RelativeTimeFormat("de-DE", { numeric: "auto" });

function relTime(at: Date | null): string {
  if (!at) return "—";
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

interface LeadListRowProps {
  entry: EnrichedLeadSummary;
  confirming: boolean;
  pending: boolean;
  users: ReadonlyArray<{ id: string; name: string }>;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onEdit: () => void;
}

export function LeadListRow({
  entry,
  confirming,
  pending,
  users,
  onAsk,
  onCancel,
  onConfirm,
  onEdit,
}: LeadListRowProps) {
  const { lead, insights } = entry;
  const status = STATUS_TONE[lead.status];
  const action = ACTION_TONE[insights.nextBestAction.tone];
  const rail = URGENCY_RAIL[insights.urgency];
  const progressPct = Math.round(insights.progress * 100);
  const lastContact = relTime(insights.lastContactAt);
  const detailHref = `/crm/leads/${lead.id}` as Route;

  return (
    <tr className="group relative bg-white transition-colors hover:bg-surface-subtle/40">
      <td className="relative px-4 py-3">
        <span aria-hidden className={`absolute inset-y-2 left-0 w-[3px] rounded-r ${rail}`} />
        <Link
          href={detailHref}
          className="block pl-2 font-semibold text-navy-950 transition-colors hover:text-brand-700"
        >
          {lead.firstName} {lead.lastName}
        </Link>
        <p className="truncate pl-2 text-xs text-ink-muted">{lead.email}</p>
      </td>

      <td className="px-3 py-3">
        <span
          className={[
            "inline-flex flex-col items-center justify-center rounded-lg px-2 py-1 ring-1",
            SCORE_CHIP(insights.score),
          ].join(" ")}
        >
          <span className="text-[14px] font-bold leading-none tabular-nums">
            {insights.score}
          </span>
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] opacity-90">
            {SCORE_TAG(insights.score)}
          </span>
        </span>
      </td>

      <td className="px-3 py-3">
        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
            status.pill,
          ].join(" ")}
        >
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </td>

      <td className="px-3 py-3">
        <PriorityBadge priority={lead.priority} />
      </td>

      <td className="px-3 py-3">
        <span
          className={[
            "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
            action.chip,
          ].join(" ")}
        >
          → {insights.nextBestAction.label}
        </span>
      </td>

      <td className="px-3 py-3 text-[12px] text-ink-soft">
        {lastContact}
      </td>

      <td className="w-[140px] px-3 py-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className={`h-full rounded-full transition-all duration-[300ms] ease-out ${action.bar}`}
            style={{ width: `${Math.max(progressPct, 3)}%` }}
          />
        </div>
        <p className="mt-1 text-[10.5px] tabular-nums text-ink-muted">{progressPct}%</p>
      </td>

      <td className="px-3 py-3">
        <QuickActions
          phone={lead.phone}
          actionHref={insights.nextBestAction.href}
          actionKind={insights.nextBestAction.kind}
          detailHref={detailHref}
        />
      </td>

      <td className="px-3 py-3 text-right">
        <div className="inline-flex items-center gap-1.5">
          <LeadRowActions lead={lead} users={users} onEdit={onEdit} />
          <InlineDeleteControl
            confirming={confirming}
            pending={pending}
            onAsk={onAsk}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------

function QuickActions({
  phone,
  actionHref,
  actionKind,
  detailHref,
}: {
  phone: string;
  actionHref: string | undefined;
  actionKind: NextBestAction["kind"];
  detailHref: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <QuickIcon
        href={actionHref ?? `tel:${phone}`}
        label="Anrufen"
        external
        accent={actionKind === "call"}
      >
        <PhoneIcon />
      </QuickIcon>
      <QuickIcon href={waLink(phone)} label="WhatsApp" external>
        <WhatsappIcon />
      </QuickIcon>
      <QuickIcon href={detailHref} label="Lead öffnen">
        <OpenIcon />
      </QuickIcon>
    </div>
  );
}

function QuickIcon({
  href,
  label,
  external,
  accent,
  children,
}: {
  href: string | Route;
  label: string;
  external?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  const cls = [
    "inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition-all duration-200",
    accent
      ? "bg-accent-50 text-accent-700 ring-accent-200 hover:bg-accent-100 hover:ring-accent-300"
      : "bg-white text-ink-soft ring-ink/10 hover:-translate-y-px hover:text-brand-700 hover:ring-ink/20",
  ].join(" ");
  if (external) {
    return (
      <a
        href={href as string}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        title={label}
        className={cls}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href as Route} aria-label={label} title={label} className={cls}>
      {children}
    </Link>
  );
}

