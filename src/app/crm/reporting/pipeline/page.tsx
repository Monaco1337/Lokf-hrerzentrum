import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { LeadStatus } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Partial<Record<LeadStatus, string>> = {
  NEW: "Neu eingegangen",
  QUALIFIED: "Qualifiziert",
  HOT: "Hot",
  CONTACT_PENDING: "Kontakt geplant",
  CONTACTED: "Kontakt hergestellt",
  CALL_SCHEDULED: "Termin geplant",
  BRIEFING_SENT: "Briefing versendet",
  DOC_PENDING: "Unterlagen offen",
  DOC_READY: "Unterlagen erhalten",
  AA_APPOINTMENT_PENDING: "AA-Termin offen",
  AA_APPOINTMENT_DONE: "AA-Termin geführt",
  GUTSCHEIN_PENDING: "Gutschein beantragt",
  GUTSCHEIN_APPROVED: "Gutschein bewilligt",
  ENROLLED: "Eingeschrieben",
  STARTED: "Ausbildungsstart",
  CLOSED: "Abgeschlossen",
  LOST: "Verloren",
  REJECTED: "Abgelehnt",
  BLOCKED: "Blockiert",
};

export default async function PipelineReportPage() {
  const currentUser = await requireCrmUser();
  if (!can(currentUser.role, "canViewAnalytics")) redirect("/crm");

  const leads = await leadRepository.list({});
  const total = leads.length;

  const buckets = new Map<LeadStatus, number>();
  for (const l of leads) {
    buckets.set(l.status, (buckets.get(l.status) ?? 0) + 1);
  }

  const ordered = (Object.keys(STATUS_LABEL) as LeadStatus[])
    .map((s) => ({
      status: s,
      label: STATUS_LABEL[s] ?? s,
      count: buckets.get(s) ?? 0,
    }))
    .filter((row) => row.count > 0);

  const maxCount = Math.max(...ordered.map((r) => r.count), 1);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Reporting
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-950">
          Pipeline-Analyse
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Verteilung aller Leads über alle Pipeline-Stufen. {total} Leads im
          Bestand.
        </p>
      </header>

      <section className="space-y-1.5 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
        {ordered.map((row) => {
          const pct = Math.round((row.count / maxCount) * 100);
          return (
            <div key={row.status}>
              <div className="flex items-center justify-between text-[12.5px]">
                <span className="text-navy-950">{row.label}</span>
                <span className="text-ink-soft">{row.count}</span>
              </div>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-700 to-accent-600"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
