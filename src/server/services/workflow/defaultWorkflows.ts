/**
 * Default workflow graphs — the ONE unified process, expressed as graphs the
 * engine can run and the visual builder can render/edit. Seeded once; fully
 * editable afterwards. Pure (no I/O): template IDs are injected by the seeder.
 *
 * Reactivation = release → first contact → (no reply) reminder → reminder,
 * with a KI router that, on ANY reply, sends the ONE fitting follow-up. So the
 * reminder chain AND the reply routing live in a single process — a lead never
 * gets two messages at once.
 */
import {
  type WorkflowEdge,
  type WorkflowGraph,
  type WorkflowNode,
  type WorkflowRouterPath,
} from "@/features/fairtrain-funnel/automation/workflow/graph";

export const WORKFLOW_NAME = {
  reactivation: "WhatsApp Reaktivierung & KI-Routing",
  inboundRouter: "WhatsApp Antwort-Router (KI)",
  application: "Bewerbungsprozess",
} as const;

/** Situation tag written per router path (mirrors the existing tag vocabulary). */
const PATH_TAG: Record<WorkflowRouterPath, string> = {
  job_seeking: "arbeitssuchend",
  employed: "beschaeftigt",
  more_info: "mehr_infos",
  callback: "rueckruf",
  no_interest: "kein_interesse",
  other: "sonstige_situation",
};

export interface ReactivationTemplateIds {
  tag0?: string | undefined;
  followup1?: string | undefined;
  followup2?: string | undefined;
  /** Optional per-path follow-up templates (user assigns in the builder). */
  paths?: Partial<Record<WorkflowRouterPath, string>> | undefined;
}

function node(n: WorkflowNode): WorkflowNode {
  return n;
}

function edge(id: string, from: string, to: string, extra?: Partial<WorkflowEdge>): WorkflowEdge {
  return { id, from, to, ...extra };
}

/**
 * Build the six AI-router path sub-graphs. Each path: tag the lead, send the
 * fitting template (if assigned), then a sensible terminal (end / manual review
 * / callback task). Returns the nodes + edges plus the router node id.
 */
function buildRouterPaths(
  routerId: string,
  baseX: number,
  paths: Partial<Record<WorkflowRouterPath, string>> = {},
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];
  const order: WorkflowRouterPath[] = [
    "job_seeking",
    "employed",
    "more_info",
    "callback",
    "no_interest",
    "other",
  ];

  order.forEach((path, i) => {
    const y = 120 + i * 150;
    const tagId = `p_${path}_tag`;
    nodes.push(
      node({
        id: tagId,
        kind: "addTag",
        x: baseX + 320,
        y,
        tag: PATH_TAG[path],
        label: `Tag: ${PATH_TAG[path]}`,
      }),
    );
    edges.push(edge(`e_router_${path}`, routerId, tagId, { path }));

    if (path === "no_interest") {
      const endId = `p_${path}_end`;
      nodes.push(node({ id: endId, kind: "end", x: baseX + 640, y }));
      edges.push(edge(`e_${path}_end`, tagId, endId));
      return;
    }
    if (path === "other") {
      const mrId = `p_${path}_manual`;
      nodes.push(
        node({
          id: mrId,
          kind: "manualReview",
          x: baseX + 640,
          y,
          note: "Antwort unklar – bitte im Multichat prüfen.",
        }),
      );
      edges.push(edge(`e_${path}_manual`, tagId, mrId));
      return;
    }

    const sendId = `p_${path}_send`;
    nodes.push(
      node({
        id: sendId,
        kind: "sendTemplate",
        x: baseX + 640,
        y,
        templateId: paths[path],
        label: `Antwort senden (${path})`,
      }),
    );
    edges.push(edge(`e_${path}_send`, tagId, sendId));

    if (path === "callback") {
      const taskId = `p_${path}_task`;
      nodes.push(
        node({
          id: taskId,
          kind: "createTask",
          x: baseX + 960,
          y,
          taskTitle: "Rückruf gewünscht – Lead anrufen",
          taskPriority: "high",
        }),
      );
      edges.push(edge(`e_${path}_task`, sendId, taskId));
      const endId = `p_${path}_end`;
      nodes.push(node({ id: endId, kind: "end", x: baseX + 1280, y }));
      edges.push(edge(`e_${path}_end`, taskId, endId));
      return;
    }

    const endId = `p_${path}_end`;
    nodes.push(node({ id: endId, kind: "end", x: baseX + 960, y }));
    edges.push(edge(`e_${path}_end`, sendId, endId));
  });

  return { nodes, edges };
}

