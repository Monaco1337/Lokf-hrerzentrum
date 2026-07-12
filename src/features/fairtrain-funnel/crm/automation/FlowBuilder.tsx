"use client";
/**
 * FlowBuilder — full-screen visual automation editor.
 *
 * Renders a dot-grid canvas (Resend-style) with a vertical chain of
 * typed step nodes: Trigger → Conditions (0…n) → Actions (1…n).
 * Each node shows its config inline — no nested modals.
 *
 * Uses the same server actions as the old RuleEditorModal so all
 * existing back-end logic is preserved.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createAutomationRule,
  updateAutomationRule,
} from "@/server/actions/automationRules";
import {
  LeadPriority,
  LeadStatus,
  RULE_STATUS_LABEL,
  type AutomationRuleEntry,
  type AutomationTemplateEntry,
  type RuleAction,
  type RuleActionType,
  type RuleCondition,
  type RuleConditionType,
} from "../../types";
import { findEntry, type WorkflowTier } from "../../automation/workflow";
import { CatalogPicker, ModeSwitch, toneClasses, WorkflowIcon } from "./WorkflowCatalog";

// ── step types ────────────────────────────────────────────────────────────────

type TriggerStep   = { id: string; kind: "trigger";   trigger: string };
type ConditionStep = { id: string; kind: "condition"; data: RuleCondition };
type ActionStep    = { id: string; kind: "action";    data: RuleAction };
type FlowStep = TriggerStep | ConditionStep | ActionStep;

let _seq = 0;
const uid = () => `s${++_seq}`;

const LEAD_STATUSES = Object.values(LeadStatus);
const LEAD_PRIORITIES = Object.values(LeadPriority);

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  mode: "create" | "edit";
  rule?: AutomationRuleEntry;
  templates: ReadonlyArray<AutomationTemplateEntry>;
  users: ReadonlyArray<{ id: string; name: string }>;
  onClose: () => void;
}

export function FlowBuilder({ mode, rule, templates, users, onClose }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName]   = useState(rule?.name ?? "Neue Automation");
  const [status, setStatus] = useState(rule?.status ?? "draft");
  const [addAt, setAddAt]   = useState<number | null>(null);
  const [wfMode, setWfMode] = useState<WorkflowTier>("pro");

  const [steps, setSteps] = useState<FlowStep[]>(() => {
    const init: FlowStep[] = [
      { id: "trigger", kind: "trigger", trigger: rule?.trigger ?? "LEAD_CREATED" },
    ];
    (rule?.conditions ?? []).forEach((c) =>
      init.push({ id: uid(), kind: "condition", data: { ...c } }),
    );
    const acts: RuleAction[] = rule?.actions?.length
      ? rule.actions.map((a) => ({ ...a } as RuleAction))
      : [{ type: "sendTemplateSimulation" as const }];
    acts.forEach((a) => init.push({ id: uid(), kind: "action", data: a }));
    return init;
  });

  function updateStep(id: string, updated: FlowStep) {
    setSteps((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }

  function insertAfter(afterIdx: number, kind: "condition" | "action") {
    const step: FlowStep =
      kind === "condition"
        ? { id: uid(), kind: "condition", data: { type: "hasWhatsappConsent" } }
        : { id: uid(), kind: "action",    data: { type: "sendTemplateSimulation" } };
    setSteps((prev) => {
      const next = [...prev];
      next.splice(afterIdx + 1, 0, step);
      return next;
    });
    setAddAt(null);
  }

  function save() {
    setError(null);
    if (!name.trim()) { setError("Bitte einen Namen eingeben."); return; }
    const trigger = (steps.find((s) => s.kind === "trigger") as TriggerStep).trigger;
    const conditions = (steps.filter((s): s is ConditionStep => s.kind === "condition")).map((s) => s.data);
    const actions    = (steps.filter((s): s is ActionStep    => s.kind === "action")).map((s) => s.data);
    if (!actions.length) { setError("Mindestens eine Aktion ist erforderlich."); return; }

    start(async () => {
      // Real rules are production-ready so an "active" rule actually executes
      // on its trigger. (Demo runMode is reserved for seed data and never
      // auto-runs.)
      const payload = { name: name.trim(), description: null, trigger, conditions, actions, status, runMode: "production_ready" };
      const res = mode === "create"
        ? await createAutomationRule(payload)
        : await updateAutomationRule({ id: rule!.id, ...payload });
      if (!res.ok) { setError(res.message); return; }
      router.refresh();
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-white"
      onClick={() => setAddAt(null)}
    >
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-ink/[0.08] bg-white px-5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-subtle"
            aria-label="Zurück"
          >
            <ChevronLeftIcon className="h-[18px] w-[18px]" />
          </button>
          <span className="text-[12.5px] text-ink-muted">Automationen</span>
          <span className="text-ink-muted">/</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md bg-transparent px-1 text-[14px] font-semibold text-navy-950 outline-none focus:bg-surface-subtle focus:px-2 focus:ring-1 focus:ring-brand-300"
            placeholder="Automationsname"
          />
          <span
            className={[
              "rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
              status === "active"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : status === "draft"
                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-slate-100 text-slate-600 ring-slate-200",
            ].join(" ")}
          >
            {RULE_STATUS_LABEL[status] ?? status}
          </span>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <ModeSwitch mode={wfMode} onChange={setWfMode} />
          <span className="mx-1 h-5 w-px bg-ink/10" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "active" | "inactive")}
            className="rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-brand-300"
          >
            {Object.entries(RULE_STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-ink/10 px-4 py-1.5 text-[13px] font-medium text-ink hover:bg-surface-subtle"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="rounded-xl bg-brand-600 px-5 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Speichern …" : "Speichern"}
          </button>
        </div>
      </header>

      {/* ── Canvas ──────────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          background: "#f7f8fc",
          backgroundImage: "radial-gradient(#dde1ea 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <div className="mx-auto flex min-h-full flex-col items-center py-12 pb-24">

          {steps.map((step, idx) => (
            <div key={step.id} className="flex flex-col items-center">
              <div className="w-[540px]" onClick={(e) => e.stopPropagation()}>
                <NodeCard
                  step={step}
                  templates={templates}
                  users={users}
                  wfMode={wfMode}
                  canDelete={step.kind !== "trigger"}
                  onDelete={() => removeStep(step.id)}
                  onChange={(updated) => updateStep(step.id, updated)}
                />
              </div>

              {/* Connector + add button */}
              <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <div className="h-7 w-[2px] bg-ink/[0.12]" />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAddAt(addAt === idx ? null : idx)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 bg-white text-ink-muted shadow-sm transition hover:border-brand-400 hover:text-brand-600"
                    aria-label="Schritt hinzufügen"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </button>

                  {addAt === idx ? (
                    <div className="absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 overflow-hidden rounded-xl border border-ink/[0.08] bg-white shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)]">
                      {wfMode !== "simple" ? (
                        <button
                          type="button"
                          onClick={() => insertAfter(idx, "condition")}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] text-ink hover:bg-surface-subtle"
                        >
                          <FunnelIcon className="h-4 w-4 shrink-0 text-amber-500" />
                          Filter / Bedingung
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => insertAfter(idx, "action")}
                        className={[
                          "flex w-full items-center gap-3 px-4 py-3 text-left text-[13px] text-ink hover:bg-surface-subtle",
                          wfMode !== "simple" ? "border-t border-ink/[0.06]" : "",
                        ].join(" ")}
                      >
                        <BoltIcon className="h-4 w-4 shrink-0 text-brand-600" />
                        Aktion ausführen
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="h-7 w-[2px] bg-ink/[0.12]" />
              </div>
            </div>
          ))}

          {error ? (
            <p className="mt-2 w-[540px] rounded-2xl bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700 ring-1 ring-rose-200">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── NodeCard ──────────────────────────────────────────────────────────────────

function NodeCard({
  step,
  templates,
  users,
  wfMode,
  canDelete,
  onDelete,
  onChange,
}: {
  step: FlowStep;
  templates: ReadonlyArray<AutomationTemplateEntry>;
  users: ReadonlyArray<{ id: string; name: string }>;
  wfMode: WorkflowTier;
  canDelete: boolean;
  onDelete: () => void;
  onChange: (updated: FlowStep) => void;
}) {
  const meta = nodeMeta(step);

  return (
    <div
      className={[
        "overflow-hidden rounded-2xl border bg-white shadow-[0_1px_4px_rgba(15,23,42,0.07)]",
        "border-l-[3px]",
        meta.accent,
      ].join(" ")}
    >
      {/* Node header */}
      <div className="flex items-center justify-between border-b border-ink/[0.06] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${meta.iconBg}`}>
            <WorkflowIcon name={meta.icon} className={`h-4 w-4 ${meta.iconText}`} />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-ink-muted">
            {meta.kindLabel}
          </span>
          <span className="text-[13px] font-semibold text-navy-950">{meta.title}</span>
        </div>
        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-rose-50 hover:text-rose-600"
            aria-label="Schritt entfernen"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Node body */}
      <div className="px-5 py-4">
        {step.kind === "trigger" ? (
          <TriggerContent
            step={step}
            wfMode={wfMode}
            onChange={(t) => onChange({ ...step, trigger: t })}
          />
        ) : step.kind === "condition" ? (
          <ConditionContent
            step={step}
            wfMode={wfMode}
            onChange={(data) => onChange({ ...step, data })}
          />
        ) : (
          <ActionContent
            step={step}
            templates={templates}
            users={users}
            wfMode={wfMode}
            onChange={(data) => onChange({ ...step, data })}
          />
        )}
      </div>
    </div>
  );
}

// ── node sub-forms ────────────────────────────────────────────────────────────

function TriggerContent({
  step,
  wfMode,
  onChange,
}: {
  step: TriggerStep;
  wfMode: WorkflowTier;
  onChange: (trigger: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[12px] font-semibold text-ink">Auslöser</label>
      <CatalogPicker kind="trigger" value={step.trigger} mode={wfMode} onSelect={onChange} />
      <p className="mt-2 text-[12px] text-ink-muted">
        Die Automation startet, sobald dieser Auslöser eintritt.
      </p>
    </div>
  );
}

function ConditionContent({
  step,
  wfMode,
  onChange,
}: {
  step: ConditionStep;
  wfMode: WorkflowTier;
  onChange: (data: RuleCondition) => void;
}) {
  const entry = findEntry("condition", step.data.type);
  const valueKind = entry?.valueKind ?? "none";
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-[12px] font-semibold text-ink">Bedingung</label>
        <CatalogPicker
          kind="condition"
          value={step.data.type}
          mode={wfMode}
          onSelect={(id) => onChange({ type: id as RuleConditionType, value: undefined })}
        />
      </div>
      {valueKind !== "none" ? (
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-ink">Wert</label>
          {valueKind === "leadStatus" ? (
            <select
              className="input"
              value={String(step.data.value ?? "")}
              onChange={(e) => onChange({ ...step.data, value: e.target.value })}
            >
              <option value="">— wählen</option>
              {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : valueKind === "priority" ? (
            <select
              className="input"
              value={String(step.data.value ?? "")}
              onChange={(e) => onChange({ ...step.data, value: e.target.value })}
            >
              <option value="">— wählen</option>
              {LEAD_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <input
              className="input"
              type={valueKind === "number" || valueKind === "hours" ? "number" : "text"}
              placeholder={valueKind === "hours" ? "Stunden (z.B. 24)" : "Wert"}
              value={String(step.data.value ?? "")}
              onChange={(e) => onChange({ ...step.data, value: e.target.value })}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function ActionContent({
  step,
  templates,
  users,
  wfMode,
  onChange,
}: {
  step: ActionStep;
  templates: ReadonlyArray<AutomationTemplateEntry>;
  users: ReadonlyArray<{ id: string; name: string }>;
  wfMode: WorkflowTier;
  onChange: (data: RuleAction) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-[12px] font-semibold text-ink">Aktion</label>
        <CatalogPicker
          kind="action"
          value={step.data.type}
          mode={wfMode}
          onSelect={(id) => onChange({ type: id as RuleActionType })}
        />
      </div>

      {step.data.type === "sendTemplateSimulation" ? (
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-ink">Vorlage</label>
          <select
            className="input"
            value={step.data.templateId ?? ""}
            onChange={(e) => onChange({ ...step.data, templateId: e.target.value })}
          >
            <option value="">— Vorlage wählen</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      ) : step.data.type === "createTask" ? (
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-ink">Aufgabentitel</label>
          <input
            className="input"
            placeholder="z.B. Unterlagen anfordern"
            value={step.data.taskTitle ?? ""}
            onChange={(e) => onChange({ ...step.data, taskTitle: e.target.value })}
          />
        </div>
      ) : step.data.type === "changeLeadStatus" ? (
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-ink">Neuer Status</label>
          <select
            className="input"
            value={step.data.status ?? ""}
            onChange={(e) => onChange({ ...step.data, status: e.target.value })}
          >
            <option value="">— Status wählen</option>
            {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      ) : step.data.type === "assignOwner" ? (
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-ink">Bearbeiter</label>
          <select
            className="input"
            value={step.data.ownerId ?? ""}
            onChange={(e) => onChange({ ...step.data, ownerId: e.target.value })}
          >
            <option value="">— Person wählen</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      ) : step.data.type === "createFollowUp" ? (
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-ink">Stunden bis Wiedervorlage</label>
          <input
            className="input"
            type="number"
            min={1}
            placeholder="24"
            value={step.data.hours ?? ""}
            onChange={(e) => onChange({ ...step.data, hours: Number(e.target.value) || undefined })}
          />
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-[12px] font-semibold text-ink">Notiz</label>
          <input
            className="input"
            placeholder="Optionale Notiz"
            value={step.data.note ?? ""}
            onChange={(e) => onChange({ ...step.data, note: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

// ── step metadata ─────────────────────────────────────────────────────────────

function nodeMeta(step: FlowStep): {
  kindLabel: string;
  title: string;
  icon: Parameters<typeof WorkflowIcon>[0]["name"];
  iconBg: string;
  iconText: string;
  accent: string;
} {
  if (step.kind === "trigger") {
    const e = findEntry("trigger", step.trigger);
    const tone = toneClasses(e?.tone ?? "indigo");
    return {
      kindLabel: "Auslöser",
      title: e?.label ?? step.trigger,
      icon: e?.icon ?? "bolt",
      iconBg: tone.iconBg,
      iconText: tone.iconText,
      accent: tone.accent,
    };
  }
  if (step.kind === "condition") {
    const e = findEntry("condition", step.data.type);
    const tone = toneClasses(e?.tone ?? "amber");
    return {
      kindLabel: "Bedingung",
      title: e?.label ?? step.data.type,
      icon: e?.icon ?? "funnel",
      iconBg: tone.iconBg,
      iconText: tone.iconText,
      accent: tone.accent,
    };
  }
  const e = findEntry("action", (step as ActionStep).data.type);
  const tone = toneClasses(e?.tone ?? "slate");
  return {
    kindLabel: "Aktion",
    title: e?.label ?? (step as ActionStep).data.type,
    icon: e?.icon ?? "note",
    iconBg: tone.iconBg,
    iconText: tone.iconText,
    accent: tone.accent,
  };
}

// ── icons ─────────────────────────────────────────────────────────────────────

type IC = React.SVGProps<SVGSVGElement>;
const ic = (d: React.ReactNode) =>
  function Icon(p: IC) {
    return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>{d}</svg>;
  };

const BoltIcon      = ic(<><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></>);
const FunnelIcon    = ic(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>);
const PlusIcon      = ic(<><path d="M12 5v14M5 12h14"/></>);
const TrashIcon     = ic(<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>);
const ChevronLeftIcon = ic(<><polyline points="15 18 9 12 15 6"/></>);
