/**
 * LeadListCard — premium glass-style applicant row.
 *
 * Click anywhere on the card to open the Lead Command Center. The action icons
 * + overflow menu live in a separate pointer-events island stacked above the
 * link, so they remain interactive without blocking navigation. The card uses
 * an Apple-style frosted look: white-glass surface, soft inner highlight on
 * the avatar, refined typography.
 */
"use client";

import type { Route } from "next";
import Link from "next/link";

import {
  type EnrichedLeadSummary,
  LEAD_QUALITY_LABEL,
  type LeadUrgency,
  type NextBestAction,
} from "../types";
import { ContactStateBadge } from "./ContactStateBadge";
import { InlineDeleteControl } from "./InlineDeleteControl";
import { LeadRowActions } from "./LeadRowActions";
import { OptOutBadge } from "./OptOutBadge";
import { STATUS_TONE } from "./leadLabels";
import { OpenIcon, PhoneIcon, WhatsappIcon } from "./LeadListIcons";
import { PriorityBadge } from "./PriorityBadge";
import { WhatsAppStatusBadge } from "./WhatsAppStatusBadge";

const URGENCY_RAIL: Record<LeadUrgency, string> = {
  overdue: "from-red-400 to-red-500",
  today: "from-amber-300 to-amber-500",
  soon: "from-brand-400 to-brand-600",
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
  { bar: string; text: string }
> = {
  critical: { bar: "bg-red-500", text: "text-red-700" },
  urgent: { bar: "bg-emerald-500", text: "text-emerald-700" },
  warning: { bar: "bg-amber-500", text: "text-amber-800" },
  active: { bar: "bg-brand-500", text: "text-brand-700" },
  wait: { bar: "bg-indigo-500", text: "text-indigo-700" },
  success: { bar: "bg-emerald-500", text: "text-emerald-700" },
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

function scoreStyle(score: number): {
  bg: string;
  text: string;
  ring: string;
} {
  if (score >= 90)
    return {
      bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/70",
      text: "text-emerald-700",
      ring: "ring-emerald-200",
    };
  if (score >= 70)
    return {
      bg: "bg-gradient-to-br from-amber-50 to-amber-100/70",
      text: "text-amber-800",
      ring: "ring-amber-200",
    };
  return {
    bg: "bg-gradient-to-br from-slate-50 to-slate-100/70",
    text: "text-slate-700",
    ring: "ring-slate-200",
  };
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
  const score = scoreStyle(insights.score);
  const progressPct = Math.round(insights.progress * 100);
  const detailHref = `/crm/leads/${lead.id}` as Route;
  const initials =
    `${lead.firstName[0] ?? ""}${lead.lastName[0] ?? ""}`.toUpperCase() || "?";

  return (
    <article className="group relative rounded-2xl border border-ink/[0.07] bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-200 supports-[backdrop-filter]:bg-white/70 hover:-translate-y-0.5 hover:border-ink/15 hover:bg-white hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.18),0_4px_10px_-4px_rgba(15,23,42,0.08)]">
      {/* Click overlay — entire card opens the Lead Command Center */}
      <Link
        href={detailHref}
        aria-label={`${lead.firstName} ${lead.lastName} öffnen`}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
      />

      {/* Urgency rail — decorative */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-4 left-0 z-[5] w-[3px] rounded-r-full bg-gradient-to-b ${URGENCY_RAIL[insights.urgency]}`}
      />

      {/* Content — pointer-events-none lets clicks fall through to the link */}
      <div className="pointer-events-none relative flex flex-col gap-4 px-5 py-4 pl-6 sm:flex-row sm:items-center sm:gap-5 sm:py-5">
        {/* Identity */}
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-white via-white to-surface-subtle text-[13px] font-bold tracking-tight text-navy-950 ring-1 ring-inset ring-ink/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.06)]"
          >
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[15px] font-bold tracking-tight text-navy-950 transition group-hover:text-brand-700">
                {lead.firstName} {lead.lastName}
              </p>
              <span
                className={[
                  "inline-flex h-7 min-w-[2.25rem] items-center justify-center rounded-[10px] px-2 text-[13px] font-bold tabular-nums ring-1 ring-inset shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
                  score.bg,
                  score.text,
                  score.ring,
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
              <span className="inline-flex items-center rounded-full bg-surface-subtle/80 px-2 py-0.5 text-[10.5px] font-semibold text-ink-soft ring-1 ring-ink/10">
                {URGENCY_LABEL[insights.urgency]}
              </span>
              <WhatsAppStatusBadge view={lead} />
              {lead.optOut ? <OptOutBadge /> : null}
              <ContactStateBadge lead={lead} showManualHint={false} />
            </div>
          </div>
        </div>

        {/* Next action + progress */}
        <div className="hidden min-w-0 shrink-0 sm:block sm:w-[240px]">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            Nächste Aktion
          </p>
          <p className={`mt-1 truncate text-[13px] font-semibold ${action.text}`}>
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
          <p className="mt-0.5 text-[11px] text-ink-muted">
            WA-Score{" "}
            <span className="font-semibold tabular-nums text-ink-soft">
              {lead.leadScore}
            </span>{" "}
            · {LEAD_QUALITY_LABEL[lead.leadQualityStatus]}
          </p>
          {lead.lastInboundMessage ? (
            <p
              className="mt-0.5 truncate text-[11px] italic text-emerald-700"
              title={lead.lastInboundMessage}
            >
              {`„${lead.lastInboundMessage}“`}
            </p>
          ) : null}
        </div>

        {/* Action zone — re-enable pointer events; sits above the link layer */}
        <div className="pointer-events-auto relative z-20 flex shrink-0 items-center gap-1.5 self-end sm:self-center">
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
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink/[0.08] bg-white/80 text-ink-soft shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-md transition hover:-translate-y-0.5 hover:border-ink/15 hover:bg-white hover:text-brand-700 hover:shadow-[0_6px_14px_-8px_rgba(15,23,42,0.18)]";
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