/** The full reactivation + routing process. */
export function buildReactivationGraph(t: ReactivationTemplateIds): WorkflowGraph {
  const nodes: WorkflowNode[] = [
    node({ id: "trigger", kind: "trigger", x: 40, y: 40, trigger: "CAMPAIGN_ENROLL", label: "In Reaktivierung aufgenommen" }),
    node({ id: "send_tag0", kind: "sendTemplate", x: 40, y: 180, templateId: t.tag0, label: "Erstkontakt (Tag 0)" }),
    node({ id: "wait_1", kind: "wait", x: 40, y: 320, waitValue: 3, waitUnit: "days", waitRequireNoReply: true, waitStopIfFunnelStarted: true, label: "3 Tage warten (keine Antwort)" }),
    node({ id: "send_followup1", kind: "sendTemplate", x: 40, y: 460, templateId: t.followup1, label: "Erinnerung 1 (Tag 3)" }),
    node({ id: "wait_2", kind: "wait", x: 40, y: 600, waitValue: 4, waitUnit: "days", waitRequireNoReply: true, waitStopIfFunnelStarted: true, label: "4 Tage warten (keine Antwort)" }),
    node({ id: "send_followup2", kind: "sendTemplate", x: 40, y: 740, templateId: t.followup2, label: "Erinnerung 2 (Tag 7)" }),
    node({ id: "end_main", kind: "end", x: 40, y: 880, label: "Sequenz beendet" }),
    node({ id: "router", kind: "aiRouter", x: 620, y: 40, label: "KI-Router: Antwort erhalten" }),
  ];
  const edges: WorkflowEdge[] = [
    edge("e_trigger", "trigger", "send_tag0"),
    edge("e_tag0_wait1", "send_tag0", "wait_1"),
    edge("e_wait1_fu1", "wait_1", "send_followup1"),
    edge("e_fu1_wait2", "send_followup1", "wait_2"),
    edge("e_wait2_fu2", "wait_2", "send_followup2"),
    edge("e_fu2_end", "send_followup2", "end_main"),
  ];
  const routed = buildRouterPaths("router", 620, t.paths);
  nodes.push(...routed.nodes);
  edges.push(...routed.edges);
  return { nodes, edges };
}

/** Standalone inbound router: any reply → classify → one fitting path. */
export function buildInboundRouterGraph(
  paths: Partial<Record<WorkflowRouterPath, string>> = {},
): WorkflowGraph {
  const nodes: WorkflowNode[] = [
    node({ id: "trigger", kind: "trigger", x: 40, y: 40, trigger: "MESSAGE_INBOUND", label: "WhatsApp-Antwort erhalten" }),
    node({ id: "router", kind: "aiRouter", x: 300, y: 40, label: "KI-Router" }),
  ];
  const edges: WorkflowEdge[] = [edge("e_trigger", "trigger", "router")];
  const routed = buildRouterPaths("router", 300, paths);
  nodes.push(...routed.nodes);
  edges.push(...routed.edges);
  return { nodes, edges };
}

/** Minimal application process: funnel start → set phase → sales task. */
export function buildApplicationGraph(): WorkflowGraph {
  const nodes: WorkflowNode[] = [
    node({ id: "trigger", kind: "trigger", x: 40, y: 40, trigger: "FUNNEL_STARTED", label: "Funnel gestartet" }),
    node({ id: "phase", kind: "setFunnelPhase", x: 40, y: 180, funnelPhase: "eligibility_started", label: "Phase: Eignungscheck gestartet" }),
    node({ id: "task", kind: "createTask", x: 40, y: 320, taskTitle: "Neuer Funnel-Lead – bearbeiten", taskPriority: "high", label: "Aufgabe: Lead bearbeiten" }),
    node({ id: "end", kind: "end", x: 40, y: 460 }),
  ];
  const edges: WorkflowEdge[] = [
    edge("e_trigger", "trigger", "phase"),
    edge("e_phase_task", "phase", "task"),
    edge("e_task_end", "task", "end"),
  ];
  return { nodes, edges };
}
