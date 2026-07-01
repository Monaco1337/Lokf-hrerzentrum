"use client";
/**
 * AutomationAdmin — three-tab shell for the automation centre.
 *
 * Tabs: Vorlagen | Automationen | Verlauf
 * Stats row at the top derived from the data passed by the server component.
 */
import Link from "next/link";
import { useState } from "react";

import type {
  AutomationLogEntry,
  AutomationRuleEntry,
  AutomationRunLogEntry,
  AutomationTemplateEntry,
} from "../types";
import { AutomationStatusBadge } from "./AutomationStatusBadge";
import { RulesManager } from "./automation/RulesManager";
import { TemplateManager } from "./automation/TemplateManager";
import type { PreviewLead } from "./automation/TemplateEditorModal";
import { channelLabel } from "./leadLabels";

type Tab = "templates" | "rules" | "logs";

interface Props {
  templates: AutomationTemplateEntry[];
  rules: AutomationRuleEntry[];
  logs: AutomationLogEntry[];
  runLogs: AutomationRunLogEntry[];
  previewLeads: PreviewLead[];
  users: Array<{ id: string; name: string }>;
}

export function AutomationAdmin({ templates, rules, logs, runLogs, previewLeads, users }: Props) {
  const [tab, setTab] = useState<Tab>("templates");

  const activeTemplates = templates.filter((t) => t.status === "active").length;
  const activeRules     = rules.filter((r) => r.status === "active").length;
  const sentToday       = logs.filter((l) => {
    const d = new Date(l.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString() && l.status === "SENT";
  }).length;

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <header>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
          Kommunikations-Zentrum
        </p>
        <h1 className="mt-1 font-display text-[22px] font-bold tracking-tight text-navy-950 sm:text-[26px]">
          Vorlagen &amp; Automationen
        </h1>
        <p className="mt-1 max-w-2xl text-[12.5px] text-ink-muted">
          Nachrichten-Vorlagen verwalten und automatische Workflows einrichten —
          im Demo-Modus vollständig simuliert, ohne externe API-Zugriffe.
        </p>
      </header>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <StatTile
          label="Aktive Vorlagen"
          value={activeTemplates}
          sub={`von ${templates.length} gesamt`}
          tone="emerald"
        />
        <StatTile
          label="Aktive Automationen"
          value={activeRules}
          sub={`von ${rules.length} gesamt`}
          tone="indigo"
        />
        <StatTile
          label="Sends heute"
          value={sentToday}
          sub={`${logs.length} insgesamt`}
          tone="brand"
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="inline-flex rounded-xl bg-surface-subtle p-1 ring-1 ring-ink/[0.05]">
        {(["templates", "rules", "logs"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              "rounded-lg px-4 py-1.5 text-sm font-semibold transition",
              tab === t
                ? "bg-white text-navy-950 shadow-sm ring-1 ring-ink/[0.05]"
                : "text-ink-muted hover:text-ink",
            ].join(" ")}
          >
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {/* ── Tab panels ──────────────────────────────────────────────────────── */}
      {tab === "templates" ? (
        <TemplateManager templates={templates} previewLeads={previewLeads} />
      ) : tab === "rules" ? (
        <RulesManager
          rules={rules}
          templates={templates}
          users={users}
          previewLeads={previewLeads}
          runLogs={runLogs}
        />
      ) : (
        <LogsView logs={logs} runLogs={runLogs} />
      )}
    </div>
  );
}

// ── StatTile ──────────────────────────────────────────────────────────────────

const TONE_CLS = {
  emerald: { icon: "bg-emerald-50 text-emerald-600", value: "text-emerald-700" },
  indigo:  { icon: "bg-indigo-50  text-indigo-600",  value: "text-indigo-700"  },
  brand:   { icon: "bg-brand-50   text-brand-600",   value: "text-navy-950"    },
};

function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number;
  sub: string;
  tone: keyof typeof TONE_CLS;
}) {
  const cls = TONE_CLS[tone];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink/[0.08] bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${cls.icon}`}>
        {value}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-semibold text-navy-950">{label}</p>
        <p className="text-[11.5px] text-ink-muted">{sub}</p>
      </div>
    </div>
  );
}

const TAB_LABEL: Record<Tab, string> = {
  templates: "Vorlagen",
  rules: "Automationen",
  logs: "Verlauf",
};

// ── LogsView ──────────────────────────────────────────────────────────────────

function LogsView({
  logs,
  runLogs,
}: {
  logs: AutomationLogEntry[];
  runLogs: AutomationRunLogEntry[];
}) {
  return (
    <div className="space-y-6">
      {/* Automatic sends */}
      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-ink">Automatische Sends</h2>
        {logs.length === 0 ? (
          <EmptyState text="Noch keine automatischen Nachrichten versendet." />
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-ink/[0.05]">
            {logs.map((log, i) => (
              <li
                key={log.id}
                className={[
                  "flex flex-wrap items-center justify-between gap-3 px-5 py-3",
                  i > 0 ? "border-t border-ink/[0.05]" : "",
                ].join(" ")}
              >
                <div>
                  <p className="text-[13.5px] font-medium text-ink">
                    {channelLabel(log.channel)}
                    {log.isTest ? (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Test</span>
                    ) : null}
                  </p>
                  <p className="text-[11.5px] text-ink-muted">{log.createdAt.toLocaleString("de-DE")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <AutomationStatusBadge status={log.status} />
                  <Link
                    href={`/crm/leads/${log.leadId}`}
                    className="text-[13px] font-semibold text-brand-700 hover:text-brand-800"
                  >
                    Lead öffnen
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Simulation logs */}
      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-ink">Simulationen</h2>
        {runLogs.length === 0 ? (
          <EmptyState text="Noch keine Automation simuliert." />
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-ink/[0.05]">
            {runLogs.map((run, i) => (
              <li
                key={run.id}
                className={[
                  "flex flex-wrap items-center justify-between gap-3 px-5 py-3",
                  i > 0 ? "border-t border-ink/[0.05]" : "",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-ink">{run.summary}</p>
                  <p className="text-[11.5px] text-ink-muted">{run.createdAt.toLocaleString("de-DE")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">
                    {run.status}
                  </span>
                  {run.leadId ? (
                    <Link href={`/crm/leads/${run.leadId}`} className="text-[13px] font-semibold text-brand-700 hover:text-brand-800">
                      Lead öffnen
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-ink/15 bg-surface-subtle/40 p-6 text-center text-[13px] text-ink-muted">
      {text}
    </p>
  );
}
