/**
 * /crm/bildungsgutschein — Bildungsgutschein-Center.
 *
 * Real-data status board: every applicant whose journey involves a voucher
 * is grouped into one of six buckets that match the operations brief.
 * No mocks — counts come from the same Lead table the rest of the system
 * uses, filtered by status.
 */
import Link from "next/link";
import type { Route } from "next";

import { LeadStatus, type LeadSummary } from "@/features/fairtrain-funnel/types";
import { LeadStageSelect, type StageOption } from "@/features/fairtrain-funnel/crm/operations/LeadStageSelect";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

/** Förder-Stufen → repräsentativer LeadStatus (treibt die Bucket-Zuordnung). */
const FUNDING_STAGES: ReadonlyArray<StageOption> = [
  { value: LeadStatus.CONTACTED, label: "Nicht besprochen" },
  { value: LeadStatus.QUALIFIED, label: "Geeignet" },
  { value: LeadStatus.DOC_READY, label: "Antrag vorbereitet" },
  { value: LeadStatus.AA_APPOINTMENT_PENDING, label: "Agenturtermin offen" },
  { value: LeadStatus.GUTSCHEIN_PENDING, label: "Beantragt" },
  { value: LeadStatus.GUTSCHEIN_APPROVED, label: "Bewilligt" },
];

interface Bucket {
  key: string;
  label: string;
  hint: string;
  statuses: ReadonlyArray<LeadStatus>;
  tone: "blue" | "amber" | "orange" | "violet" | "emerald" | "red";
}

const BUCKETS: ReadonlyArray<Bucket> = [
  {
    key: "discussion",
    label: "Nicht besprochen",
    hint: "Förderfähigkeit muss noch geklärt werden",
    statuses: [LeadStatus.NEW, LeadStatus.CONTACT_PENDING, LeadStatus.CONTACTED],
    tone: "blue",
  },
  {
    key: "eligible",
    label: "Geeignet",
    hint: "Förderfähig — Antrag vorbereiten",
    statuses: [LeadStatus.QUALIFIED, LeadStatus.HOT, LeadStatus.BRIEFING_SENT],
    tone: "violet",
  },
  {
    key: "prepared",
    label: "Antrag vorbereitet",
    hint: "Unterlagen vollständig, bereit für Agentur",
    statuses: [LeadStatus.DOC_READY],
    tone: "amber",
  },
  {
    key: "appointment",
    label: "Agenturtermin offen",
    hint: "Termin steht — Vorbereitung sichern",
    statuses: [LeadStatus.AA_APPOINTMENT_PENDING, LeadStatus.AA_APPOINTMENT_DONE],
    tone: "orange",
  },
  {
    key: "pending",
    label: "Beantragt",
    hint: "Antrag liegt bei der Agentur",
    statuses: [LeadStatus.GUTSCHEIN_PENDING],
    tone: "amber",
  },
  {
    key: "approved",
    label: "Bewilligt",
    hint: "Förderung gesichert — Anmeldung anstossen",
    statuses: [LeadStatus.GUTSCHEIN_APPROVED],
    tone: "emerald",
  },
];

const TONE_CLS = {
  blue: { dot: "bg-blue-500", border: "border-blue-500/30", text: "text-blue-300" },
  amber: { dot: "bg-amber-500", border: "border-amber-500/30", text: "text-amber-300" },
  orange: { dot: "bg-orange-500", border: "border-orange-500/30", text: "text-orange-300" },
  violet: { dot: "bg-violet-500", border: "border-violet-500/30", text: "text-violet-300" },
  emerald: { dot: "bg-emerald-500", border: "border-emerald-500/30", text: "text-emerald-300" },
  red: { dot: "bg-red-500", border: "border-red-500/30", text: "text-red-300" },
} as const;

const DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
});

const STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "Neu",
  QUALIFIED: "Qualifiziert",
  HOT: "Heiß",
  CONTACT_PENDING: "Kontakt offen",
  CONTACTED: "Kontaktiert",
  REPLIED: "Antwort erhalten",
  FORWARDED: "Weitergeleitet",
  LANDINGPAGE_OPENED: "Landingpage geöffnet",
  FUNNEL_STARTED: "Funnel gestartet",
  FUNNEL_COMPLETED: "Funnel abgeschlossen",
  CALL_SCHEDULED: "Telefonat geplant",
  BRIEFING_SENT: "Briefing versendet",
  DOC_PENDING: "Unterlagen offen",
  DOC_READY: "Unterlagen vollständig",
  AA_APPOINTMENT_PENDING: "AA-Termin offen",
  AA_APPOINTMENT_DONE: "AA-Termin erledigt",
  GUTSCHEIN_PENDING: "Beantragt",
  GUTSCHEIN_APPROVED: "Bewilligt",
  ENROLLED: "Vertrag unterzeichnet",
  STARTED: "Weiterbildung läuft",
  CLOSED: "Abgeschlossen",
  LOST: "Verloren",
  REJECTED: "Abgelehnt",
  BLOCKED: "Blockiert",
};

export default async function BildungsgutscheinPage() {
  const user = await requireCrmUser();
  const scope = applyScope({}, user);
  const all = await leadRepository.list(scope);

  // Group leads
  const grouped = new Map<string, LeadSummary[]>();
  for (const b of BUCKETS) grouped.set(b.key, []);
  for (const lead of all) {
    const bucket = BUCKETS.find((b) => b.statuses.includes(lead.status));
    if (bucket) grouped.get(bucket.key)!.push(lead);
  }

  const total = BUCKETS.reduce(
    (sum, b) => sum + (grouped.get(b.key)?.length ?? 0),
    0,
  );
  const pending = grouped.get("pending")?.length ?? 0;
  const approved = grouped.get("approved")?.length ?? 0;
  const blocked = all.filter((l) => l.status === LeadStatus.BLOCKED).length;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-eyebrow">Bildungsgutschein-Center</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
            {total} Bewerber im Förder-Funnel
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="ops-chip ops-chip-amber">{pending} laufend</span>
          <span className="ops-chip ops-chip-green">{approved} bewilligt</span>
          {blocked > 0 && (
            <span className="ops-chip ops-chip-red">{blocked} blockiert</span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {BUCKETS.map((b) => {
          const leads = grouped.get(b.key) ?? [];
          const tone = TONE_CLS[b.tone];
          return (
            <section
              key={b.key}
              className={`ops-card border-t-2 ${tone.border}`}
            >
              <header className="flex items-end justify-between gap-2 px-4 pt-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                      {b.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[10.5px] text-zinc-500">{b.hint}</p>
                </div>
                <span className={`text-[28px] font-bold leading-none tabular-nums ${tone.text}`}>
                  {leads.length}
                </span>
              </header>
              <div className="mt-3 max-h-64 divide-y divide-white/[0.05] border-t border-white/[0.05] overflow-y-auto">
                {leads.length === 0 && (
                  <p className="px-4 py-6 text-center text-[11px] text-zinc-600">
                    Niemand in diesem Status.
                  </p>
                )}
                {leads.slice(0, 12).map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between gap-2 px-4 py-2 transition hover:bg-white/[0.03]"
                  >
                    <Link href={`/crm/leads/${l.id}` as Route} className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-white">
                        {l.firstName} {l.lastName}
                      </p>
                      <p className="text-[10.5px] text-zinc-500">
                        {STATUS_LABEL[l.status]} · aktualisiert {DATE.format(l.updatedAt)}
                      </p>
                    </Link>
                    {l.slaBreachedAt && (
                      <span className="ops-chip ops-chip-red shrink-0">SLA</span>
                    )}
                    <LeadStageSelect
                      leadId={l.id}
                      current={l.status}
                      options={FUNDING_STAGES}
                      reason="Förderstatus aktualisiert"
                    />
                  </div>
                ))}
                {leads.length > 12 && (
                  <p className="px-4 py-2 text-[10.5px] text-zinc-500">
                    + {leads.length - 12} weitere
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
