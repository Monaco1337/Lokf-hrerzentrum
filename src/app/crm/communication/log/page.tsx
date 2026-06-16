import Link from "next/link";
import type { Route } from "next";

import { requireCrmUser } from "@/server/actions/_helpers";
import { automationLogRepository } from "@/server/repositories/AutomationLogRepository";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { tone: string; label: string }> = {
  SENT: { tone: "bg-accent-50 text-accent-900 ring-accent-200", label: "Versendet" },
  FAILED: { tone: "bg-rose-50 text-rose-700 ring-rose-200", label: "Fehlgeschlagen" },
  SKIPPED: { tone: "bg-slate-100 text-slate-700 ring-slate-200", label: "Übersprungen" },
  SKIPPED_MISSING_PROVIDER_CONFIG: {
    tone: "bg-slate-100 text-slate-700 ring-slate-200",
    label: "Kein Provider",
  },
  SKIPPED_NO_CONSENT: {
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
    label: "Kein Consent",
  },
};

export default async function CommunicationLogPage() {
  const currentUser = await requireCrmUser();
  const scoped = applyScope({}, currentUser);
  const [logs, scopedLeads] = await Promise.all([
    automationLogRepository.listRecent(100),
    leadRepository.list(scoped),
  ]);

  const allowedLeadIds = new Set(scopedLeads.map((l) => l.id));
  const leadName = new Map(
    scopedLeads.map((l) => [l.id, `${l.firstName} ${l.lastName}`]),
  );

  const filtered = logs.filter((l) => allowedLeadIds.has(l.leadId));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Kommunikation
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-950">
          Versandprotokolle
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Jeder Automations-Versand wird hier protokolliert — Erfolg,
          Übersprungen, Fehlversuch. Wichtig für Compliance &amp; Debugging.
        </p>
      </header>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-10 text-center text-[13.5px] text-ink-soft">
          Noch keine Versand-Einträge im Scope.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
          <table className="w-full text-[13px]">
            <thead className="bg-surface-subtle/60 text-[11px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold">Zeitpunkt</th>
                <th className="px-4 py-2.5 text-left font-semibold">Lead</th>
                <th className="px-4 py-2.5 text-left font-semibold">Kanal</th>
                <th className="px-4 py-2.5 text-left font-semibold">Trigger</th>
                <th className="px-4 py-2.5 text-left font-semibold">Status</th>
                <th className="px-4 py-2.5 text-left font-semibold">Betreff / Inhalt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {filtered.map((row) => {
                const style =
                  STATUS_STYLE[row.status] ?? STATUS_STYLE.SKIPPED!;
                return (
                  <tr key={row.id}>
                    <td className="px-4 py-2.5 text-ink-soft">
                      {row.createdAt.toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/crm/leads/${row.leadId}` as Route}
                        className="text-brand-700 hover:underline"
                      >
                        {leadName.get(row.leadId) ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-medium">{row.channel}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{row.trigger}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                          style.tone,
                        ].join(" ")}
                      >
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">
                      <span className="line-clamp-1">
                        {row.renderedSubject ?? row.renderedBody.slice(0, 100)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
