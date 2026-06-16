/**
 * Recent leads block for the CRM dashboard.
 *
 * Premium, fully-clickable list: every row is a single <Link> into the lead
 * detail. Built on CSS grid (not a <table>) so the whole row is a valid
 * clickable target while staying server-rendered. `md:contents` flattens the
 * mobile meta-group into the desktop grid.
 *
 * Edel touches: hover accent bar, ringed gradient avatar, status chip with a
 * semantic dot, premium SLA indicator and a circular chevron affordance.
 *
 * Lives in its own file to keep Dashboard.tsx under the 300-line guardrail.
 */
import Link from "next/link";

import type { LeadStatus, LeadSummary } from "../types";
import { evaluateSla } from "../utils/sla";
import { LOCATION_LABEL } from "./leadLabels";
import { PriorityBadge } from "./PriorityBadge";

const LEAD_TIME = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const GRID =
  "md:grid md:grid-cols-[minmax(0,2.3fr)_0.9fr_0.8fr_1fr_1.15fr_0.95fr_28px] md:items-center md:gap-4";

interface RecentLeadsProps {
  recent: ReadonlyArray<LeadSummary>;
}

export function RecentLeads({ recent }: RecentLeadsProps) {
  return (
    <section aria-labelledby="recent-heading">
      <header className="flex items-end justify-between">
        <div>
          <h2
            id="recent-heading"
            className="text-lg font-semibold tracking-tight text-ink"
          >
            Neueste Leads
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Die letzten {recent.length || 0} Eingänge — klicke eine Zeile für
            die Details.
          </p>
        </div>
        <Link
          href="/crm/leads"
          className="group inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:text-brand-800"
        >
          Alle Leads
          <span
            aria-hidden
            className="transition-transform group-hover:translate-x-0.5"
          >
            →
          </span>
        </Link>
      </header>

      <div className="mt-4 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-premium ring-1 ring-ink/[0.02]">
        <div
          className={[
            "hidden border-b border-ink/[0.07] bg-gradient-to-b from-surface-subtle to-white px-6 py-3.5",
            "text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted",
            GRID,
          ].join(" ")}
        >
          <span>Lead</span>
          <span>Status</span>
          <span>Prio</span>
          <span>Standort</span>
          <span>Reaktion</span>
          <span className="md:text-right">Eingang</span>
          <span aria-hidden />
        </div>

        {recent.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-ink-muted">
            Noch keine Leads — sobald jemand den Eignungscheck startet, erscheint
            er hier in Echtzeit.
          </p>
        ) : (
          <ul className="divide-y divide-ink/[0.06]">
            {recent.map((lead) => (
              <li key={lead.id}>
                <LeadRow lead={lead} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function LeadRow({ lead }: { lead: LeadSummary }) {
  const initials =
    (lead.firstName[0] ?? "").toUpperCase() +
    (lead.lastName[0] ?? "").toUpperCase();
  return (
    <Link
      href={`/crm/leads/${lead.id}`}
      aria-label={`Lead ${lead.firstName} ${lead.lastName} öffnen`}
      className={[
        "group relative flex flex-col gap-3 px-6 py-4 transition-colors duration-200",
        "hover:bg-gradient-to-r hover:from-surface-subtle/80 hover:via-surface-subtle/30 hover:to-transparent",
        "focus:bg-surface-subtle/60 focus:outline-none",
        GRID,
      ].join(" ")}
    >
      {/* hover accent bar */}
      <span
        aria-hidden
        className="absolute inset-y-2 left-0 w-[3px] origin-top scale-y-0 rounded-full bg-gradient-to-b from-brand-500 to-brand-700 opacity-0 transition-all duration-200 group-hover:scale-y-100 group-hover:opacity-100"
      />

      {/* identity (col 1) */}
      <span className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-brand-800 text-[12.5px] font-bold text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_2px_6px_-1px_rgba(11,21,48,0.35)] ring-2 ring-white transition-transform duration-200 group-hover:scale-[1.06]"
        >
          {initials || "·"}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14.5px] font-semibold tracking-tight text-navy-950 transition-colors group-hover:text-brand-700">
            {lead.firstName} {lead.lastName}
          </span>
          <span className="block truncate text-[12.5px] text-ink-muted">
            {lead.email}
          </span>
        </span>
      </span>

      {/* meta — flattens into the desktop grid via md:contents */}
      <span className="flex flex-wrap items-center gap-x-3 gap-y-2 md:contents">
        <span className="md:min-w-0">
          <StatusChip status={lead.status} />
        </span>
        <span className="md:min-w-0">
          <PriorityBadge priority={lead.priority} />
        </span>
        <span className="text-[13.5px] font-medium text-ink-soft">
          {LOCATION_LABEL[lead.preferredLocation]}
        </span>
        <span className="md:min-w-0">
          <SlaIndicator lead={lead} />
        </span>
        <span className="text-[12.5px] tabular-nums text-ink-muted md:text-right">
          {LEAD_TIME.format(lead.createdAt)}
        </span>
      </span>

      {/* chevron (col 7) */}
      <span
        aria-hidden
        className="hidden md:flex md:justify-end"
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-ink/10 bg-white text-ink-muted shadow-sm transition-all duration-200 group-hover:border-brand-200 group-hover:bg-brand-50 group-hover:text-brand-700 group-hover:translate-x-0.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </span>
      </span>
    </Link>
  );
}

/**
 * Dashboard "work state" — emphasises what the operator has to do, in plain
 * German. Fresh, not-yet-contacted leads (NEW/QUALIFIED/HOT) collapse into a
 * single "Unbearbeitet" so the row screams "needs action"; hotness still shows
 * in the separate Prio column.
 */
interface WorkState {
  label: string;
  dot: string;
  pill: string;
}

const TODO_PILL = "bg-amber-50 text-amber-800 ring-amber-100";
const BRAND_PILL = "bg-brand-50 text-brand-700 ring-brand-100";
const INDIGO_PILL = "bg-indigo-50 text-indigo-700 ring-indigo-100";
const DONE_PILL = "bg-emerald-50 text-emerald-700 ring-emerald-100";

const SLATE_PILL = "bg-slate-100 text-slate-700 ring-slate-200";

const WORK_STATE: Record<LeadStatus, WorkState> = {
  NEW: { label: "Unbearbeitet", dot: "bg-amber-500", pill: TODO_PILL },
  QUALIFIED: { label: "Unbearbeitet", dot: "bg-amber-500", pill: TODO_PILL },
  HOT: { label: "Unbearbeitet", dot: "bg-amber-500", pill: TODO_PILL },
  CONTACT_PENDING: { label: "Kontakt geplant", dot: "bg-brand-500", pill: BRAND_PILL },
  CONTACTED: { label: "Kontaktiert", dot: "bg-brand-600", pill: BRAND_PILL },
  CALL_SCHEDULED: { label: "Telefonat geplant", dot: "bg-brand-600", pill: BRAND_PILL },
  BRIEFING_SENT: { label: "Briefing versendet", dot: "bg-brand-600", pill: BRAND_PILL },
  DOC_PENDING: { label: "Dokumente offen", dot: "bg-amber-500", pill: TODO_PILL },
  DOC_READY: { label: "Dokumente vollständig", dot: "bg-brand-600", pill: BRAND_PILL },
  AA_APPOINTMENT_PENDING: { label: "AA-Termin offen", dot: "bg-amber-500", pill: TODO_PILL },
  AA_APPOINTMENT_DONE: { label: "AA-Termin erledigt", dot: "bg-indigo-500", pill: INDIGO_PILL },
  GUTSCHEIN_PENDING: { label: "Gutschein beantragt", dot: "bg-indigo-500", pill: INDIGO_PILL },
  GUTSCHEIN_APPROVED: { label: "Gutschein bewilligt", dot: "bg-emerald-500", pill: DONE_PILL },
  ENROLLED: { label: "Vertrag unterzeichnet", dot: "bg-emerald-500", pill: DONE_PILL },
  STARTED: { label: "Ausbildung läuft", dot: "bg-emerald-600", pill: DONE_PILL },
  CLOSED: { label: "Erfolgreich abgeschlossen", dot: "bg-emerald-500", pill: DONE_PILL },
  LOST: { label: "Verloren", dot: "bg-slate-400", pill: SLATE_PILL },
  REJECTED: { label: "Abgelehnt", dot: "bg-red-500", pill: "bg-red-50 text-red-700 ring-red-100" },
  BLOCKED: { label: "Blockiert", dot: "bg-slate-500", pill: "bg-slate-200 text-slate-700 ring-slate-300" },
};

function StatusChip({ status }: { status: LeadStatus }) {
  const s = WORK_STATE[status];
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold tracking-tight ring-1",
        s.pill,
      ].join(" ")}
    >
      <span aria-hidden className={["h-1.5 w-1.5 rounded-full", s.dot].join(" ")} />
      {s.label}
    </span>
  );
}

function SlaIndicator({ lead }: { lead: LeadSummary }) {
  if (lead.priority !== "HOT") {
    return <span className="text-[13px] text-ink-muted">–</span>;
  }
  const sla = evaluateSla(lead);
  if (sla.breached) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11.5px] font-semibold text-red-700 ring-1 ring-red-100">
        <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
        Zeit überschritten
      </span>
    );
  }
  const urgent = sla.minutesRemaining <= 10;
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1",
        urgent
          ? "bg-amber-50 text-amber-800 ring-amber-100"
          : "bg-emerald-50 text-emerald-700 ring-emerald-100",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "h-1.5 w-1.5 rounded-full",
          urgent ? "bg-amber-500" : "bg-emerald-500",
        ].join(" ")}
      />
      noch {sla.minutesRemaining} Min.
    </span>
  );
}
