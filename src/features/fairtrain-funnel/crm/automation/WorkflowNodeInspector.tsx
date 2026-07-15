"use client";
/**
 * WorkflowNodeInspector — the config panel for the selected node or edge in the
 * visual workflow builder. Field set adapts to the node kind (send → template,
 * wait → duration, router edge → path, …).
 */
import {
  FUNNEL_PHASE_OPTIONS,
} from "@/features/fairtrain-funnel/funnelPhase";
import {
  NODE_KIND_LABEL,
  ROUTER_PATH_LABEL,
  ROUTER_PATHS,
  type WorkflowConditionType,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowNodeKind,
} from "@/features/fairtrain-funnel/automation/workflow/graph";
import type { WorkflowTemplateOption } from "@/features/fairtrain-funnel/automation/workflow/types";
import { LeadStatus } from "@/features/fairtrain-funnel/types";

const LEAD_STATUSES = Object.values(LeadStatus);

/** Conditions where the value IS the Ja/Nein expectation (negatable signal). */
const BOOLEAN_CONDITIONS: ReadonlySet<WorkflowConditionType> = new Set([
  "funnelStarted",
  "hasReplied",
  "isOptedOut",
  "hasWhatsappConsent",
]);
/** Conditions where the value is a concrete comparison target. */
const VALUE_CONDITIONS: ReadonlySet<WorkflowConditionType> = new Set([
  "hasTag",
  "leadStatusEquals",
  "funnelPhaseEquals",
]);

export type Selection =
  | { type: "node"; node: WorkflowNode }
  | { type: "edge"; edge: WorkflowEdge; sourceKind: WorkflowNodeKind | null }
  | null;

interface Props {
  selection: Selection;
  templates: ReadonlyArray<WorkflowTemplateOption>;
  users: ReadonlyArray<{ id: string; name: string }>;
  onNodeChange: (patch: Partial<WorkflowNode>) => void;
  onEdgeChange: (patch: Partial<WorkflowEdge>) => void;
  onDelete: () => void;
}

