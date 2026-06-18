"use client";
/**
 * Automation rules — list, toggle, edit, delete, simulate against a demo lead
 * and inspect what each (simulated) run actually did.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteAutomationRule,
  setAutomationRuleStatus,
  simulateAutomationRule,
} from "@/server/actions/automationRules";
import {
  ACTION_LABEL,
  CONDITION_LABEL,
  RULE_STATUS_LABEL,
  RUN_MODE_LABEL,
  TRIGGER_LABEL,
  type AutomationRuleEntry,
  type AutomationRunLogEntry,
  type AutomationTemplateEntry,
  type RuleActionType,
  type RuleConditionType,
} from "../../types";
import type { PreviewLead } from "./TemplateEditorModal";
import { RuleEditorModal } from "./RuleEditorModal";

interface Props {
  rules: ReadonlyArray<AutomationRuleEntry>;
  templates: ReadonlyArray<AutomationTemplateEntry>;
  users: ReadonlyArray<{ id: string; name: string }>;
  previewLeads: ReadonlyArray<PreviewLead>;
  runLogs: ReadonlyArray<AutomationRunLogEntry>;
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  inactive: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function RulesManager({ rules, templates, users, previewLeads, runLogs }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AutomationRuleEntry | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [simLead, setSimLead] = useState(previewLeads[0]?.id ?? "");
  const [flash, setFlash] = useState<string | null>(null);

  function toggle(r: AutomationRuleEntry) {
    startTransition(async () => {
      await setAutomationRuleStatus({
        id: r.id,
        status: r.status === "active" ? "inactive" : "active",
      });
      router.refresh();
    });
  }

  function remove(r: AutomationRuleEntry) {
    if (!window.confirm(`Automation „${r.name}" löschen?`)) return;
    startTransition(async () => {
      await deleteAutomationRule({ id: r.id });
      router.refresh();
    });
  }

  function simulate(r: AutomationRuleEntry) {
    if (!simLead) {
      setFlash("Bitte zuerst einen Demo-Lead auswählen.");
      return;
    }
    setFlash(null);
    startTransition(async () => {
      const res = await simulateAutomationRule({ ruleId: r.id, leadId: simLead });
      setFlash(res.ok ? `Simuliert: ${res.data.summary}` : res.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-soft">Demo-Lead für Simulation:</span>
          <select className="input h-9 w-52" value={simLead} onChange={(e) => setSimLead(e.target.value)}>
            {previewLeads.length === 0 ? <option value="">Keine Demo-Leads</option> : null}
            {previewLeads.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-card transition hover:bg-brand-700"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Neue Automation
        </button>
      </div>

      {flash ? (
        <p className="rounded-xl bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-800 ring-1 ring-brand-100">
          {flash}
        </p>
      ) : null}

      {rules.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/15 bg-surface-subtle/40 p-8 text-center text-sm text-ink-muted">
          Noch keine Automationsregeln. Lege die erste an oder lade die Demo-Daten.
        </p>
      ) : (
        <ul className="space-y-3">
          {rules.map((r) => {
            const isOpen = expanded === r.id;
            const ruleRuns = runLogs.filter((l) => l.ruleId === r.id);
            return (
              <li key={r.id} className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink/[0.05]">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-[15px] font-bold text-navy-950">{r.name}</h3>
                      <Badge tone={STATUS_TONE[r.status]}>{RULE_STATUS_LABEL[r.status]}</Badge>
                      <Badge tone="bg-slate-100 text-slate-600 ring-slate-200">{RUN_MODE_LABEL[r.runMode]}</Badge>
                      {r.isDemo ? <Badge tone="bg-violet-50 text-violet-700 ring-violet-200">Demo</Badge> : null}
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-muted">
                      {TRIGGER_LABEL[r.trigger]} · {r.runCount}× ausgeführt
                      {r.errorCount > 0 ? ` · ${r.errorCount} Fehler` : ""}
                      {r.lastRunAt ? ` · zuletzt ${r.lastRunAt.toLocaleString("de-DE")}` : " · nie ausgeführt"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <button type="button" disabled={pending} onClick={() => simulate(r)} className="rounded-lg bg-accent-50 px-3 py-1.5 font-semibold text-accent-900 ring-1 ring-accent-200 hover:bg-accent-100 disabled:opacity-50">
                      Simulieren
                    </button>
                    <button type="button" disabled={pending} onClick={() => toggle(r)} className="font-medium text-ink-soft hover:text-ink disabled:opacity-50">
                      {r.status === "active" ? "Pausieren" : "Aktivieren"}
                    </button>
                    <button type="button" onClick={() => setEditing(r)} className="font-semibold text-brand-700 hover:text-brand-800">
                      Bearbeiten
                    </button>
                    <button type="button" onClick={() => setExpanded(isOpen ? null : r.id)} className="font-medium text-ink-soft hover:text-ink">
                      {isOpen ? "Weniger" : "Details"}
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="border-t border-ink/[0.06] bg-surface-subtle/30 px-4 py-3.5">
                    {r.description ? <p className="mb-3 text-[13px] text-ink-soft">{r.description}</p> : null}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Heading>Bedingungen</Heading>
                        {r.conditions.length === 0 ? (
                          <p className="text-[12.5px] text-ink-muted">Trifft immer zu.</p>
                        ) : (
                          <ul className="space-y-1 text-[12.5px] text-ink">
                            {r.conditions.map((c, i) => (
                              <li key={i}>
                                • {CONDITION_LABEL[c.type as RuleConditionType]}
                                {c.value !== undefined ? `: ${String(c.value)}` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        <Heading>Aktionen</Heading>
                        <ul className="space-y-1 text-[12.5px] text-ink">
                          {r.actions.map((a, i) => (
                            <li key={i}>• {ACTION_LABEL[a.type as RuleActionType]}{actionHint(a, templates)}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <Heading className="mt-4">Ausführungsverlauf</Heading>
                    {ruleRuns.length === 0 ? (
                      <p className="text-[12.5px] text-ink-muted">Noch keine Ausführungen.</p>
                    ) : (
                      <ul className="space-y-2">
                        {ruleRuns.slice(0, 8).map((run) => (
                          <li key={run.id} className="rounded-lg bg-white p-2.5 text-[12.5px] ring-1 ring-ink/[0.05]">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-ink">{run.summary}</span>
                              <span className="text-ink-muted">{run.createdAt.toLocaleString("de-DE")}</span>
                            </div>
                            {run.detail.actions && run.detail.actions.length > 0 ? (
                              <ul className="mt-1 space-y-0.5 text-ink-soft">
                                {run.detail.actions.map((act, i) => (
                                  <li key={i}>→ {act.result}</li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3">
                      <button type="button" onClick={() => remove(r)} className="text-[12.5px] font-medium text-danger hover:underline">
                        Automation löschen
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <RuleEditorModal open={creating} mode="create" templates={templates} users={users} onClose={() => setCreating(false)} />
      ) : null}
      {editing ? (
        <RuleEditorModal open={editing !== null} mode="edit" rule={editing} templates={templates} users={users} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}

function actionHint(
  a: { type: string; templateId?: string | undefined; taskTitle?: string | undefined; status?: string | undefined },
  templates: ReadonlyArray<AutomationTemplateEntry>,
): string {
  if (a.type === "sendTemplateSimulation") {
    const t = templates.find((x) => x.id === a.templateId);
    return t ? `: ${t.name}` : "";
  }
  if (a.type === "createTask" && a.taskTitle) return `: ${a.taskTitle}`;
  if (a.type === "changeLeadStatus" && a.status) return `: ${a.status}`;
  return "";
}

function Badge({ tone, children }: { tone: string | undefined; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tone ?? "bg-slate-100 text-slate-600 ring-slate-200"}`}>
      {children}
    </span>
  );
}

function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted ${className}`}>
      {children}
    </p>
  );
}
