/**
 * LeadProfileRail — the always-visible left column of the Lead Command Center.
 *
 * Surfaces the applicant's identity at a glance: contact data, status &
 * funding, lead score, and ownership. Pure presentation over the existing
 * LeadDetail data — no mutations, no new logic.
 */
import type { LeadDetail } from "../../types";
import { LeadStatus } from "../../types";
import { PRIORITY_TONE, STATUS_TONE, humanizeSource } from "../leadLabels";

const DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const DATE_TIME = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

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

function ContactRow({
  icon,
  value,
  href,
}: {
  icon: React.ReactNode;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="mt-0.5 text-ink-muted">{icon}</span>
      <span className="min-w-0 break-words text-[13px] font-medium text-ink">
        {value}
      </span>
    </>
  );
  return href ? (
    <a
      href={href}
      className="flex items-start gap-2.5 rounded-lg px-1 py-0.5 transition hover:text-brand-700"
    >
      {inner}
    </a>
  ) : (
    <div className="flex items-start gap-2.5 px-1 py-0.5">{inner}</div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <dt className="text-[11.5px] font-medium text-ink-muted">{label}</dt>
      <dd className="truncate text-[12.5px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

const ICON = "h-4 w-4 shrink-0";
const iconProps = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
};

export function LeadProfileRail({
  lead,
  ownerName,
  lastContactAt,
}: {
  lead: LeadDetail;
  ownerName: string | null;
  lastContactAt: Date | null;
}) {
  const status = STATUS_TONE[lead.status];
  const priority = PRIORITY_TONE[lead.priority];
  const scorePct = Math.max(0, Math.min(100, lead.score));

  return (
    <aside className="space-y-4">
      <section className="rounded-2xl border border-ink/[0.06] bg-white p-5 shadow-card">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Kontaktdaten
        </p>
        <div className="mt-3 space-y-1.5">
          <ContactRow
            href={`tel:${lead.phone}`}
            value={lead.phone}
            icon={
              <svg className={ICON} {...iconProps}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.96.36 1.9.71 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.71A2 2 0 0 1 22 16.92Z" />
              </svg>
            }
          />
          <ContactRow
            href={`mailto:${lead.email}`}
            value={lead.email}
            icon={
              <svg className={ICON} {...iconProps}>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
            }
          />
          <ContactRow
            value={lead.city ?? "—"}
            icon={
              <svg className={ICON} {...iconProps}>
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-ink/[0.06] bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            Status & Förderung
          </p>
          <span className="text-[11px] font-semibold tabular-nums text-ink-muted">
            Score {lead.score}
          </span>
        </div>

        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-emerald-500"
            style={{ width: `${scorePct}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${status.pill}`}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${priority.pill}`}
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} />
            {priority.label}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
            {funnelStage(lead.status)}
          </span>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
            {fundingStatus(lead.status)}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-ink/[0.06] bg-white p-5 shadow-card">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          Zuständigkeit
        </p>
        <dl className="mt-2 divide-y divide-ink/[0.05]">
          <MetaRow label="Bearbeiter" value={ownerName ?? "Nicht zugewiesen"} />
          <MetaRow label="Quelle" value={humanizeSource(lead.source)} />
          <MetaRow label="Erstellt" value={DATE.format(lead.createdAt)} />
          <MetaRow
            label="Letzter Kontakt"
            value={lastContactAt ? DATE_TIME.format(lastContactAt) : "—"}
          />
          <MetaRow
            label="Nächste Aktion"
            value={lead.nextFollowUpAt ? DATE_TIME.format(lead.nextFollowUpAt) : "—"}
          />
        </dl>
      </section>
    </aside>
  );
}