export function WorkflowNodeInspector({
  selection,
  templates,
  users,
  onNodeChange,
  onEdgeChange,
  onDelete,
}: Props) {
  if (!selection) {
    return (
      <div className="p-4 text-[12.5px] text-ink-muted">
        Wähle einen Schritt oder eine Verbindung, um sie zu bearbeiten. Über
        „Schritt hinzufügen“ fügst du neue Schritte ein und ziehst Verbindungen
        zwischen den Punkten.
      </div>
    );
  }

  if (selection.type === "edge") {
    const { edge, sourceKind } = selection;
    return (
      <div className="space-y-3 p-4">
        <Header title="Verbindung" onDelete={onDelete} />
        {sourceKind === "aiRouter" ? (
          <Field label="KI-Pfad">
            <select
              className="input h-9 w-full text-[13px]"
              value={edge.path ?? ""}
              onChange={(e) => onEdgeChange({ path: (e.target.value || undefined) as never })}
            >
              <option value="">– Pfad wählen –</option>
              {ROUTER_PATHS.map((p) => (
                <option key={p} value={p}>
                  {ROUTER_PATH_LABEL[p]}
                </option>
              ))}
            </select>
          </Field>
        ) : sourceKind === "condition" ? (
          <Field label="Zweig">
            <select
              className="input h-9 w-full text-[13px]"
              value={edge.branch ?? ""}
              onChange={(e) => onEdgeChange({ branch: (e.target.value || undefined) as never })}
            >
              <option value="">– Zweig wählen –</option>
              <option value="true">Wenn erfüllt (Ja)</option>
              <option value="false">Sonst (Nein)</option>
            </select>
          </Field>
        ) : (
          <p className="text-[12.5px] text-ink-muted">
            Diese Verbindung führt direkt zum nächsten Schritt.
          </p>
        )}
      </div>
    );
  }

  const node = selection.node;
  return (
    <div className="space-y-3 p-4">
      <Header title={NODE_KIND_LABEL[node.kind]} onDelete={node.kind === "trigger" ? undefined : onDelete} />

      <Field label="Beschriftung">
        <input
          className="input h-9 w-full text-[13px]"
          value={node.label ?? ""}
          onChange={(e) => onNodeChange({ label: e.target.value })}
        />
      </Field>

      {node.kind === "sendTemplate" ? (
        <Field label="WhatsApp-Vorlage">
          <select
            className="input h-9 w-full text-[13px]"
            value={node.templateId ?? ""}
            onChange={(e) => onNodeChange({ templateId: e.target.value || undefined })}
          >
            <option value="">– Vorlage wählen –</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.channel})
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {node.kind === "wait" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Dauer">
              <input
                type="number"
                min={1}
                className="input h-9 w-full text-[13px]"
                value={node.waitValue ?? 24}
                onChange={(e) => onNodeChange({ waitValue: Number(e.target.value) })}
              />
            </Field>
            <Field label="Einheit">
              <select
                className="input h-9 w-full text-[13px]"
                value={node.waitUnit ?? "hours"}
                onChange={(e) => onNodeChange({ waitUnit: e.target.value as never })}
              >
                <option value="minutes">Minuten</option>
                <option value="hours">Stunden</option>
                <option value="days">Tage</option>
              </select>
            </Field>
          </div>
          <Check
            label="Nur senden, wenn keine Antwort kam"
            checked={!!node.waitRequireNoReply}
            onChange={(v) => onNodeChange({ waitRequireNoReply: v })}
          />
          <Check
            label="Abbrechen, wenn Funnel gestartet"
            checked={!!node.waitStopIfFunnelStarted}
            onChange={(v) => onNodeChange({ waitStopIfFunnelStarted: v })}
          />
        </>
      ) : null}

      {node.kind === "setStatus" ? (
        <Field label="Lead-Status">
          <input
            className="input h-9 w-full text-[13px]"
            placeholder="z.B. CONTACTED"
            value={node.status ?? ""}
            onChange={(e) => onNodeChange({ status: e.target.value })}
          />
        </Field>
      ) : null}

      {node.kind === "setFunnelPhase" ? (
        <Field label="Funnel-Phase">
          <select
            className="input h-9 w-full text-[13px]"
            value={node.funnelPhase ?? ""}
            onChange={(e) => onNodeChange({ funnelPhase: e.target.value })}
          >
            <option value="">– Phase wählen –</option>
            {FUNNEL_PHASE_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {node.kind === "addTag" || node.kind === "removeTag" ? (
        <Field label="Tag">
          <input
            className="input h-9 w-full text-[13px]"
            value={node.tag ?? ""}
            onChange={(e) => onNodeChange({ tag: e.target.value })}
          />
        </Field>
      ) : null}

      {node.kind === "changeScore" ? (
        <Field label="Score (absolut)">
          <input
            type="number"
            className="input h-9 w-full text-[13px]"
            value={node.score ?? 0}
            onChange={(e) => onNodeChange({ score: Number(e.target.value) })}
          />
        </Field>
      ) : null}

      {node.kind === "assignOwner" ? (
        <Field label="Bearbeiter">
          <select
            className="input h-9 w-full text-[13px]"
            value={node.ownerId ?? ""}
            onChange={(e) => onNodeChange({ ownerId: e.target.value || undefined })}
          >
            <option value="">– Bearbeiter wählen –</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {node.kind === "createTask" ? (
        <>
          <Field label="Aufgabentitel">
            <input
              className="input h-9 w-full text-[13px]"
              value={node.taskTitle ?? ""}
              onChange={(e) => onNodeChange({ taskTitle: e.target.value })}
            />
          </Field>
          <Field label="Priorität">
            <select
              className="input h-9 w-full text-[13px]"
              value={node.taskPriority ?? "normal"}
              onChange={(e) => onNodeChange({ taskPriority: e.target.value as never })}
            >
              <option value="low">Niedrig</option>
              <option value="normal">Normal</option>
              <option value="high">Hoch</option>
            </select>
          </Field>
        </>
      ) : null}

      {node.kind === "notify" || node.kind === "manualReview" ? (
        <Field label="Notiz">
          <textarea
            className="input min-h-[70px] w-full py-2 text-[13px]"
            value={node.note ?? ""}
            onChange={(e) => onNodeChange({ note: e.target.value })}
          />
        </Field>
      ) : null}

      {node.kind === "condition" ? (
        <>
          <Field label="Bedingung">
            <select
              className="input h-9 w-full text-[13px]"
              value={node.conditionType ?? "hasReplied"}
              onChange={(e) =>
                onNodeChange({
                  conditionType: e.target.value as never,
                  conditionValue: "",
                })
              }
            >
              <option value="funnelStarted">Funnel gestartet</option>
              <option value="hasReplied">Hat geantwortet</option>
              <option value="hasWhatsappConsent">Hat WhatsApp-Einwilligung</option>
              <option value="hasTag">Hat Tag</option>
              <option value="leadStatusEquals">Lead-Status ist</option>
              <option value="funnelPhaseEquals">Funnel-Phase ist</option>
              <option value="isOptedOut">Abgemeldet (Opt-out)</option>
            </select>
          </Field>

          {BOOLEAN_CONDITIONS.has(node.conditionType ?? "hasReplied") ? (
            <Field label="Erwarteter Wert">
              <select
                className="input h-9 w-full text-[13px]"
                value={node.conditionValue ?? "true"}
                onChange={(e) => onNodeChange({ conditionValue: e.target.value })}
              >
                <option value="true">Ja</option>
                <option value="false">Nein</option>
              </select>
            </Field>
          ) : null}

          {node.conditionType === "funnelPhaseEquals" ? (
            <Field label="Funnel-Phase">
              <select
                className="input h-9 w-full text-[13px]"
                value={node.conditionValue ?? ""}
                onChange={(e) => onNodeChange({ conditionValue: e.target.value })}
              >
                <option value="">– Phase wählen –</option>
                {FUNNEL_PHASE_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {node.conditionType === "leadStatusEquals" ? (
            <Field label="Lead-Status">
              <select
                className="input h-9 w-full text-[13px]"
                value={node.conditionValue ?? ""}
                onChange={(e) => onNodeChange({ conditionValue: e.target.value })}
              >
                <option value="">– Status wählen –</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {node.conditionType === "hasTag" ? (
            <Field label="Tag">
              <input
                className="input h-9 w-full text-[13px]"
                placeholder="z.B. vip"
                value={node.conditionValue ?? ""}
                onChange={(e) => onNodeChange({ conditionValue: e.target.value })}
              />
            </Field>
          ) : null}

          {node.conditionType && VALUE_CONDITIONS.has(node.conditionType) && !node.conditionValue ? (
            <p className="text-[11.5px] text-amber-600">
              Bitte einen Wert auswählen — sonst greift die Bedingung nie.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Header({ title, onDelete }: { title: string; onDelete?: (() => void) | undefined }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="font-display text-[14px] font-bold text-navy-950">{title}</h3>
      {onDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg px-2 py-1 text-[12px] font-semibold text-rose-600 hover:bg-rose-50"
        >
          Entfernen
        </button>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[12.5px] text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
