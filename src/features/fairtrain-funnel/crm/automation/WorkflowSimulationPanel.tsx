"use client";
/**
 * WorkflowSimulationPanel — Testmodus (Spec §10).
 *
 * Slide-over that dry-runs the current (unsaved) workflow draft against a real
 * lead and visualises every step: trigger → conditions (pass/fail) → actions
 * (simulated result), plus the recipient. Never sends messages, never mutates
 * data (the server action is read-only).
 */
import { useState, useTransition } from "react";

import { simulateWorkflowDraft } from "@/server/actions/automationRules";
import type {
  RuleAction,
  RuleCondition,
  WorkflowSimulationResult,
} from "../../types";
import { findEntry } from "../../automation/workflow";
import type { PreviewLead } from "./TemplateEditorModal";
import { toneClasses, WorkflowIcon } from "./WorkflowCatalog";

interface Props {
  open: boolean;
  onClose: () => void;
  previewLeads: ReadonlyArray<PreviewLead>;
  draft: { trigger: string; conditions: RuleCondition[]; actions: RuleAction[] };
}

export function WorkflowSimulationPanel({ open, onClose, previewLeads, draft }: Props) {
  const [leadId, setLeadId] = useState(previewLeads[0]?.id ?? "");
  const [result, setResult] = useState<WorkflowSimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run() {
    setError(null);
    setResult(null);
    if (!leadId) {
      setError("Bitte einen Test-Lead auswählen.");
      return;
    }
    start(async () => {
      const res = await simulateWorkflowDraft({
        leadId,
        trigger: draft.trigger,
        conditions: draft.conditions,
        actions: draft.actions,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setResult(res.data);
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div className="absolute inset-0 bg-navy-950/20 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="relative flex h-full w-[440px] max-w-[92vw] flex-col bg-white shadow-[0_0_60px_-12px_rgba(15,23,42,0.4)]">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-ink/[0.08] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
              <PlayIcon className="h-4 w-4 text-brand-600" />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-navy-950">Testlauf</h2>
              <p className="text-[11.5px] text-ink-muted">Simulation – keine echten Nachrichten</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-subtle"
            aria-label="Schließen"
          >
            <XIcon className="h-[18px] w-[18px]" />
          </button>
        </header>

        {/* Lead picker + run */}
        <div className="shrink-0 space-y-2.5 border-b border-ink/[0.06] px-5 py-4">
          <label className="block text-[12px] font-semibold text-ink">Test-Lead</label>
          <select
            className="input"
            value={leadId}
            onChange={(e) => {
              setLeadId(e.target.value);
              setResult(null);
            }}
          >
            {previewLeads.length === 0 ? <option value="">Keine Leads verfügbar</option> : null}
            {previewLeads.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={run}
            disabled={pending || previewLeads.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <PlayIcon className="h-4 w-4" />
            {pending ? "Simuliere …" : "Simulation starten"}
          </button>
          {error ? (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          ) : null}
        </div>

        {/* Result trace */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!result ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle">
                <PlayIcon className="h-5 w-5 text-ink-muted" />
              </div>
              <p className="text-[13px] text-ink-muted">
                Starte die Simulation, um jeden Schritt <br /> Zug um Zug zu sehen.
              </p>
            </div>
          ) : (
            <Trace result={result} />
          )}
        </div>
      </aside>
    </div>
  );
}

function Trace({ result }: { result: WorkflowSimulationResult }) {
  const trigger = findEntry("trigger", result.triggerType);
  const triggerTone = toneClasses(trigger?.tone ?? "indigo");

  return (
    <div className="space-y-4">
      {/* Recipient */}
      <div className="rounded-2xl border border-ink/[0.08] bg-surface-subtle/50 p-4">
        <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Empfänger
        </p>
        <p className="text-[14px] font-semibold text-navy-950">{result.recipient.name}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <MetaChip label={`Status: ${result.recipient.status}`} tone="slate" />
          <MetaChip
            label={result.recipient.whatsappConsent ? "WhatsApp ✓" : "WhatsApp ✗"}
            tone={result.recipient.whatsappConsent ? "emerald" : "rose"}
          />
          <MetaChip
            label={result.recipient.emailConsent ? "E-Mail ✓" : "E-Mail ✗"}
            tone={result.recipient.emailConsent ? "emerald" : "rose"}
          />
        </div>
      </div>

      {/* Timeline */}
      <ol className="relative space-y-2 border-l-2 border-ink/[0.08] pl-4">
        {/* Trigger */}
        <TraceRow
          icon={<WorkflowIcon name={trigger?.icon ?? "bolt"} className={`h-4 w-4 ${triggerTone.iconText}`} />}
          iconBg={triggerTone.iconBg}
          kind="Auslöser"
          title={trigger?.label ?? result.triggerType}
          detail="Automation wurde ausgelöst"
          state="ok"
        />

        {/* Conditions */}
        {result.conditions.map((c, i) => {
          const e = findEntry("condition", c.type);
          return (
            <TraceRow
              key={`cond-${i}`}
              icon={
                c.passed ? (
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XIcon className="h-4 w-4 text-rose-600" />
                )
              }
              iconBg={c.passed ? "bg-emerald-50" : "bg-rose-50"}
              kind="Bedingung"
              title={e?.label ?? c.type}
              detail={c.note ?? (c.passed ? "erfüllt" : "nicht erfüllt")}
              state={c.passed ? "ok" : "fail"}
            />
          );
        })}

        {/* Gate note */}
        {!result.allPassed ? (
          <li className="ml-1 rounded-xl bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-800 ring-1 ring-amber-200">
            Bedingungen nicht erfüllt – es werden keine Aktionen ausgeführt.
          </li>
        ) : null}

        {/* Actions */}
        {result.allPassed
          ? result.actions.map((a, i) => {
              const e = findEntry("action", a.type);
              const tone = toneClasses(e?.tone ?? "emerald");
              return (
                <TraceRow
                  key={`act-${i}`}
                  icon={<WorkflowIcon name={e?.icon ?? "note"} className={`h-4 w-4 ${tone.iconText}`} />}
                  iconBg={tone.iconBg}
                  kind="Aktion"
                  title={e?.label ?? a.type}
                  detail={a.result}
                  state="ok"
                />
              );
            })
          : null}
      </ol>
    </div>
  );
}

function TraceRow({
  icon,
  iconBg,
  kind,
  title,
  detail,
  state,
}: {
  icon: React.ReactNode;
  iconBg: string;
  kind: string;
  title: string;
  detail: string;
  state: "ok" | "fail";
}) {
  return (
    <li className="relative">
      <span
        className={`absolute -left-[26px] top-1 flex h-4 w-4 items-center justify-center rounded-full ${
          state === "fail" ? "bg-rose-500" : "bg-emerald-500"
        } ring-4 ring-white`}
      />
      <div className="flex items-start gap-3 rounded-2xl border border-ink/[0.08] bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">{kind}</p>
          <p className="text-[13.5px] font-semibold text-navy-950">{title}</p>
          <p className="mt-0.5 break-words text-[12px] text-ink-muted">{detail}</p>
        </div>
      </div>
    </li>
  );
}

function MetaChip({ label, tone }: { label: string; tone: "slate" | "emerald" | "rose" }) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "rose"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${cls}`}>{label}</span>
  );
}

// ── icons ─────────────────────────────────────────────────────────────────────

type IC = React.SVGProps<SVGSVGElement>;
const ic = (d: React.ReactNode) =>
  function Icon(p: IC) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
        {d}
      </svg>
    );
  };

const PlayIcon = ic(<polygon points="6 4 20 12 6 20 6 4" />);
const XIcon = ic(<><path d="M18 6 6 18M6 6l12 12" /></>);
const CheckIcon = ic(<polyline points="20 6 9 17 4 12" />);
