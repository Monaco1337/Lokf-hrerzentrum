import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { StatusPill } from "@/features/fairtrain-funnel/crm/StatusPill";
import { LeadStatus } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";

export const dynamic = "force-dynamic";

function hoursBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / 3600000);
}

export default async function SlaReportPage() {
  const currentUser = await requireCrmUser();
  if (!can(currentUser.role, "canViewAnalytics")) redirect("/crm");

  const leads = await leadRepository.list({});
  const active = leads.filter(
    (l) =>
      l.status !== LeadStatus.CLOSED &&
      l.status !== LeadStatus.LOST &&
      l.status !== LeadStatus.REJECTED,
  );

  const breached = active.filter((l) => l.slaBreachedAt !== null);
  const compliant = active.length - breached.length;
  const compliantPct =
    active.length === 0 ? 100 : Math.round((compliant / active.length) * 100);

  const longestBreaches = breached
    .map((l) => ({
      lead: l,
      hours: hoursBetween(l.slaBreachedAt!, new Date()),
    }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Reporting
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-950">SLA-Analyse</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Service-Level für die Erstkontakt-Frist auf Hot-Leads — Einhaltung,
          Verletzungen und stehenbleibende Vorgänge.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <KpiCard label="SLA-Einhaltung" value={`${compliantPct} %`} tone="accent" />
        <KpiCard label="Verletzungen" value={String(breached.length)} tone="rose" />
        <KpiCard
          label="Aktive Leads im Scope"
          value={String(active.length)}
          tone="brand"
        />
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
        <h2 className="text-[13.5px] font-semibold text-navy-950">
          Älteste Verletzungen
        </h2>
        {longestBreaches.length === 0 ? (
          <p className="mt-3 rounded-lg bg-accent-50/60 px-3 py-3 text-[12.5px] text-accent-900">
            Aktuell keine SLA-Verletzungen — solides Tempo.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {longestBreaches.map((row) => (
              <li key={row.lead.id}>
                <Link
                  href={`/crm/leads/${row.lead.id}` as Route}
                  className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/30 px-3 py-2 transition hover:bg-rose-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-navy-950">
                      {row.lead.firstName} {row.lead.lastName}
                    </p>
                    <p className="text-[11.5px] text-rose-700">
                      Frist überschritten seit{" "}
                      {row.hours < 24
                        ? `${Math.round(row.hours)} Std.`
                        : `${(row.hours / 24).toFixed(1)} Tagen`}
                    </p>
                  </div>
                  <StatusPill status={row.lead.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "brand" | "accent" | "rose";
}) {
  const accent =
    tone === "rose"
      ? "before:bg-rose-500"
      : tone === "accent"
        ? "before:bg-accent-600"
        : "before:bg-brand-700";
  return (
    <article
      className={[
        "relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-5 shadow-sm",
        "before:absolute before:left-0 before:top-0 before:h-full before:w-[3px]",
        accent,
      ].join(" ")}
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold text-navy-950">{value}</p>
    </article>
  );
}
