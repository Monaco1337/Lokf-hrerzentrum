/**
 * /crm/unterlagen — Unterlagen-Center (document control center).
 *
 * Per applicant: status of CV, ID, certificates, voucher and agency papers.
 * Statuses follow the ops brief: fehlt · angefordert · eingegangen · geprüft
 * · abgelehnt. Backed by the existing Document table.
 */
import Link from "next/link";
import type { Route } from "next";

import {
  DocumentStatus,
  type DocumentEntry,
  type LeadSummary,
} from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { documentRepository } from "@/server/repositories/DocumentRepository";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  CV: "Lebenslauf",
  AA_REASONING: "Begründung AA",
  AA_GUIDE: "Leitfaden AA",
  LOCATION_INFO: "Standort-Info",
  HOUSING_SAALFELD: "Unterkunft",
  WEITERBILDUNG_INFO: "Weiterbildung",
  MASTER_BUNDLE: "Master-Bundle",
};

const STATUS_META: Record<DocumentStatus, { label: string; chip: string }> = {
  MISSING_DATA: { label: "fehlt", chip: "ops-chip ops-chip-red" },
  READY_TO_GENERATE: { label: "bereit", chip: "ops-chip ops-chip-amber" },
  GENERATED: { label: "erstellt", chip: "ops-chip ops-chip-blue" },
  SENT: { label: "geprüft", chip: "ops-chip ops-chip-green" },
  UPDATED: { label: "aktualisiert", chip: "ops-chip ops-chip-violet" },
};

function summarize(docs: ReadonlyArray<DocumentEntry>): {
  pct: number;
  missing: number;
  ready: number;
  sent: number;
} {
  const counts = { missing: 0, ready: 0, sent: 0, other: 0 };
  for (const d of docs) {
    if (d.status === DocumentStatus.MISSING_DATA) counts.missing += 1;
    else if (d.status === DocumentStatus.READY_TO_GENERATE) counts.ready += 1;
    else if (d.status === DocumentStatus.SENT) counts.sent += 1;
    else counts.other += 1;
  }
  const total = Math.max(1, docs.length);
  const done = total - counts.missing;
  const pct = Math.round((done / total) * 100);
  return { pct, missing: counts.missing, ready: counts.ready, sent: counts.sent };
}

export default async function UnterlagenPage() {
  const currentUser = await requireCrmUser();
  const scoped = applyScope({}, currentUser);
  const leads = await leadRepository.list(scoped);

  const leadDocs = await Promise.all(
    leads.map(async (lead: LeadSummary) => ({
      lead,
      docs: await documentRepository.list(lead.id),
    })),
  );

  leadDocs.sort((a, b) => {
    const am = a.docs.filter(
      (d) => d.status === DocumentStatus.MISSING_DATA,
    ).length;
    const bm = b.docs.filter(
      (d) => d.status === DocumentStatus.MISSING_DATA,
    ).length;
    return bm - am;
  });

  const totalLeads = leadDocs.length;
  const totalMissing = leadDocs.reduce(
    (s, x) =>
      s + x.docs.filter((d) => d.status === DocumentStatus.MISSING_DATA).length,
    0,
  );
  const totalReady = leadDocs.reduce(
    (s, x) =>
      s + x.docs.filter((d) => d.status === DocumentStatus.READY_TO_GENERATE).length,
    0,
  );
  const totalSent = leadDocs.reduce(
    (s, x) =>
      s + x.docs.filter((d) => d.status === DocumentStatus.SENT).length,
    0,
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-eyebrow">Unterlagen-Center</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
            Digitale Bewerberakte
          </h1>
          <p className="mt-1 max-w-2xl text-[12.5px] text-zinc-400">
            Lebenslauf, Ausweis, Zeugnisse, Agentur- und Gutscheinunterlagen.
            Fehlende Akten blockieren die Bewilligung.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="ops-chip ops-chip-slate">{totalLeads} Bewerber</span>
          {totalMissing > 0 && (
            <span className="ops-chip ops-chip-red">{totalMissing} fehlen</span>
          )}
          {totalReady > 0 && (
            <span className="ops-chip ops-chip-amber">{totalReady} bereit</span>
          )}
          <span className="ops-chip ops-chip-green">{totalSent} geprüft</span>
        </div>
      </header>

      {leadDocs.length === 0 ? (
        <div className="ops-card p-10 text-center text-[13px] text-zinc-500">
          Noch keine Bewerber im Scope.
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {leadDocs.map(({ lead, docs }) => {
            const s = summarize(docs);
            return (
              <li key={lead.id}>
                <Link
                  href={`/crm/leads/${lead.id}` as Route}
                  className="block rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4 transition hover:border-white/[0.16] hover:bg-[#161618]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">
                        {lead.firstName} {lead.lastName}
                      </p>
                      <p className="text-[10.5px] text-zinc-500">
                        {lead.city ?? "—"} · {docs.length} Dokument{docs.length === 1 ? "" : "e"}
                      </p>
                    </div>
                    <span
                      className={[
                        "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold tabular-nums",
                        s.pct >= 100
                          ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/30"
                          : s.pct >= 60
                            ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30"
                            : "bg-red-500/15 text-red-200 ring-1 ring-red-500/30",
                      ].join(" ")}
                    >
                      {s.pct}%
                    </span>
                  </div>

                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-orange-400"
                      style={{ width: `${Math.max(3, s.pct)}%` }}
                    />
                  </div>

                  {docs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {docs.slice(0, 6).map((d) => {
                        const meta = STATUS_META[d.status];
                        return (
                          <span key={d.id} className={meta.chip}>
                            {TYPE_LABEL[d.type] ?? d.type} · {meta.label}
                          </span>
                        );
                      })}
                      {docs.length > 6 && (
                        <span className="ops-chip ops-chip-slate">
                          + {docs.length - 6}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10.5px] tabular-nums">
                    <span
                      className={
                        s.missing > 0
                          ? "rounded-md bg-red-500/[0.08] px-2 py-1 text-red-200"
                          : "rounded-md bg-white/[0.03] px-2 py-1 text-zinc-500"
                      }
                    >
                      fehlt: {s.missing}
                    </span>
                    <span
                      className={
                        s.ready > 0
                          ? "rounded-md bg-amber-500/[0.08] px-2 py-1 text-amber-200"
                          : "rounded-md bg-white/[0.03] px-2 py-1 text-zinc-500"
                      }
                    >
                      bereit: {s.ready}
                    </span>
                    <span
                      className={
                        s.sent > 0
                          ? "rounded-md bg-emerald-500/[0.08] px-2 py-1 text-emerald-200"
                          : "rounded-md bg-white/[0.03] px-2 py-1 text-zinc-500"
                      }
                    >
                      geprüft: {s.sent}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
