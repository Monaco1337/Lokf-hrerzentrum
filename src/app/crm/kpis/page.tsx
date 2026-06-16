import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { LeadStatus } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { applyScope } from "@/server/services/LeadAccess";
import { salesAnalyticsService } from "@/server/services/SalesAnalyticsService";

export const dynamic = "force-dynamic";

interface Kpi {
  label: string;
  value: string;
  hint: string;
  tone?: "accent" | "brand" | "amber" | "rose" | "indigo";
}

function fmtPct(n: number): string {
  return `${Math.round(n * 100)} %`;
}

function fmtHours(n: number | null): string {
  if (n == null) return "—";
  if (n < 24) return `${Math.round(n)} h`;
  return `${(n / 24).toFixed(1)} Tage`;
}

export default async function KpisPage() {
  const currentUser = await requireCrmUser();
  if (!can(currentUser.role, "canViewAnalytics")) redirect("/crm");

  const scoped = applyScope({}, currentUser);
  const [kpis, pulse, leads] = await Promise.all([
    leadRepository.aggregateKpis(),
    salesAnalyticsService.snapshot(),
    leadRepository.list(scoped),
  ]);

  const hot = leads.filter((l) => l.priority === "HOT").length;
  const warm = leads.filter((l) => l.priority === "WARM").length;
  const cold = leads.filter((l) => l.priority === "COLD").length;
  const blocked = leads.filter((l) => l.priority === "BLOCKED").length;

  const operational: Kpi[] = [
    {
      label: "Leads gesamt",
      value: String(kpis.total),
      hint: "Im Scope sichtbar (rollenabhängig)",
    },
    {
      label: "Neu heute",
      value: String(kpis.newToday),
      hint: "In den letzten 24 Stunden eingegangen",
      tone: "accent",
    },
    {
      label: "Hot Leads",
      value: String(kpis.hot),
      hint: "Höchste Priorität",
      tone: "rose",
    },
    {
      label: "SLA verletzt",
      value: String(kpis.slaBreached),
      hint: "Antwortfrist überschritten",
      tone: "rose",
    },
    {
      label: "Folgekontakte offen",
      value: String(kpis.followUpsOpen),
      hint: "Rückrufe in Wartestellung",
      tone: "amber",
    },
    {
      label: "Unterlagen offen",
      value: String(kpis.docsOpen),
      hint: "Fehlende oder unvollständige Akten",
      tone: "amber",
    },
    {
      label: "Gutscheine in Bearbeitung",
      value: String(kpis.gutscheinPending),
      hint: "Antrag bei AA gestellt",
      tone: "indigo",
    },
    {
      label: "Gutscheine bewilligt",
      value: String(kpis.gutscheinApproved),
      hint: "Förderzusage erteilt",
      tone: "accent",
    },
    {
      label: "Conversion-Rate",
      value: fmtPct(kpis.conversionRate),
      hint: "Lead → Gutschein/Abschluss",
      tone: "brand",
    },
    {
      label: "Förderquote",
      value: fmtPct(kpis.foerderquote),
      hint: "Anteil bewilligter Gutschein-Anträge",
      tone: "brand",
    },
    {
      label: "Ø Bearbeitungszeit",
      value: fmtHours(kpis.avgProcessingHours),
      hint: "Vom Eingang bis Abschluss (30 Tage)",
    },
    {
      label: "Starts (Monat)",
      value: String(kpis.ausbildungsstartsMonth),
      hint: "Ausbildungsstarts diesen Monat",
      tone: "accent",
    },
    {
      label: "Unzugewiesen",
      value: String(kpis.unassigned),
      hint: "Ohne verantwortlichen Operator",
      tone: "amber",
    },
  ];

  const team: Kpi[] = [
    {
      label: "Anrufe heute",
      value: String(pulse.callsToday),
      hint: "Über alle Operatoren",
      tone: "brand",
    },
    {
      label: "Anrufe diese Woche",
      value: String(pulse.callsThisWeek),
      hint: "Rolliertes 7-Tage-Fenster",
    },
    {
      label: "Aktivitäten heute",
      value: String(pulse.activitiesToday),
      hint: "Audit-Events (alle Aktionen)",
    },
    {
      label: "Aktivitäten diese Woche",
      value: String(pulse.activitiesThisWeek),
      hint: "Audit-Events (7 Tage)",
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-950">Kennzahlen</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Operative und vertriebliche Eckdaten — aggregiert in Echtzeit über
          den von dir einsehbaren Lead-Bestand.
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Pipeline & Funnel
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {operational.map((k) => (
            <KpiCard key={k.label} kpi={k} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Team & Vertrieb
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {team.map((k) => (
            <KpiCard key={k.label} kpi={k} />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <h3 className="text-[13.5px] font-semibold text-navy-950">
            Priorität (sichtbarer Bestand)
          </h3>
          <ul className="mt-3 space-y-2">
            {[
              { label: "Hot", count: hot, tone: "bg-rose-500" },
              { label: "Warm", count: warm, tone: "bg-amber-500" },
              { label: "Cold", count: cold, tone: "bg-slate-400" },
              { label: "Blockiert", count: blocked, tone: "bg-ink-muted" },
            ].map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full ${row.tone}`}
                  />
                  {row.label}
                </span>
                <span className="text-[13px] font-semibold text-navy-950">
                  {row.count}
                </span>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <h3 className="text-[13.5px] font-semibold text-navy-950">
            Top-Partner (7 Tage)
          </h3>
          <ul className="mt-3 space-y-2">
            {pulse.topPartners.length === 0 ? (
              <li className="rounded-lg bg-surface-subtle/60 px-3 py-3 text-[12px] text-ink-muted">
                Noch keine dokumentierten Anrufe in diesem Zeitraum.
              </li>
            ) : (
              pulse.topPartners.map((p) => (
                <li
                  key={p.user.id}
                  className="flex items-center justify-between"
                >
                  <span className="text-[13px] font-medium text-navy-950">
                    {p.user.name}
                  </span>
                  <span className="text-[12px] text-ink-soft">
                    {p.callsThisWeek} Anrufe
                  </span>
                </li>
              ))
            )}
          </ul>
        </article>
      </section>

      {/* Use byStatus by rendering a compact funnel strip below */}
      <section className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <h3 className="text-[13.5px] font-semibold text-navy-950">
          Pipeline-Verteilung
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(kpis.byStatus)
            .filter(([, v]) => v > 0)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1.5 rounded-full bg-surface-subtle/70 px-2.5 py-1 text-[11.5px] font-medium text-ink-soft ring-1 ring-inset ring-ink/10"
              >
                {LeadStatus[k as keyof typeof LeadStatus] ?? k}
                <span className="rounded-full bg-white px-1.5 text-[11px] font-semibold text-navy-950 ring-1 ring-inset ring-ink/10">
                  {v as number}
                </span>
              </span>
            ))}
        </div>
      </section>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const accentLine =
    kpi.tone === "rose"
      ? "before:bg-rose-500"
      : kpi.tone === "amber"
        ? "before:bg-amber-500"
        : kpi.tone === "accent"
          ? "before:bg-accent-600"
          : kpi.tone === "brand"
            ? "before:bg-brand-700"
            : kpi.tone === "indigo"
              ? "before:bg-indigo-500"
              : "before:bg-ink/15";
  return (
    <article
      className={[
        "relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-4 shadow-sm",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]",
        accentLine,
      ].join(" ")}
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {kpi.label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-navy-950">{kpi.value}</p>
      <p className="mt-1 text-[11.5px] text-ink-muted">{kpi.hint}</p>
    </article>
  );
}
