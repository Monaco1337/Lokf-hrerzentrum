/**
 * Unified Workflow graph model — shared by the server engine and the visual
 * builder. A workflow is ONE process drawn as a directed graph: a single
 * trigger node, then send / wait / router / condition / action nodes connected
 * by edges. The engine walks this graph one node at a time per lead, so a lead
 * only ever receives the ONE next step.
 *
 * This module is PURE (no I/O) and safe to import from both UI and server.
 */

/** Which business process a workflow drives (drives overview grouping + rules). */
export type WorkflowProcessKey =
  | "reactivation"
  | "application"
  | "inbound_router"
  | "custom";

export const PROCESS_KEY_LABEL: Record<WorkflowProcessKey, string> = {
  reactivation: "Reaktivierung (Alt-Leads)",
  application: "Bewerbungsprozess",
  inbound_router: "WhatsApp-Antwort-Router",
  custom: "Eigener Prozess",
};

/** How a lead ENTERS a workflow. */
export type WorkflowTrigger =
  | "MESSAGE_INBOUND" // any inbound WhatsApp reply (KI-Router)
  | "CAMPAIGN_ENROLL" // released into the reactivation sequence
  | "LEAD_CREATED"
  | "FUNNEL_STARTED"
  | "FUNNEL_COMPLETED"
  | "MANUAL";

export const WORKFLOW_TRIGGER_LABEL: Record<WorkflowTrigger, string> = {
  MESSAGE_INBOUND: "WhatsApp-Antwort erhalten",
  CAMPAIGN_ENROLL: "In Reaktivierung aufgenommen",
  LEAD_CREATED: "Lead angelegt",
  FUNNEL_STARTED: "Funnel gestartet",
  FUNNEL_COMPLETED: "Funnel abgeschlossen",
  MANUAL: "Manuell gestartet",
};

/**
 * The AI router classifies an inbound reply into exactly ONE of these paths.
 * Each path is a separate output of the KI-Antwort-Router node, so the operator
 * can wire an individual follow-up (template / status / phase / task / notice)
 * behind every category. Adding a new path later is additive — draw a new edge
 * + node, existing paths keep working.
 */
export type WorkflowRouterPath =
  | "job_seeking" // Arbeitssuchend
  | "employed" // Beschäftigt
  | "other" // Sonstige Situation (erkannt, aber kein Standard-Bucket)
  | "more_info" // Mehr Informationen gewünscht
  | "callback" // Rückruf gewünscht
  | "consultation" // Beratung gewünscht
  | "no_interest" // Kein Interesse
  | "stop" // STOPP / Abmeldung
  | "unclear"; // Unklar / manuelle Prüfung

export const ROUTER_PATH_LABEL: Record<WorkflowRouterPath, string> = {
  job_seeking: "Arbeitssuchend",
  employed: "Beschäftigt",
  other: "Sonstige Situation",
  more_info: "Mehr Informationen",
  callback: "Rückruf",
  consultation: "Beratung",
  no_interest: "Kein Interesse",
  stop: "STOPP / Abmeldung",
  unclear: "Unklar / manuelle Prüfung",
};

export const ROUTER_PATHS: readonly WorkflowRouterPath[] = [
  "job_seeking",
  "employed",
  "other",
  "more_info",
  "callback",
  "consultation",
  "no_interest",
  "stop",
  "unclear",
] as const;

/**
 * When a classified path has no explicit edge (e.g. an older graph built before
 * the category existed), fall back along this chain so the lead is still routed
 * to the closest sensible output instead of dropping off the graph. Every chain
 * ends at a manual-review / catch-all path so nothing is ever silently lost.
 */
const ROUTER_PATH_FALLBACK: Record<WorkflowRouterPath, WorkflowRouterPath[]> = {
  job_seeking: ["other", "unclear"],
  employed: ["other", "unclear"],
  other: ["unclear"],
  more_info: ["other", "unclear"],
  callback: ["consultation", "other", "unclear"],
  consultation: ["callback", "other", "unclear"],
  no_interest: ["stop", "other", "unclear"],
  stop: ["no_interest", "unclear", "other"],
  unclear: ["other"],
};

/** Node kinds the engine can execute. */
export type WorkflowNodeKind =
  | "trigger"
  | "sendTemplate"
  | "wait"
  | "aiRouter"
  | "condition"
  | "setStatus"
  | "setFunnelPhase"
  | "addTag"
  | "removeTag"
  | "changeScore"
  | "assignOwner"
  | "createTask"
  | "notify"
  | "manualReview"
  | "end";

