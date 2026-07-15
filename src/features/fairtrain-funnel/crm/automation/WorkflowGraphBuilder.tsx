"use client";
/**
 * WorkflowGraphBuilder — the visual, branching automation editor.
 *
 * One process drawn as nodes + edges: a trigger, then send / wait / KI-router /
 * condition / action nodes. The KI-router's outgoing edges carry the classified
 * paths (Arbeitssuchend / Beschäftigt / …), so new paths are added by dropping a
 * node and drawing an edge — existing paths keep working.
 */
import {
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  NODE_KIND_LABEL,
  ROUTER_PATH_LABEL,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowNodeKind,
  type WorkflowProcessKey,
  type WorkflowTrigger,
  WORKFLOW_TRIGGER_LABEL,
} from "@/features/fairtrain-funnel/automation/workflow/graph";
import type {
  WorkflowSummary,
  WorkflowTemplateOption,
  WorkflowUiStatus,
} from "@/features/fairtrain-funnel/automation/workflow/types";
import { createWorkflow, updateWorkflow } from "@/server/actions/workflows";

import { WorkflowNodeInspector, type Selection } from "./WorkflowNodeInspector";

type WfNodeData = { wf: WorkflowNode };
type WfNode = Node<WfNodeData>;

const KIND_TONE: Record<WorkflowNodeKind, string> = {
  trigger: "border-indigo-300 bg-indigo-50 text-indigo-900",
  sendTemplate: "border-emerald-300 bg-emerald-50 text-emerald-900",
  wait: "border-amber-300 bg-amber-50 text-amber-900",
  aiRouter: "border-violet-300 bg-violet-50 text-violet-900",
  condition: "border-sky-300 bg-sky-50 text-sky-900",
  setStatus: "border-slate-300 bg-slate-50 text-slate-800",
  setFunnelPhase: "border-slate-300 bg-slate-50 text-slate-800",
  addTag: "border-teal-300 bg-teal-50 text-teal-900",
  removeTag: "border-teal-300 bg-teal-50 text-teal-900",
  changeScore: "border-slate-300 bg-slate-50 text-slate-800",
  assignOwner: "border-slate-300 bg-slate-50 text-slate-800",
  createTask: "border-blue-300 bg-blue-50 text-blue-900",
  notify: "border-blue-300 bg-blue-50 text-blue-900",
  manualReview: "border-rose-300 bg-rose-50 text-rose-900",
  end: "border-slate-300 bg-slate-100 text-slate-700",
};

const PALETTE: WorkflowNodeKind[] = [
  "sendTemplate",
  "wait",
  "aiRouter",
  "condition",
  "setStatus",
  "setFunnelPhase",
  "addTag",
  "createTask",
  "notify",
  "manualReview",
  "end",
];

function WfNodeView({ data }: NodeProps<WfNode>) {
  const wf = data.wf;
  const showTarget = wf.kind !== "trigger";
  const showSource = wf.kind !== "end";
  return (
    <div className={`min-w-[150px] max-w-[220px] rounded-xl border px-3 py-2 shadow-sm ${KIND_TONE[wf.kind]}`}>
      {showTarget ? <Handle type="target" position={Position.Top} /> : null}
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
        {NODE_KIND_LABEL[wf.kind]}
      </p>
      <p className="mt-0.5 truncate text-[12.5px] font-semibold">
        {wf.label || NODE_KIND_LABEL[wf.kind]}
      </p>
      {showSource ? <Handle type="source" position={Position.Bottom} /> : null}
    </div>
  );
}

interface Props {
  workflow: WorkflowSummary | null; // null → create
  templates: ReadonlyArray<WorkflowTemplateOption>;
  users: ReadonlyArray<{ id: string; name: string }>;
  onClose: () => void;
}

const TRIGGERS: WorkflowTrigger[] = [
  "MESSAGE_INBOUND",
  "CAMPAIGN_ENROLL",
  "LEAD_CREATED",
  "FUNNEL_STARTED",
  "FUNNEL_COMPLETED",
  "MANUAL",
];
const PROCESS_KEYS: WorkflowProcessKey[] = [
  "reactivation",
  "application",
  "inbound_router",
  "custom",
];

