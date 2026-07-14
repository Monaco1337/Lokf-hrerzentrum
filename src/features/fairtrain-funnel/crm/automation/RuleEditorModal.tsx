"use client";
/**
 * Create/edit an automation rule: trigger + condition builder + action builder.
 * No external messages are ever sent — actions run in simulation/demo only.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createAutomationRule,
  updateAutomationRule,
} from "@/server/actions/automationRules";
import {
  ACTION_LABEL,
  CONDITION_LABEL,
  CONDITION_LOGIC_LABEL,
  CONDITIONS_WITH_VALUE,
  type ConditionLogic,
  FUNNEL_PHASE_OPTIONS,
  LeadStatus,
  RULE_STATUS_LABEL,
  RUN_MODE_LABEL,
  RuleActionType,
  RuleConditionType,
  TRIGGER_LABEL,
  type AutomationRuleEntry,
  type AutomationTemplateEntry,
  type RuleAction,
  type RuleCondition,
} from "../../types";
import { Modal } from "../ui/Modal";

interface Props {
  open: boolean;
  mode: "create" | "edit";
  rule?: AutomationRuleEntry | undefined;
  templates: ReadonlyArray<AutomationTemplateEntry>;
  users: ReadonlyArray<{ id: string; name: string }>;
  onClose: () => void;
}

const TRIGGERS = Object.keys(TRIGGER_LABEL) as Array<keyof typeof TRIGGER_LABEL>;
const CONDITION_TYPES = Object.values(RuleConditionType);
const ACTION_TYPES = Object.values(RuleActionType);
const LEAD_STATUSES = Object.values(LeadStatus);

export function RuleEditorModal({ open, mode, rule, templates, users, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [trigger, setTrigger] = useState(rule?.trigger ?? "LEAD_CREATED");
  const [status, setStatus] = useState(rule?.status ?? "draft");
  const [runMode, setRunMode] = useState(rule?.runMode ?? "demo");
  const [conditions, setConditions] = useState<RuleCondition[]>(
    rule?.conditions ? [...rule.conditions] : [],
  );
  const [conditionLogic, setConditionLogic] = useState<ConditionLogic>(
    rule?.conditionLogic ?? "all",
  );
  const [actions, setActions] = useState<RuleAction[]>(
    rule?.actions ? [...rule.actions] : [{ type: "createTask", taskTitle: "" }],
  );
  const [error, setError] = useState<string | null>(null);

  function patchCondition(i: number, patch: Partial<RuleCondition>) {
    setConditions((c) => c.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function patchAction(i: number, patch: Partial<RuleAction>) {
    setActions((a) => a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }

  function save() {
    setError(null);
    if (!name.trim() || actions.length === 0) {
      setError("Name und mindestens eine Aktion sind erforderlich.");
      return;
    }
    startTransition(async () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        trigger,
        conditions,
        conditionLogic,
        actions,
        status,
        runMode,
      };
      const res =
        mode === "create"
          ? await createAutomationRule(payload)
          : await updateAutomationRule({ id: rule!.id, ...payload });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Modal
      open={open}
      size="lg"
      onClose={onClose}
      title={mode === "create" ? "Neue Automation" : "Automation bearbeiten"}
      description="Trigger → Bedingungen → Aktionen. Simulation ändert echte Demo-Daten, sendet aber keine externen Nachrichten."
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-surface-subtle">
            Abbrechen
          </button>
          <button type="button" onClick={save} disabled={pending} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
            {pending ? "Speichern …" : "Speichern"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Name">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Beschreibung">
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Trigger">
            <select className="input" value={trigger} onChange={(e) => setTrigger(e.target.value as typeof trigger)}>
              {TRIGGERS.map((t) => (
                <option key={t} value={t}>{TRIGGER_LABEL[t]}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              {Object.entries(RULE_STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Modus">
            <select className="input" value={runMode} onChange={(e) => setRunMode(e.target.value as typeof runMode)}>
              {Object.entries(RUN_MODE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>
        </div>

        <Section
          title="Bedingungen"
          onAdd={() => setConditions((c) => [...c, { type: "hasWhatsappConsent" }])}
        >
          <div className="mb-2">
            <select
              className="input"
              value={conditionLogic}
              onChange={(e) => setConditionLogic(e.target.value as ConditionLogic)}
            >
              {Object.entries(CONDITION_LOGIC_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {conditions.length === 0 ? (
            <p className="text-[12.5px] text-ink-muted">Keine Bedingungen – Regel trifft immer zu.</p>
          ) : null}
          {conditions.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                className="input flex-1"
                value={c.type}
                onChange={(e) => patchCondition(i, { type: e.target.value as RuleCondition["type"], value: undefined })}
              >
                {CONDITION_TYPES.map((t) => (
                  <option key={t} value={t}>{CONDITION_LABEL[t]}</option>
                ))}
              </select>
              {CONDITIONS_WITH_VALUE.includes(c.type) ? (
                c.type === "leadStatus" ? (
                  <select className="input w-44" value={String(c.value ?? "")} onChange={(e) => patchCondition(i, { value: e.target.value })}>
                    <option value="">—</option>
                    {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : c.type === "funnelPhase" ? (
                  <select className="input w-48" value={String(c.value ?? "")} onChange={(e) => patchCondition(i, { value: e.target.value })}>
                    <option value="">—</option>
                    {FUNNEL_PHASE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input
                    className="input w-32"
                    value={String(c.value ?? "")}
                    placeholder={c.type === "scoreGreaterThan" || c.type.includes("Hours") ? "Zahl" : "Wert"}
                    onChange={(e) => patchCondition(i, { value: e.target.value })}
                  />
                )
              ) : null}
              <RemoveBtn onClick={() => setConditions((arr) => arr.filter((_, idx) => idx !== i))} />
            </div>
          ))}
        </Section>

        <Section
          title="Aktionen"
          onAdd={() => setActions((a) => [...a, { type: "addActivityLog", note: "" }])}
        >
          {actions.map((a, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                className="input w-56"
                value={a.type}
                onChange={(e) => patchAction(i, { type: e.target.value as RuleAction["type"] })}
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t} value={t}>{ACTION_LABEL[t]}</option>
                ))}
              </select>
              <ActionParam a={a} templates={templates} users={users} onChange={(p) => patchAction(i, p)} />
              <RemoveBtn onClick={() => setActions((arr) => arr.filter((_, idx) => idx !== i))} />
            </div>
          ))}
        </Section>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </Modal>
  );
}

function ActionParam({
  a,
  templates,
  users,
  onChange,
}: {
  a: RuleAction;
  templates: ReadonlyArray<AutomationTemplateEntry>;
  users: ReadonlyArray<{ id: string; name: string }>;
  onChange: (p: Partial<RuleAction>) => void;
}) {
  if (a.type === "sendTemplateSimulation") {
    return (
      <select className="input flex-1" value={a.templateId ?? ""} onChange={(e) => onChange({ templateId: e.target.value })}>
        <option value="">Vorlage wählen …</option>
        {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    );
  }
  if (a.type === "createTask") {
    return <input className="input flex-1" placeholder="Aufgabentitel" value={a.taskTitle ?? ""} onChange={(e) => onChange({ taskTitle: e.target.value })} />;
  }
  if (a.type === "changeLeadStatus") {
    return (
      <select className="input flex-1" value={a.status ?? ""} onChange={(e) => onChange({ status: e.target.value })}>
        <option value="">Status wählen …</option>
        {Object.values(LeadStatus).map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    );
  }
  if (a.type === "assignOwner") {
    return (
      <select className="input flex-1" value={a.ownerId ?? ""} onChange={(e) => onChange({ ownerId: e.target.value })}>
        <option value="">Bearbeiter wählen …</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    );
  }
  if (a.type === "createFollowUp") {
    return <input className="input flex-1" placeholder="Stunden (z. B. 24)" value={a.hours ?? ""} onChange={(e) => onChange({ hours: Number(e.target.value) || undefined })} />;
  }
  if (a.type === "changeFunnelPhase") {
    return (
      <select className="input flex-1" value={a.funnelPhase ?? ""} onChange={(e) => onChange({ funnelPhase: e.target.value })}>
        <option value="">Funnel-Phase wählen …</option>
        {FUNNEL_PHASE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (a.type === "addTag" || a.type === "removeTag") {
    return <input className="input flex-1" placeholder="Tag (z. B. rueckruf)" value={a.tag ?? ""} onChange={(e) => onChange({ tag: e.target.value })} />;
  }
  if (a.type === "changeScore") {
    return <input className="input flex-1" type="number" placeholder="Score-Änderung (z. B. 10 / -5)" value={a.score ?? ""} onChange={(e) => onChange({ score: Number(e.target.value) || undefined })} />;
  }
  if (a.type === "delay") {
    return (
      <div className="flex flex-1 gap-2">
        <input className="input flex-1" type="number" min={1} placeholder="Wert (z. B. 30)" value={a.delayValue ?? ""} onChange={(e) => onChange({ delayValue: Number(e.target.value) || undefined })} />
        <select className="input w-32" value={a.delayUnit ?? "hours"} onChange={(e) => onChange({ delayUnit: e.target.value as RuleAction["delayUnit"] })}>
          <option value="minutes">Minuten</option>
          <option value="hours">Stunden</option>
          <option value="days">Tage</option>
        </select>
      </div>
    );
  }
  if (a.type === "pauseAutomation" || a.type === "resumeAutomation" || a.type === "endWorkflow") {
    return <span className="flex-1 text-[12px] text-ink-muted">Keine Konfiguration nötig</span>;
  }
  return <input className="input flex-1" placeholder="Notiz" value={a.note ?? ""} onChange={(e) => onChange({ note: e.target.value })} />;
}

function Section({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink/[0.07] bg-surface-subtle/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12.5px] font-semibold text-ink">{title}</p>
        <button type="button" onClick={onAdd} className="rounded-lg border border-ink/10 bg-white px-2.5 py-1 text-[12px] font-medium text-ink hover:bg-surface-subtle">
          + Hinzufügen
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Entfernen" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-rose-50 hover:text-rose-600">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[12.5px] font-semibold text-ink">{label}</label>
      {children}
    </div>
  );
}
