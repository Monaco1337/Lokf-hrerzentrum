"use client";
/**
 * LeadWorkspace — the central applicant case-file shell (Bewerberakte).
 *
 * Renders a sticky identity header with all key facts + quick actions and an
 * 8-tab operating surface. Tab panels are server-rendered nodes passed in as
 * props (each reuses existing, persisting CRM components), so all mutations
 * keep flowing through the central repository + ActivityLog. This component
 * only owns presentation + which tab is active.
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";

import type { LeadDetail } from "../../types";
import { LeadStatus } from "../../types";
import { PRIORITY_TONE, STATUS_TONE, humanizeSource } from "../leadLabels";

export interface WorkspaceTab {
  id: string;
  label: string;
  content: ReactNode;
  badge?: number | undefined;
}

interface Props {
  lead: LeadDetail;
  ownerName: string | null;
  lastContactAt: Date | null;
  tabs: ReadonlyArray<WorkspaceTab>;
}

const DATE = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

// Coarse funnel stage derived from the granular status.
function funnelStage(status: LeadStatus): string {
  const map: Partial<Record<LeadStatus, string>> = {
    NEW: "Eingang",
    CONTACT_PENDING: "Kontakt",
    CONTACTED: "Kontakt",
    CALL_SCHEDULED: "Kontakt",
    QUALIFIED: "Qualifizierung",
    HOT: "Qualifizierung",
    BRIEFING_SENT: "Qualifizierung",
    DOC_PENDING: "Unterlagen",
    DOC_READY: "Unterlagen",
    AA_APPOINTMENT_PENDING: "Agentur",
    AA_APPOINTMENT_DONE: "Agentur",
    GUTSCHEIN_PENDING: "Förderung",
    GUTSCHEIN_APPROVED: "Förderung",
    ENROLLED: "Abschluss",
    STARTED: "Abschluss",
    CLOSED: "Abschluss",
  };
  return map[status] ?? "—";
}

function fundingStatus(status: LeadStatus): string {
  switch (status) {
    case LeadStatus.GUTSCHEIN_APPROVED:
      return "Bewilligt";
    case LeadStatus.GUTSCHEIN_PENDING:
      return "Beantragt";
    case LeadStatus.AA_APPOINTMENT_PENDING:
    case LeadStatus.AA_APPOINTMENT_DONE:
      return "Agenturtermin";
    case LeadStatus.DOC_READY:
      return "Antrag vorbereitet";
    case LeadStatus.QUALIFIED:
    case LeadStatus.HOT:
    case LeadStatus.BRIEFING_SENT:
      return "Geeignet";
    default:
      return "Nicht besprochen";
  }
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

export function LeadWorkspace({ lead, ownerName, lastContactAt, tabs }: Props) {
  const [active, setActive] = useState<string>(tabs[0]?.id ?? "overview");
  const status = STATUS_TONE[lead.status];
  const priority = PRIORITY_TONE[lead.priority];
  const initials = `${lead.firstName[0] ?? ""}${lead.lastName[0] ?? ""}`.toUpperCase();
  const slaBreached = lead.slaBreachedAt !== null;

  const goTo = (id: string) => setActive(id);

  const QUICK: ReadonlyArray<{ label: string; href?: string; external?: boolean; tab?: string; tone?: "wa" }> = [
    { label: "WhatsApp", href: waLink(lead.phone), external: true, tone: "wa" },
    { label: "E-Mail", href: `mailto:${lead.email}`, external: true },
    { label: "Anruf protokollieren", tab: "kommunikation" },
    { label: "Aufgabe erstellen", tab: "aufgaben" },
    { label: "Follow-up planen", tab: "termine" },
    { label: "Termin planen", tab: "termine" },
    { label: "Unterlagen anfordern", tab: "unterlagen" },
    { label: "Status ändern", tab: "uebersicht" },
    { label: "Bearbeiter zuweisen", tab: "uebersicht" },
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

      <div className="sticky top-2 z-20 overflow-hidden rounded-2xl bg-white/95 shadow-premium ring-1 ring-ink/[0.06] backdrop-blur">
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
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
                    {funnelStage(lead.status)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                    Förderung: {fundingStatus(lead.status)}
                  </span>
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
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Lead Score</span>
              <span className="text-3xl font-bold tabular-nums text-navy-950">{lead.score}</span>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-ink/[0.06] pt-3 text-[12.5px] sm:grid-cols-3 lg:grid-cols-6">
            <Meta label="Bearbeiter" value={ownerName ?? "Nicht zugewiesen"} />
            <Meta label="Quelle" value={humanizeSource(lead.source)} />
            <Meta label="Erstellt" value={DATE.format(lead.createdAt)} />
            <Meta label="Letzter Kontakt" value={lastContactAt ? DATE_TIME.format(lastContactAt) : "—"} />
            <Meta label="Nächste Aktion" value={lead.nextFollowUpAt ? DATE_TIME.format(lead.nextFollowUpAt) : "—"} />
            <Meta label="Telefon" value={lead.phone} />
          </dl>

          <div className="flex flex-wrap gap-2 border-t border-ink/[0.06] pt-3">
            {QUICK.map((q) =>
              q.href ? (
                <a
                  key={q.label}
                  href={q.href}
                  {...(q.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition",
                    q.tone === "wa"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-ink/10 bg-white text-ink hover:border-ink/20 hover:bg-surface-subtle",
                  ].join(" ")}
                >
                  {q.label}
                </a>
              ) : (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => q.tab && goTo(q.tab)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink transition hover:border-ink/20 hover:bg-surface-subtle"
                >
                  {q.label}
                </button>
              ),
            )}
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto border-t border-ink/[0.06] bg-surface-subtle/50 px-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={[
                "relative shrink-0 px-3.5 py-2.5 text-[13px] font-semibold transition",
                active === t.id
                  ? "text-brand-700"
                  : "text-ink-muted hover:text-ink",
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</dt>
      <dd className="truncate font-medium text-ink">{value}</dd>
    </div>
  );
}