export const NODE_KIND_LABEL: Record<WorkflowNodeKind, string> = {
  trigger: "Auslöser",
  sendTemplate: "Vorlage senden",
  wait: "Warten / Erinnerung",
  aiRouter: "KI-Antwort-Router",
  condition: "Bedingung (Wenn/Sonst)",
  setStatus: "Lead-Status setzen",
  setFunnelPhase: "Funnel-Phase setzen",
  addTag: "Tag hinzufügen",
  removeTag: "Tag entfernen",
  changeScore: "Score ändern",
  assignOwner: "Bearbeiter zuweisen",
  createTask: "Aufgabe erstellen",
  notify: "Interne Benachrichtigung",
  manualReview: "Manuelle Prüfung",
  end: "Ende",
};

export type WaitUnit = "minutes" | "hours" | "days";

/** A condition kind usable on a `condition` node (Wenn/Sonst gate). */
export type WorkflowConditionType =
  | "funnelStarted"
  | "hasReplied"
  | "hasTag"
  | "leadStatusEquals"
  | "funnelPhaseEquals"
  | "hasWhatsappConsent"
  | "isOptedOut";

export interface WorkflowNode {
  id: string;
  kind: WorkflowNodeKind;
  /** Canvas position (visual builder). */
  x: number;
  y: number;
  label?: string;
  // trigger
  trigger?: WorkflowTrigger;
  // sendTemplate (may be unassigned until the operator picks a template)
  templateId?: string | undefined;
  // wait / reminder
  waitValue?: number;
  waitUnit?: WaitUnit;
  /** Only resume (fire the next reminder) if the lead has NOT replied since. */
  waitRequireNoReply?: boolean;
  /** Abort the wait (skip the reminder) if the lead has started the funnel. */
  waitStopIfFunnelStarted?: boolean;
  // setStatus / setFunnelPhase / tags / score / owner
  status?: string;
  funnelPhase?: string;
  tag?: string;
  score?: number;
  ownerId?: string | undefined;
  // createTask
  taskTitle?: string;
  taskPriority?: "low" | "normal" | "high";
  // notify / manualReview
  note?: string;
  // condition
  conditionType?: WorkflowConditionType;
  conditionValue?: string;
}

export interface WorkflowEdge {
  id: string;
  from: string;
  to: string;
  /** For an `aiRouter` node: which classified path this edge represents. */
  path?: WorkflowRouterPath;
  /** For a `condition` node: the true/false branch. */
  branch?: "true" | "false";
  label?: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export const EMPTY_GRAPH: WorkflowGraph = { nodes: [], edges: [] };

// ── pure traversal helpers ───────────────────────────────────────────────────

export function parseGraph(json: string | null | undefined): WorkflowGraph {
  if (!json) return { nodes: [], edges: [] };
  try {
    const raw = JSON.parse(json) as Partial<WorkflowGraph>;
    return {
      nodes: Array.isArray(raw.nodes) ? raw.nodes : [],
      edges: Array.isArray(raw.edges) ? raw.edges : [],
    };
  } catch {
    return { nodes: [], edges: [] };
  }
}

export function findNode(
  graph: WorkflowGraph,
  nodeId: string | null | undefined,
): WorkflowNode | null {
  if (!nodeId) return null;
  return graph.nodes.find((n) => n.id === nodeId) ?? null;
}

export function triggerNode(graph: WorkflowGraph): WorkflowNode | null {
  return graph.nodes.find((n) => n.kind === "trigger") ?? null;
}

export function outgoingEdges(
  graph: WorkflowGraph,
  nodeId: string,
): WorkflowEdge[] {
  return graph.edges.filter((e) => e.from === nodeId);
}

/** The single next node after a linear (non-branching) node. */
export function nextNodeId(
  graph: WorkflowGraph,
  nodeId: string,
): string | null {
  const edge = graph.edges.find((e) => e.from === nodeId);
  return edge?.to ?? null;
}

/**
 * The target for a specific AI router path. Prefers the exact edge; if the graph
 * has no edge for that category it walks the fallback chain (e.g. Beratung →
 * Rückruf → Sonstige → Unklar) so the lead always lands on the closest wired
 * output. Never returns null unless the router has no outgoing edges at all.
 */
export function routerTargetId(
  graph: WorkflowGraph,
  nodeId: string,
  path: WorkflowRouterPath,
): string | null {
  const edges = outgoingEdges(graph, nodeId);
  const exact = edges.find((e) => e.path === path);
  if (exact) return exact.to;
  for (const alt of ROUTER_PATH_FALLBACK[path] ?? []) {
    const hit = edges.find((e) => e.path === alt);
    if (hit) return hit.to;
  }
  // Last resort: any catch-all edge, then the first outgoing edge.
  const catchAll = edges.find((e) => e.path === "unclear" || e.path === "other");
  return catchAll?.to ?? edges[0]?.to ?? null;
}

/** The target for a condition branch. */
export function conditionTargetId(
  graph: WorkflowGraph,
  nodeId: string,
  branch: "true" | "false",
): string | null {
  const edges = outgoingEdges(graph, nodeId);
  const exact = edges.find((e) => e.branch === branch);
  if (exact) return exact.to;
  // A condition with only a "true" edge falls through to nothing on false.
  return null;
}
