"use client";
/**
 * LeadWorkspace — the Lead Command Center shell (Bewerberakte).
 *
 * Layout (desktop):
 *   ┌──────────────── Header: identity + global actions + progress ────────────┐
 *   ├── Profil (left) ──┬────── Tabs + content (middle) ──────┬── KI/Next (right) ┤
 *
 * The middle column hosts the 8 section tabs (each a server-rendered node that
 * reuses the existing, persisting CRM components). The left rail (profile) and
 * right rail (KI Operator + next action) stay visible at all times so the
 * operator always sees "where is the applicant?" and "what is the next action?".
 *
 * This component only owns presentation + active section. Every mutation still
 * flows through the existing server actions inside the panels.
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";

import type { LeadDetail } from "../../types";
import { PRIORITY_TONE, STATUS_TONE } from "../leadLabels";

export interface WorkspaceTab {
  id: string;
  label: string;
  content: ReactNode;
  badge?: number | undefined;
}

interface Props {
  lead: LeadDetail;
  tabs: ReadonlyArray<WorkspaceTab>;
  leftRail: ReactNode;
  rightRail: ReactNode;
  progress: ReactNode;
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

const ACT_ICON = "h-4 w-4";
const ai = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

type Action =
  | { label: string; icon: ReactNode; href: string; external?: boolean; tone?: "wa" }
  | { label: string; icon: ReactNode; tab: string };

export function LeadWorkspace({ lead, tabs, leftRail, rightRail, progress }: Props) {
  const [active, setActive] = useState<string>(tabs[0]?.id ?? "uebersicht");
  const status = STATUS_TONE[lead.status];
  const priority = PRIORITY_TONE[lead.priority];
  const initials = `${lead.firstName[0] ?? ""}${lead.lastName[0] ?? ""}`.toUpperCase();
  const slaBreached = lead.slaBreachedAt !== null;

  const goTo = (id: string) => setActive(id);

  const actions: ReadonlyArray<Action> = [
    {
      label: "Anrufen",
      tab: "kommunikation",
      icon: (
        <svg className={ACT_ICON} {...ai}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.71 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.71A2 2 0 0 1 22 16.92Z" />
        </svg>
      ),
    },
    {
      label: "WhatsApp",
      href: waLink(lead.phone),
      external: true,
      tone: "wa",
      icon: (
        <svg className={ACT_ICON} {...ai}>
          <path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.7-.3-3.9-.8L3 21l1.6-4.5C3.6 15.2 3 13.7 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" />
        </svg>
      ),
    },
    {
      label: "E-Mail",
      href: `mailto:${lead.email}`,
      external: true,
      icon: (
        <svg className={ACT_ICON} {...ai}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      ),
    },
    {
      label: "Termin",
      tab: "termine",
      icon: (
        <svg className={ACT_ICON} {...ai}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      ),
    },
    {
      label: "Aufgabe",
      tab: "aufgaben",
      icon: (
        <svg className={ACT_ICON} {...ai}>
          <rect x="3" y="3" width="18" height="18" rx="2.5" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      ),
    },
    {
      label: "Dokument anfordern",
      tab: "unterlagen",
      icon: (
        <svg className={ACT_ICON} {...ai}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5M9 13h6M9 17h6" />
        </svg>
      ),
    },
    {
      label: "Notiz",
      tab: "notizen",
      icon: (
        <svg className={ACT_ICON} {...ai}>
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      ),
    },
  ];

  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className="space-y-5">
      <Link
        href="/crm/leads"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="m15 18-6-6 6-6" />
        </svg>
        Alle Leads
      </Link>

      {/* Header zone: identity + global actions */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-premium ring-1 ring-ink/[0.06]">
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-navy-900 to-brand-700 font-display text-lg font-bold text-white">
                {initials || "?"}
              </span>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-navy-950">
                  {lead.firstName} {lead.lastName}
                </h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Chip pill={status.pill} dot={status.dot} label={status.label} />
                  <Chip pill={priority.pill} dot={priority.dot} label={`Prio: ${priority.label}`} />
                  {slaBreached ? (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-100">
                      SLA überschritten
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      SLA ok
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Lead Score
              </span>
              <span className="text-3xl font-bold tabular-nums text-navy-950">{lead.score}</span>
            </div>
          </div>

          {/* Global action system — always visible */}
          <div className="flex flex-wrap gap-2 border-t border-ink/[0.06] pt-3">
            {actions.map((a) =>
              "href" in a ? (
                <a
                  key={a.label}
                  href={a.href}
                  {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition",
                    a.tone === "wa"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-ink/10 bg-white text-ink hover:border-ink/20 hover:bg-surface-subtle",
                  ].join(" ")}
                >
                  {a.icon}
                  {a.label}
                </a>
              ) : (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => goTo(a.tab)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink transition hover:border-ink/20 hover:bg-surface-subtle"
                >
                  {a.icon}
                  {a.label}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Progress engine — always visible */}
      {progress}

      {/* 3-column command center */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)_344px]">
        {/* Left: profile (first on desktop, after KI on mobile) */}
        <div className="order-2 xl:order-1 xl:sticky xl:top-4 xl:self-start">
          {leftRail}
        </div>

        {/* Middle: tabs + content */}
        <div className="order-3 min-w-0 xl:order-2">
          <div className="sticky top-2 z-10 -mx-1 mb-4 rounded-xl bg-white/95 px-1 shadow-sm ring-1 ring-ink/[0.06] backdrop-blur">
            <nav className="flex gap-1 overflow-x-auto px-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActive(t.id)}
                  className={[
                    "relative shrink-0 px-3.5 py-2.5 text-[13px] font-semibold transition",
                    active === t.id ? "text-brand-700" : "text-ink-muted hover:text-ink",
                  ].join(" ")}
                >
                  {t.label}
                  {t.badge ? (
                    <span className="ml-1.5 rounded-full bg-ink/10 px-1.5 text-[10px] tabular-nums text-ink-soft">
                      {t.badge}
                    </span>
                  ) : null}
                  {active === t.id ? (
                    <span aria-hidden className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-600" />
                  ) : null}
                </button>
              ))}
            </nav>
          </div>
          <div>{activeTab?.content}</div>
        </div>

        {/* Right: KI Operator + next action (first on mobile) */}
        <div className="order-1 space-y-4 xl:order-3 xl:sticky xl:top-4 xl:self-start">
          {rightRail}
        </div>
      </div>
    </div>
  );
}

function Chip({ pill, dot, label }: { pill: string; dot: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${pill}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
