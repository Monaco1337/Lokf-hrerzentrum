/**
 * /crm/reporting — Reporting-Übersicht.
 *
 * Visualisierungsfokus statt Tabellenwüste: KPI-Karten, Trend-Sparklines,
 * Funnel-Bar, Quellen-Mix, SLA-Healthbar.  Verlinkt auf die Detail-Reports.
 *
 * Alle Werte stammen aus echten DB-Aggregaten (LeadKpisQuery + leadRepository).
 */
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { LeadStatus } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

const PERCENT = new Intl.NumberFormat("de-DE", {
  style: "percent",
  maximumFractionDigits: 1,
});

interface SourceBucket {
  source: string;
  total: number;
  won: number;
}

export default async function ReportingPage() {
  const currentUser = await requireCrmUser();
  if (!can(currentUser.role, "canViewAnalytics")) redirect("/crm");

  const since30 = new Date(Date.now() - 30 * 86400000);
  const [kpis, leads, dailyRows, sourceRows] = await Promise.all([
    leadRepository.aggregateKpis(),
    leadRepository.list({}),
    prisma.lead.findMany({
      where: { deletedAt: null, createdAt: { gte: since30 } },
      select: { createdAt: true },
    }),
    prisma.lead.groupBy({
      by: ["source", "status"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  // Daily new-leads sparkline (last 30 days)
  const buckets: number[] = Array(30).fill(0);
  const startBucket = new Date();
  startBucket.setHours(0, 0, 0, 0);
  startBucket.setDate(startBucket.getDate() - 29);
  for (const row of dailyRows) {
    const d = new Date(row.createdAt);
    d.setHours(0, 0, 0, 0);
    const idx = Math.floor((d.getTime() - startBucket.getTime()) / 86400000);
    if (idx >= 0 && idx < 30) buckets[idx]! += 1;
  }
  const maxBucket = Math.max(1, ...buckets);

  // Sources mix
  const sourceMap = new Map<string, SourceBucket>();
  const wonStatuses = new Set<string>([
    LeadStatus.GUTSCHEIN_APPROVED,
    LeadStatus.ENROLLED,
    LeadStatus.STARTED,
    LeadStatus.CLOSED,
  ]);
  for (const r of sourceRows) {
    const key = r.source ?? "unbekannt";
    const cur = sourceMap.get(key) ?? { source: key, total: 0, won: 0 };
    cur.total += r._count._all;
    if (wonStatuses.has(r.status)) cur.won += r._count._all;
    sourceMap.set(key, cur);
  }
  const topSources = Array.from(sourceMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const maxSource = topSources[0]?.total ?? 1;

  // SLA bar
  const activeLeads = leads.filter(
    (l) =>
      l.status !== LeadStatus.CLOSED &&
      l.status !== LeadStatus.LOST &&
      l.status !== LeadStatus.REJECTED,
  );
  const slaBreached = activeLeads.filter((l) => l.slaBreachedAt).length;
  const slaQuota =
    activeLeads.length === 0 ? 1 : 1 - slaBreached / activeLeads.length;

  // Funnel (compact)
  const totalFunnel =
    (kpis.byStatus[LeadStatus.NEW] ?? 0) +
    (kpis.byStatus[LeadStatus.QUALIFIED] ?? 0) +
    (kpis.byStatus[LeadStatus.HOT] ?? 0);
  const contactedFunnel =
    (kpis.byStatus[LeadStatus.CONTACTED] ?? 0) +
    (kpis.byStatus[LeadStatus.CALL_SCHEDULED] ?? 0) +
    (kpis.byStatus[LeadStatus.BRIEFING_SENT] ?? 0);
  const docsFunnel =
    (kpis.byStatus[LeadStatus.DOC_PENDING] ?? 0) +
    (kpis.byStatus[LeadStatus.DOC_READY] ?? 0);
  const aaFunnel =
    (kpis.byStatus[LeadStatus.AA_APPOINTMENT_PENDING] ?? 0) +
    (kpis.byStatus[LeadStatus.AA_APPOINTMENT_DONE] ?? 0);
  const voucherFunnel = kpis.gutscheinPending + kpis.gutscheinApproved;
  const startFunnel =
    (kpis.byStatus[LeadStatus.ENROLLED] ?? 0) +
    (kpis.byStatus[LeadStatus.STARTED] ?? 0) +
    (kpis.byStatus[LeadStatus.CLOSED] ?? 0);
  const funnel = [
    { key: "lead", label: "Lead", value: totalFunnel },
    { key: "kontakt", label: "Kontakt", value: contactedFunnel },
    { key: "doc", label: "Unterlagen", value: docsFunnel },
    { key: "aa", label: "AA-Termin", value: aaFunnel },
    { key: "gut", label: "Gutschein", value: voucherFunnel },
    { key: "start", label: "Start", value: startFunnel },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-eyebrow">Executive Control Center</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
            Geschäftsübersicht
          </h1>
          <p className="mt-1 max-w-2xl text-[12.5px] text-zinc-400">
            Pipeline, Fördervolumen, Ausbildungsstarts, Reaktionszeit und
            Quellenqualität auf einen Blick. Klicke ein Modul für Detail-Analyse.
          </p>
        </div>
      </header>

      {/* TOP KPIs */}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Abschlussquote"
          value={PERCENT.format(kpis.conversionRate)}
          hint={`${kpis.byStatus[LeadStatus.ENROLLED] + kpis.byStatus[LeadStatus.STARTED] + kpis.byStatus[LeadStatus.CLOSED]} gewonnen`}
          href={"/crm/reporting/conversion" as Route}
          tone="emerald"
        />
        <KpiCard
          label="Förderquote"
          value={PERCENT.format(kpis.foerderquote)}
          hint={`${kpis.gutscheinApproved} / ${voucherFunnel} Gutscheine`}
          href={"/crm/reporting/foerderquote" as Route}
          tone="emerald"
        />
        <KpiCard
          label="Reaktionszeit"
          value={PERCENT.format(slaQuota)}
          hint={`${slaBreached} SLA-Verletzungen`}
          href={"/crm/reporting/sla" as Route}
          tone={slaQuota >= 0.9 ? "emerald" : "red"}
        />
        <KpiCard
          label="Aktive Bewerber"
          value={String(activeLeads.length)}
          hint={`${kpis.unassigned} ohne Bearbeiter`}
          href={"/crm/reporting/pipeline" as Route}
          tone="blue"
        />
        <KpiCard
          label="Ausbildungsstarts"
          value={String(kpis.ausbildungsstartsMonth)}
          hint="diesen Monat"
          tone="emerald"
        />
        <KpiCard
          label="Ø Bearb.-Zeit"
          value={
            kpis.avgProcessingHours === null
              ? "—"
              : `${(kpis.avgProcessingHours / 24).toFixed(1)} d`
          }
          hint="bis Abschluss"
          tone="slate"
        />
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Daily new-leads trend */}
        <section className="rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4">
          <header className="flex items-end justify-between">
            <div>
              <p className="ops-eyebrow">Neue Leads · 30 Tage</p>
              <p className="text-[20px] font-bold text-white tabular-nums">
                {dailyRows.length}
              </p>
            </div>
            <p className="text-[11px] text-zinc-500">
              Ø {(dailyRows.length / 30).toFixed(1)} / Tag
            </p>
          </header>
          <div className="mt-3 flex h-32 items-end gap-[3px]">
            {buckets.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-orange-700/70 to-orange-400"
                style={{
                  height: `${Math.max(2, (v / maxBucket) * 100)}%`,
                  opacity: v === 0 ? 0.18 : 1,
                }}
                title={`${v}`}
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-600">
            vor 30T · heute
          </p>
        </section>

        {/* Funnel mini */}
        <section className="rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4">
          <header>
            <p className="ops-eyebrow">Abschluss-Funnel</p>
            <p className="text-[20px] font-bold text-white tabular-nums">
              {PERCENT.format(kpis.conversionRate)}{" "}
              <span className="text-[11px] font-medium text-zinc-400">
                Abschlussquote
              </span>
            </p>
          </header>
          <ol className="mt-3 space-y-2">
            {funnel.map((s) => {
              const pct = (s.value / funnelMax) * 100;
              return (
                <li key={s.key}>
                  <div className="flex items-baseline justify-between text-[11.5px]">
                    <span className="text-zinc-300">{s.label}</span>
                    <span className="tabular-nums text-white">{s.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.04]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-emerald-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
          <Link
            href={"/crm/reporting/conversion" as Route}
            className="ops-eyebrow mt-3 inline-block text-orange-300 hover:text-orange-200"
          >
            Voller Funnel →
          </Link>
        </section>
      </div>

      {/* Sources */}
      <section className="rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4">
        <header className="flex items-end justify-between">
          <div>
            <p className="ops-eyebrow">Quellen-Qualität</p>
            <p className="text-[20px] font-bold text-white">Top 6 Kanäle</p>
          </div>
          <p className="text-[11px] text-zinc-500">
            Won-Rate je Lead-Quelle
          </p>
        </header>
        <ul className="mt-3 space-y-2.5">
          {topSources.length === 0 && (
            <li className="text-[12px] text-zinc-500">Keine Quellen erfasst.</li>
          )}
          {topSources.map((s) => {
            const wonRate = s.total === 0 ? 0 : s.won / s.total;
            return (
              <li key={s.source}>
                <div className="flex items-baseline justify-between text-[12.5px]">
                  <span className="font-semibold text-white">{s.source}</span>
                  <span className="tabular-nums text-zinc-400">
                    {s.total} Leads · {s.won} won · {PERCENT.format(wonRate)}
                  </span>
                </div>
                <div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-white/[0.04]">
                  <div
                    className="h-full bg-emerald-500/80"
                    style={{ width: `${(s.won / maxSource) * 100}%` }}
                  />
                  <div
                    className="h-full bg-zinc-700/80"
                    style={{
                      width: `${((s.total - s.won) / maxSource) * 100}%`,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  href,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  href?: Route;
  tone: "emerald" | "orange" | "red" | "blue" | "slate";
}) {
  const accent = {
    emerald: "text-emerald-300",
    orange: "text-orange-300",
    red: "text-red-300",
    blue: "text-blue-300",
    slate: "text-zinc-200",
  }[tone];
  const inner = (
    <div className="rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-3.5 transition hover:border-white/[0.16] hover:bg-[#161618]">
      <p className="ops-eyebrow">{label}</p>
      <p className={`mt-1 text-[22px] font-bold leading-none tabular-nums ${accent}`}>
        {value}
      </p>
      <p className="mt-1 text-[10.5px] text-zinc-500">{hint}</p>
    </div>
  );
  if (href) {
    return (
      <li>
        <Link href={href} className="block">
          {inner}
        </Link>
      </li>
    );
  }
  return <li>{inner}</li>;
}
