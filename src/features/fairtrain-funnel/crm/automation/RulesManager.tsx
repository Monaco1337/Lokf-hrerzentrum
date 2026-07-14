"use client";
/**
 * RulesManager — shows each automation rule as a visual flow-preview card
 * and opens FlowBuilder (full-screen) for create/edit.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  backfillWhatsappReplies,
  deleteAutomationRule,
  setAutomationRuleStatus,
  simulateAutomationRule,
} from "@/server/actions/automationRules";
import type { BackfillSummary } from "@/features/fairtrain-funnel/automation/types";
import {
  ACTION_LABEL,
  RULE_STATUS_LABEL,
  TRIGGER_LABEL,
  type AutomationRuleEntry,
  type AutomationRunLogEntry,
  type AutomationTemplateEntry,
  type RuleActionType,
} from "../../types";
import type { PreviewLead } from "./TemplateEditorModal";
import { FlowBuilder } from "./FlowBuilder";

interface Props {
  rules: ReadonlyArray<AutomationRuleEntry>;
  templates: ReadonlyArray<AutomationTemplateEntry>;
  users: ReadonlyArray<{ id: string; name: string }>;
  previewLeads: ReadonlyArray<PreviewLead>;
  runLogs: ReadonlyArray<AutomationRunLogEntry>;
}

export function RulesManager({ rules, templates, users, previewLeads, runLogs }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AutomationRuleEntry | null>(null);
  const [simLead, setSimLead] = useState(previewLeads[0]?.id ?? "");
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null);
  const [backfill, setBackfill] = useState<BackfillSummary | null>(null);
  const [backfillErr, setBackfillErr] = useState<string | null>(null);

  function runBackfill() {
    if (
      !window.confirm(
        "Vorhandene WhatsApp-Antworten jetzt nachträglich verarbeiten? Bereits klassifizierte Leads werden übersprungen – es werden keine doppelten Nachrichten gesendet.",
      )
    )
      return;
    setBackfill(null);
    setBackfillErr(null);
    start(async () => {
      const res = await backfillWhatsappReplies({});
      if (res.ok) setBackfill(res.data);
      else setBackfillErr(res.message);
      router.refresh();
    });
  }

  function toggle(r: AutomationRuleEntry) {
    start(async () => {
      await setAutomationRuleStatus({ id: r.id, status: r.status === "active" ? "inactive" : "active" });
      router.refresh();
    });
  }

  function remove(r: AutomationRuleEntry) {
    if (!window.confirm(`Automation „${r.name}" löschen?`)) return;
    start(async () => { await deleteAutomationRule({ id: r.id }); router.refresh(); });
  }

  function simulate(r: AutomationRuleEntry) {
    if (!simLead) { setFlash({ ok: false, msg: "Bitte zuerst einen Demo-Lead wählen." }); return; }
    setFlash(null);
    start(async () => {
      const res = await simulateAutomationRule({ ruleId: r.id, leadId: simLead });
      setFlash({ ok: res.ok, msg: res.ok ? `Simuliert: ${res.data.summary}` : res.message });
      router.refresh();
    });
  }

  if (creating) {
    return <FlowBuilder mode="create" templates={templates} users={users} previewLeads={previewLeads} onClose={() => setCreating(false)} />;
  }
  if (editing) {
    return <FlowBuilder mode="edit" rule={editing} templates={templates} users={users} previewLeads={previewLeads} onClose={() => setEditing(null)} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] text-ink-soft">Test-Lead:</span>
          <select
            className="input h-9 w-52 text-[13px]"
            value={simLead}
            onChange={(e) => setSimLead(e.target.value)}
          >
            {previewLeads.length === 0 ? <option value="">Keine Demo-Leads</option> : null}
            {previewLeads.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={runBackfill}
            title="Bereits erhaltene WhatsApp-Antworten nachträglich klassifizieren und passende Folge-Automationen starten. Idempotent – keine doppelten Nachrichten."
            className="inline-flex items-center gap-2 rounded-xl bg-surface-subtle px-4 py-2 text-[13px] font-semibold text-ink ring-1 ring-ink/10 hover:bg-accent-50 hover:text-accent-900 disabled:opacity-50"
          >
            <HistoryIcon className="h-4 w-4" />
            Vorhandene Antworten nachträglich verarbeiten
          </button>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-[13px] font-semibold text-white shadow-sm hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" />
            Neue Automation
          </button>
        </div>
      </div>

      {backfillErr ? (
        <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-rose-700 ring-1 ring-rose-200">
          {backfillErr}
        </div>
      ) : null}

      {backfill ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-4">
          <p className="mb-2 text-[13px] font-semibold text-emerald-900">
            Nachverarbeitung abgeschlossen — das System läuft wieder im Live-Modus.
          </p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-[13px] text-emerald-800 sm:grid-cols-3">
            <li>✔ {backfill.processed} Antworten verarbeitet</li>
            <li>✔ {backfill.employed} Beschäftigt</li>
            <li>✔ {backfill.job_seeking} Arbeitssuchend</li>
            <li>✔ {backfill.other} Sonstige Situation</li>
            <li>✔ {backfill.skipped} übersprungen (bereits klassifiziert)</li>
            <li className={backfill.errors > 0 ? "text-rose-700" : ""}>
              ✔ {backfill.errors} Fehler
            </li>
          </ul>
        </div>
      ) : null}

      {flash ? (
        <div className={[
          "rounded-xl px-4 py-2.5 text-[13px] font-medium ring-1",
          flash.ok
            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
            : "bg-rose-50 text-rose-700 ring-rose-200",
        ].join(" ")}>
          {flash.msg}
        </div>
      ) : null}

      {/* Empty state */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink/15 bg-surface-subtle/40 py-14 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <BoltIcon className="h-6 w-6" />
          </span>
          <p className="text-[15px] font-semibold text-navy-950">Noch keine Automationen</p>
          <p className="mt-1.5 max-w-xs text-[13px] text-ink-muted">
            Lege fest, was automatisch passiert — z.B. Willkommens-E-Mail sobald ein Lead eingeht.
          </p>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700"
          >
            <PlusIcon className="h-4 w-4" />
            Erste Automation erstellen
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {rules.map((r) => {
            const ruleRuns = runLogs.filter((l) => l.ruleId === r.id);
            const activeActions = r.actions.slice(0, 3);
            return (
              <li
                key={r.id}
                className="overflow-hidden rounded-2xl border border-ink/[0.08] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
              >
                {/* Card header */}
                <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-[15px] font-bold text-navy-950">{r.name}</h3>
                      <span className={[
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
                        r.status === "active"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : r.status === "draft"
                            ? "bg-amber-50 text-amber-700 ring-amber-200"
                            : "bg-slate-100 text-slate-600 ring-slate-200",
                      ].join(" ")}>
                        {RULE_STATUS_LABEL[r.status]}
                      </span>
                      {r.isDemo ? (
                        <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-200">Demo</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12px] text-ink-muted">
                      {r.runCount > 0 ? `${r.runCount}× ausgeführt` : "Noch nie ausgeführt"}
                      {r.lastRunAt ? ` · zuletzt ${r.lastRunAt.toLocaleDateString("de-DE")}` : ""}
                      {r.errorCount > 0 ? ` · ${r.errorCount} Fehler` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-[13px]">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => simulate(r)}
                      className="rounded-lg bg-surface-subtle px-3 py-1.5 font-semibold text-ink hover:bg-accent-50 hover:text-accent-900 disabled:opacity-50"
                    >
                      Simulieren
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggle(r)}
                      className="rounded-lg bg-surface-subtle px-3 py-1.5 font-medium text-ink-soft hover:bg-surface-subtle hover:text-ink disabled:opacity-50"
                    >
                      {r.status === "active" ? "Pausieren" : "Aktivieren"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(r)}
                      className="rounded-lg bg-brand-50 px-3 py-1.5 font-semibold text-brand-700 hover:bg-brand-100"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(r)}
                      className="rounded-lg p-1.5 text-ink-muted hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Löschen"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Mini flow preview */}
                <div className="mt-3 flex items-center gap-1.5 overflow-x-auto px-5 pb-4">
                  {/* Trigger pill */}
                  <FlowPill
                    icon={<BoltIcon className="h-3.5 w-3.5 text-indigo-600" />}
                    label={TRIGGER_LABEL[r.trigger as keyof typeof TRIGGER_LABEL] ?? r.trigger}
                    color="indigo"
                  />

                  {/* Conditions badge */}
                  {r.conditions.length > 0 ? (
                    <>
                      <ArrowIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                      <FlowPill
                        icon={<FunnelIcon className="h-3.5 w-3.5 text-amber-600" />}
                        label={`${r.conditions.length} Filter`}
                        color="amber"
                      />
                    </>
                  ) : null}

                  {/* Action pills */}
                  {activeActions.map((a, i) => (
                    <>
                      <ArrowIcon key={`arr-${i}`} className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                      <FlowPill
                        key={`act-${i}`}
                        icon={<ActionDot type={a.type} />}
                        label={ACTION_LABEL[a.type as RuleActionType] ?? a.type}
                        color="emerald"
                      />
                    </>
                  ))}
                  {r.actions.length > 3 ? (
                    <>
                      <ArrowIcon className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                        +{r.actions.length - 3} mehr
                      </span>
                    </>
                  ) : null}
                </div>

                {/* Recent runs */}
                {ruleRuns.length > 0 ? (
                  <div className="border-t border-ink/[0.06] bg-surface-subtle/40 px-5 py-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                      Letzte Ausführungen
                    </p>
                    <ul className="space-y-1.5">
                      {ruleRuns.slice(0, 3).map((run) => (
                        <li key={run.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-[12.5px] ring-1 ring-ink/[0.05]">
                          <span className="truncate text-ink">{run.summary}</span>
                          <span className="shrink-0 text-ink-muted">
                            {run.createdAt.toLocaleString("de-DE")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function FlowPill({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: "indigo" | "amber" | "emerald";
}) {
  const cls = {
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  }[color];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ${cls}`}>
      {icon}
      <span className="max-w-[140px] truncate">{label}</span>
    </span>
  );
}

function ActionDot({ type }: { type: string }) {
  if (type === "sendTemplateSimulation") return <MailIcon className="h-3.5 w-3.5 text-emerald-600" />;
  if (type === "createTask" || type === "createFollowUp") return <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />;
  return <BoltIcon className="h-3.5 w-3.5 text-emerald-600" />;
}

// ── icons ─────────────────────────────────────────────────────────────────────

type IC = React.SVGProps<SVGSVGElement>;
const ic = (d: React.ReactNode) =>
  function Icon(p: IC) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>;
  };

const BoltIcon   = ic(<><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></>);
const FunnelIcon = ic(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>);
const MailIcon   = ic(<><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/></>);
const CheckIcon  = ic(<><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>);
const ArrowIcon  = ic(<><path d="M5 12h14M12 5l7 7-7 7"/></>);
const PlusIcon   = ic(<><path d="M12 5v14M5 12h14"/></>);
const HistoryIcon= ic(<><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></>);
const TrashIcon  = ic(<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>);
