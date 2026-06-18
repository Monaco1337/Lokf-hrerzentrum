"use client";
/**
 * Automation admin — three tabs:
 *   Vorlagen     → editable message-template library (WhatsApp/E-Mail/Intern)
 *   Automationen → configurable trigger→conditions→actions rules + simulation
 *   Verlauf      → automatic-send log + rule-run history
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

export function AutomationAdmin({
  templates,
  rules,
  logs,
  runLogs,
  previewLeads,
  users,
}: Props) {
  const [tab, setTab] = useState<Tab>("templates");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight text-navy-950">
          Vorlagen & Automationen
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Verwalte Nachrichten-Vorlagen und Automationsregeln. Im Demo-Modus wird
          der gesamte Prozess simuliert – ohne externe WhatsApp- oder E-Mail-APIs.
        </p>
      </header>

      <div className="inline-flex rounded-xl bg-surface-subtle p-1 ring-1 ring-ink/[0.05]">
        <TabButton active={tab === "templates"} onClick={() => setTab("templates")}>
          Vorlagen
        </TabButton>
        <TabButton active={tab === "rules"} onClick={() => setTab("rules")}>
          Automationen
        </TabButton>
        <TabButton active={tab === "logs"} onClick={() => setTab("logs")}>
          Verlauf
        </TabButton>
      </div>

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
        <LogsList logs={logs} runLogs={runLogs} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-lg px-4 py-1.5 text-sm font-semibold transition",
        active
          ? "bg-white text-navy-950 shadow-sm ring-1 ring-ink/[0.05]"
          : "text-ink-muted hover:text-ink",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function LogsList({
  logs,
  runLogs,
}: {
  logs: AutomationLogEntry[];
  runLogs: AutomationRunLogEntry[];
}) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink">Automatische Sends</h2>
        {logs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/15 bg-surface-subtle/40 p-6 text-center text-sm text-ink-muted">
            Noch keine automatischen Nachrichten versendet.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/[0.05]">
            {logs.map((log, i) => (
              <li
                key={log.id}
                className={[
                  "flex flex-wrap items-center justify-between gap-3 px-5 py-3",
                  i > 0 ? "border-t border-ink/[0.05]" : "",
                ].join(" ")}
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {channelLabel(log.channel)}
                    {log.isTest ? (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        Test
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-muted">{log.createdAt.toLocaleString("de-DE")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <AutomationStatusBadge status={log.status} />
                  <Link href={`/crm/leads/${log.leadId}`} className="text-sm font-medium text-brand-700 hover:text-brand-800">
                    Lead öffnen
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink">Automations-Simulationen</h2>
        {runLogs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/15 bg-surface-subtle/40 p-6 text-center text-sm text-ink-muted">
            Noch keine Automation simuliert.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/[0.05]">
            {runLogs.map((run, i) => (
              <li
                key={run.id}
                className={[
                  "flex flex-wrap items-center justify-between gap-3 px-5 py-3",
                  i > 0 ? "border-t border-ink/[0.05]" : "",
                ].join(" ")}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{run.summary}</p>
                  <p className="text-xs text-ink-muted">{run.createdAt.toLocaleString("de-DE")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200">
                    {run.status}
                  </span>
                  {run.leadId ? (
                    <Link href={`/crm/leads/${run.leadId}`} className="text-sm font-medium text-brand-700 hover:text-brand-800">
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