export function WorkflowGraphBuilder({ workflow, templates, users, onClose }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const nodeTypes = useMemo(() => ({ wf: WfNodeView }), []);

  const [name, setName] = useState(workflow?.name ?? "Neuer Prozess");
  const [description] = useState(workflow?.description ?? "");
  const [processKey, setProcessKey] = useState<WorkflowProcessKey>(workflow?.processKey ?? "custom");
  const [trigger, setTrigger] = useState<WorkflowTrigger>(workflow?.trigger ?? "MESSAGE_INBOUND");
  const [status, setStatus] = useState<WorkflowUiStatus>(workflow?.status ?? "draft");
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<WfNode>(
    (workflow?.graph.nodes ?? [{ id: "trigger", kind: "trigger", x: 40, y: 40, trigger }]).map(
      (n) => ({ id: n.id, type: "wf", position: { x: n.x, y: n.y }, data: { wf: n } }),
    ),
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    (workflow?.graph.edges ?? []).map((e) => toRfEdge(e)),
  );

  const [selId, setSelId] = useState<{ kind: "node" | "edge"; id: string } | null>(null);

  const selection: Selection = useMemo(() => {
    if (!selId) return null;
    if (selId.kind === "node") {
      const n = nodes.find((x) => x.id === selId.id);
      return n ? { type: "node", node: n.data.wf } : null;
    }
    const e = edges.find((x) => x.id === selId.id);
    if (!e) return null;
    const src = nodes.find((x) => x.id === e.source);
    return {
      type: "edge",
      edge: fromRfEdge(e),
      sourceKind: src?.data.wf.kind ?? null,
    };
  }, [selId, nodes, edges]);

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges],
  );

  function addNode(kind: WorkflowNodeKind) {
    const id = `n_${Math.random().toString(36).slice(2, 9)}`;
    const wf: WorkflowNode = { id, kind, x: 240, y: 120, label: NODE_KIND_LABEL[kind] };
    if (kind === "wait") {
      wf.waitValue = 24;
      wf.waitUnit = "hours";
      wf.waitRequireNoReply = true;
      wf.waitStopIfFunnelStarted = true;
    }
    setNodes((ns) => [
      ...ns,
      { id, type: "wf", position: { x: 240, y: 120 + ns.length * 40 }, data: { wf } },
    ]);
    setSelId({ kind: "node", id });
  }

  function patchNode(patch: Partial<WorkflowNode>) {
    if (selId?.kind !== "node") return;
    setNodes((ns) =>
      ns.map((n) => (n.id === selId.id ? { ...n, data: { wf: { ...n.data.wf, ...patch } } } : n)),
    );
  }

  function patchEdge(patch: Partial<WorkflowEdge>) {
    if (selId?.kind !== "edge") return;
    setEdges((es) =>
      es.map((e) => {
        if (e.id !== selId.id) return e;
        const merged = { ...fromRfEdge(e), ...patch };
        return toRfEdge(merged);
      }),
    );
  }

  function deleteSelection() {
    if (!selId) return;
    if (selId.kind === "node") setNodes((ns) => ns.filter((n) => n.id !== selId.id));
    else setEdges((es) => es.filter((e) => e.id !== selId.id));
    setSelId(null);
  }

  function save() {
    setError(null);
    const graph = {
      nodes: nodes.map((n) => ({ ...n.data.wf, x: Math.round(n.position.x), y: Math.round(n.position.y) })),
      edges: edges.map((e) => fromRfEdge(e)),
    };
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      processKey,
      trigger,
      status,
      graph,
    };
    start(async () => {
      const res = workflow
        ? await updateWorkflow({ id: workflow.id, ...body })
        : await createWorkflow(body);
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setError(res.message);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 px-4 py-2.5">
        <input
          className="input h-9 w-60 text-[13px] font-semibold"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name des Prozesses"
        />
        <select className="input h-9 text-[13px]" value={processKey} onChange={(e) => setProcessKey(e.target.value as WorkflowProcessKey)}>
          {PROCESS_KEYS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select className="input h-9 text-[13px]" value={trigger} onChange={(e) => setTrigger(e.target.value as WorkflowTrigger)}>
          {TRIGGERS.map((t) => (
            <option key={t} value={t}>{WORKFLOW_TRIGGER_LABEL[t]}</option>
          ))}
        </select>
        <select className="input h-9 text-[13px]" value={status} onChange={(e) => setStatus(e.target.value as WorkflowUiStatus)}>
          <option value="draft">Entwurf</option>
          <option value="active">Aktiv</option>
          <option value="inactive">Inaktiv</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          {error ? <span className="text-[12px] font-medium text-rose-600">{error}</span> : null}
          <button type="button" onClick={onClose} className="rounded-lg bg-surface-subtle px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-slate-200">
            Abbrechen
          </button>
          <button type="button" disabled={pending} onClick={save} className="rounded-lg bg-brand-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {pending ? "Speichern…" : "Speichern"}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Palette */}
        <div className="w-44 shrink-0 space-y-1.5 overflow-y-auto border-r border-ink/10 p-3">
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-muted">Schritt hinzufügen</p>
          {PALETTE.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => addNode(k)}
              className={`block w-full rounded-lg border px-2.5 py-1.5 text-left text-[12px] font-semibold hover:brightness-95 ${KIND_TONE[k]}`}
            >
              {NODE_KIND_LABEL[k]}
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="min-w-0 flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, n) => setSelId({ kind: "node", id: n.id })}
            onEdgeClick={(_, e) => setSelId({ kind: "edge", id: e.id })}
            onPaneClick={() => setSelId(null)}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {/* Inspector */}
        <div className="w-72 shrink-0 overflow-y-auto border-l border-ink/10">
          <WorkflowNodeInspector
            selection={selection}
            templates={templates}
            users={users}
            onNodeChange={patchNode}
            onEdgeChange={patchEdge}
            onDelete={deleteSelection}
          />
        </div>
      </div>
    </div>
  );
}

function toRfEdge(e: WorkflowEdge): Edge {
  const label = e.path ? ROUTER_PATH_LABEL[e.path] : e.branch === "true" ? "Ja" : e.branch === "false" ? "Nein" : undefined;
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    ...(label ? { label } : {}),
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { path: e.path, branch: e.branch },
  };
}

function fromRfEdge(e: Edge): WorkflowEdge {
  const data = (e.data ?? {}) as { path?: WorkflowEdge["path"]; branch?: WorkflowEdge["branch"] };
  return {
    id: e.id,
    from: e.source,
    to: e.target,
    ...(data.path ? { path: data.path } : {}),
    ...(data.branch ? { branch: data.branch } : {}),
  };
}
