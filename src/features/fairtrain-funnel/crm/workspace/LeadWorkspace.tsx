"use client";
/**
 * LeadWorkspace — the Lead Command Center shell (Bewerberakte).
 */
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import type { LeadDetail } from "../../types";
import type { NextActionCue } from "../nextActionCue";
import { PRIORITY_TONE, STATUS_TONE } from "../leadLabels";
import { WorkspaceNavProvider } from "./workspaceNav";

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
  /** Progress stepper — stages can jump to a tab via WorkspaceNav context. */
  progress: ReactNode;
  nextAction: NextActionCue;
}

const NEXT_TONE: Record<
  NextActionCue["tone"],
  { card: string; chip: string; btn: string }
> = {
  critical: {
    card: "border-rose-200 bg-rose-50/70",
    chip: "bg-rose-500 text-white",
    btn: "bg-rose-600 text-white hover:bg-rose-700",
  },
  urgent: {
    card: "border-amber-200 bg-amber-50/70",
    chip: "bg-amber-500 text-white",
    btn: "bg-amber-600 text-white hover:bg-amber-700",
  },
  warning: {
    card: "border-amber-200 bg-amber-50/70",
    chip: "bg-amber-500 text-white",
    btn: "bg-amber-600 text-white hover:bg-amber-700",
  },
  active: {
    card: "border-emerald-200 bg-emerald-50/70",
    chip: "bg-emerald-500 text-white",
    btn: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  success: {
    card: "border-emerald-200 bg-emerald-50/70",
    chip: "bg-emerald-500 text-white",
    btn: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  wait: {
    card: "border-sky-200 bg-sky-50/70",
    chip: "bg-sky-500 text-white",
    btn: "bg-sky-600 text-white hover:bg-sky-700",
  },
};

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

export function LeadWorkspace({
  lead,
  tabs,
  leftRail,
  rightRail,
  progress,
  nextAction,
}: Props) {
  // Allow deep-linking straight to a tab (e.g. Dashboard "Neue Unterlagen" →
  // `?tab=unterlagen` opens the document reviewer immediately).
  const requestedTab = useSearchParams().get("tab");
  const initialTab =
    requestedTab && tabs.some((t) => t.id === requestedTab)
      ? requestedTab
      : tabs[0]?.id ?? "uebersicht";
  const [active, setActive] = useState<string>(initialTab);
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
    { label: "Termin", tab: "termine", icon: <CalendarIcon /> },
    { label: "Aufgabe", tab: "aufgaben", icon: <CheckIcon /> },
    { label: "Dokumente", tab: "unterlagen", icon: <DocIcon /> },
    { label: "Notiz", tab: "kommunikation", icon: <NoteIcon /> },
  ];

  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <WorkspaceNavProvider value={{ goTo }}>
    <div className="space-y-4">
      <Link
        href="/crm/leads"
        className="inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 text-[13px] font-medium text-ink-soft transition hover:text-brand-700"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
          <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Zurück zu Leads
      </Link>

      {/* Identity header — glass surface */}
      <div className="rounded-2xl border border-ink/[0.07] bg-white/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/70">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white via-white to-surface-subtle text-[18px] font-bold tracking-tight text-navy-950 ring-1 ring-inset ring-ink/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_8px_-2px_rgba(15,23,42,0.1)]"
            >
              {initials || "?"}
            </span>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
                Bewerberakte
              </p>
              <h1 className="font-display text-[26px] font-bold tracking-tight text-navy-950">
                {lead.firstName} {lead.lastName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[12.5px] text-ink-soft">
                <a href={`tel:${lead.phone}`} className="hover:text-brand-700">
                  {lead.phone}
                </a>
                <span aria-hidden className="text-ink-muted/40">·</span>
                <a
                  href={`mailto:${lead.email}`}
                  className="max-w-[220px] truncate hover:text-brand-700"
                >
                  {lead.email}
                </a>
                {lead.city ? (
                  <>
                    <span aria-hidden className="text-ink-muted/40">·</span>
                    <span>{lead.city}</span>
                  </>
                ) : null}
                <span aria-hidden className="text-ink-muted/40">·</span>
                <span className="text-ink-muted">
                  {lead.assignedToUser?.name ?? "Nicht zugewiesen"}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Chip pill={status.pill} dot={status.dot} label={status.label} />
                <Chip pill={priority.pill} dot={priority.dot} label={priority.label} />
                {slaBreached ? (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-100">
                    SLA überschritten
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    SLA ok
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
              Lead Score
            </span>
            <span className="text-[36px] font-bold leading-none tabular-nums text-navy-950">
              {lead.score}
            </span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto border-t border-ink/[0.05] px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {actions.map((a) =>
            "href" in a ? (
              <a
                key={a.label}
                href={a.href}
                {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={[
                  "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition",
                  a.tone === "wa"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100"
                    : "bg-surface-subtle text-ink ring-1 ring-ink/10 hover:bg-white hover:ring-ink/15",
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
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-surface-subtle px-3 py-2 text-[12.5px] font-semibold text-ink ring-1 ring-ink/10 transition hover:bg-white hover:ring-ink/15"
              >
                {a.icon}
                {a.label}
              </button>
            ),
          )}
        </div>
      </div>

      <NextActionBanner cue={nextAction} goTo={goTo} />

      {progress}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[272px_minmax(0,1fr)_320px] xl:gap-5">
        <div className="order-2 xl:order-1 xl:sticky xl:top-4 xl:self-start">
          {leftRail}
        </div>

        <div className="order-3 min-w-0 xl:order-2">
          <nav className="mb-4 flex gap-1 overflow-x-auto rounded-xl border border-ink/[0.06] bg-surface-subtle/80 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className={[
                  "relative shrink-0 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition",
                  active === t.id
                    ? "bg-white text-brand-700 shadow-sm ring-1 ring-ink/[0.06]"
                    : "text-ink-muted hover:text-ink",
                ].join(" ")}
              >
                {t.label}
                {t.badge ? (
                  <span className="ml-1.5 rounded-full bg-brand-100 px-1.5 text-[10px] font-bold tabular-nums text-brand-700">
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          <div className="space-y-4">{activeTab?.content}</div>
        </div>

        <div className="order-1 space-y-4 xl:order-3 xl:sticky xl:top-4 xl:self-start">
          {rightRail}
        </div>
      </div>
    </div>
    </WorkspaceNavProvider>
  );
}

function NextActionBanner({
  cue,
  goTo,
}: {
  cue: NextActionCue;
  goTo: (tab: string) => void;
}) {
  const tone = NEXT_TONE[cue.tone] ?? NEXT_TONE.active;
  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border px-5 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur ${tone.card}`}
    >
      <span
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone.chip}`}
      >
        <NextActionIcon icon={cue.icon} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Nächster Schritt
        </p>
        <p className="truncate text-[14px] font-bold tracking-tight text-navy-950">
          {cue.label}
        </p>
        <p className="truncate text-[12.5px] text-ink-soft">{cue.reason}</p>
      </div>
      {cue.target.kind === "href" ? (
        <a
          href={cue.target.href}
          {...(cue.target.href.startsWith("http")
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold shadow-sm transition ${tone.btn}`}
        >
          {cue.label}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => cue.target.kind === "tab" && goTo(cue.target.tab)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold shadow-sm transition ${tone.btn}`}
        >
          {cue.label}
        </button>
      )}
    </div>
  );
}

function NextActionIcon({ icon }: { icon: NextActionCue["icon"] }) {
  const p = { ...ai, className: "h-5 w-5" };
  switch (icon) {
    case "call":
      return (
        <svg {...p}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.71 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.71A2 2 0 0 1 22 16.92Z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...p}>
          <path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.7-.3-3.9-.8L3 21l1.6-4.5C3.6 15.2 3 13.7 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" />
        </svg>
      );
    case "docs":
      return (
        <svg {...p}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...p}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </svg>
      );
    case "voucher":
      return (
        <svg {...p}>
          <rect x="2" y="6" width="20" height="12" rx="2" />
          <path d="M2 10h20M6 14h4" />
        </svg>
      );
    case "check":
      return (
        <svg {...p}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4l3 2" />
        </svg>
      );
  }
}

function Chip({ pill, dot, label }: { pill: string; dot: string; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${pill}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg className={ACT_ICON} {...ai}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg className={ACT_ICON} {...ai}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg className={ACT_ICON} {...ai}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg className={ACT_ICON} {...ai}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
