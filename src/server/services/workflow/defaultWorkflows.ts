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
  ROUTER_PATHS,
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
  other: "sonstige_situation",
  more_info: "mehr_infos",
  callback: "rueckruf",
  consultation: "beratung",
  no_interest: "kein_interesse",
  stop: "abmeldung",
  unclear: "unklar_pruefen",
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

/** Human task title per callback-style path. */
const TASK_TITLE: Partial<Record<WorkflowRouterPath, string>> = {
  callback: "Rückruf gewünscht – Lead anrufen",
  consultation: "Beratung gewünscht – Termin vereinbaren",
  other: "Sonstige Situation – bitte klären",
};

// Layout grid for the parallel fan-out: each router category is its OWN column
// (spread horizontally) that flows straight DOWN, so the graph reads as one
// central router branching in parallel — never a long chain.
const COL_W = 260;
const ROW_H = 130;

/** Horizontal center of the fan-out, so the router sits above its columns. */
function fanCenterX(baseX: number): number {
  return baseX + ((ROUTER_PATHS.length - 1) * COL_W) / 2;
}

/**
 * Build the nine AI-router path sub-graphs as a PARALLEL fan-out: the router
 * branches into nine independent columns, each flowing straight down. Exactly
 * one column runs per inbound message (the engine picks it) — the others are
 * skipped. Every category has its OWN wired output so the operator can attach a
 * template / task / notice behind each one:
 *   • job_seeking / employed / more_info → tag → send template → end
 *   • callback / consultation           → tag → send template → high task → end
 *   • other (Sonstige)                  → tag → send template → task → end
 *   • no_interest                       → tag → end
 *   • stop (Abmeldung)                  → tag → internal notice → end (no send)
 *   • unclear (manuelle Prüfung)        → tag → manual review (flag + task)
 */
function buildRouterPaths(
  routerId: string,
  baseX: number,
  startY: number,
  paths: Partial<Record<WorkflowRouterPath, string>> = {},
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const nodes: WorkflowNode[] = [];
  const edges: WorkflowEdge[] = [];

  ROUTER_PATHS.forEach((path, i) => {
    const x = baseX + i * COL_W;
    const rowY = (r: number) => startY + r * ROW_H;
    const tagId = `p_${path}_tag`;
    nodes.push(
      node({
        id: tagId,
        kind: "addTag",
        x,
        y: rowY(0),
        tag: PATH_TAG[path],
        label: `Tag: ${PATH_TAG[path]}`,
      }),
    );
    edges.push(edge(`e_router_${path}`, routerId, tagId, { path }));

    // Terminal-only paths (no outbound message).
    if (path === "no_interest") {
      const endId = `p_${path}_end`;
      nodes.push(node({ id: endId, kind: "end", x, y: rowY(1) }));
      edges.push(edge(`e_${path}_end`, tagId, endId));
      return;
    }
    if (path === "stop") {
      const notifyId = `p_${path}_notify`;
      nodes.push(
        node({
          id: notifyId,
          kind: "notify",
          x,
          y: rowY(1),
          note: "Abmeldung/STOPP erkannt – Kontakt zentral sperren und prüfen.",
          label: "Abmeldung prüfen",
        }),
      );
      edges.push(edge(`e_${path}_notify`, tagId, notifyId));
      const endId = `p_${path}_end`;
      nodes.push(node({ id: endId, kind: "end", x, y: rowY(2) }));
      edges.push(edge(`e_${path}_end`, notifyId, endId));
      return;
    }
    if (path === "unclear") {
      const mrId = `p_${path}_manual`;
      nodes.push(
        node({
          id: mrId,
          kind: "manualReview",
          x,
          y: rowY(1),
          note: "Antwort unklar – bitte im Multichat prüfen (keine automatische Nachricht).",
          label: "Manuelle Prüfung",
        }),
      );
      edges.push(edge(`e_${path}_manual`, tagId, mrId));
      return;
    }

    // Paths that send a follow-up template (if the operator assigned one).
    const sendId = `p_${path}_send`;
    nodes.push(
      node({
        id: sendId,
        kind: "sendTemplate",
        x,
        y: rowY(1),
        templateId: paths[path],
        label: `Antwort senden (${PATH_TAG[path]})`,
      }),
    );
    edges.push(edge(`e_${path}_send`, tagId, sendId));

    const taskTitle = TASK_TITLE[path];
    if (taskTitle) {
      const taskId = `p_${path}_task`;
      nodes.push(
        node({
          id: taskId,
          kind: "createTask",
          x,
          y: rowY(2),
          taskTitle,
          taskPriority: path === "other" ? "normal" : "high",
        }),
      );
      edges.push(edge(`e_${path}_task`, sendId, taskId));
      const endId = `p_${path}_end`;
      nodes.push(node({ id: endId, kind: "end", x, y: rowY(3) }));
      edges.push(edge(`e_${path}_end`, taskId, endId));
      return;
    }

    const endId = `p_${path}_end`;
    nodes.push(node({ id: endId, kind: "end", x, y: rowY(2) }));
    edges.push(edge(`e_${path}_end`, sendId, endId));
  });

  return { nodes, edges };
}

/**
 * Read the template assigned to each router path from an existing graph, so a
 * layout rebuild preserves the operator's per-category follow-up choices.
 */
export function extractRouterPathTemplates(
  graph: WorkflowGraph,
): Partial<Record<WorkflowRouterPath, string>> {
  const router = graph.nodes.find((n) => n.kind === "aiRouter");
  if (!router) return {};
  const out: Partial<Record<WorkflowRouterPath, string>> = {};
  for (const e of graph.edges) {
    if (e.from !== router.id || !e.path) continue;
    // Follow the linear (non-path) chain from the tag node until a sendTemplate.
    let cur: string | undefined = e.to;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const n = graph.nodes.find((x) => x.id === cur);
      if (!n) break;
      if (n.kind === "sendTemplate" && n.templateId) {
        out[e.path] = n.templateId;
        break;
      }
      cur = graph.edges.find((ed) => ed.from === cur && !ed.path)?.to;
    }
  }
  return out;
}

/** The full reactivation + routing process. */
export function buildReactivationGraph(t: ReactivationTemplateIds): WorkflowGraph {
  // Reminder sequence in its own left column; the reply router fans out to the
  // right so both flows read cleanly side by side.
  const fanBaseX = 560;
  const routerX = fanCenterX(fanBaseX);
  const nodes: WorkflowNode[] = [
    node({ id: "trigger", kind: "trigger", x: 40, y: 40, trigger: "CAMPAIGN_ENROLL", label: "In Reaktivierung aufgenommen" }),
    node({ id: "send_tag0", kind: "sendTemplate", x: 40, y: 180, templateId: t.tag0, label: "Erstkontakt (Tag 0)" }),
    node({ id: "wait_1", kind: "wait", x: 40, y: 320, waitValue: 3, waitUnit: "days", waitRequireNoReply: true, waitStopIfFunnelStarted: true, label: "3 Tage warten (keine Antwort)" }),
    node({ id: "send_followup1", kind: "sendTemplate", x: 40, y: 460, templateId: t.followup1, label: "Erinnerung 1 (Tag 3)" }),
    node({ id: "wait_2", kind: "wait", x: 40, y: 600, waitValue: 4, waitUnit: "days", waitRequireNoReply: true, waitStopIfFunnelStarted: true, label: "4 Tage warten (keine Antwort)" }),
    node({ id: "send_followup2", kind: "sendTemplate", x: 40, y: 740, templateId: t.followup2, label: "Erinnerung 2 (Tag 7)" }),
    node({ id: "end_main", kind: "end", x: 40, y: 880, label: "Sequenz beendet" }),
    node({ id: "router", kind: "aiRouter", x: routerX, y: 40, label: "KI-Router: Antwort erhalten" }),
  ];
  const edges: WorkflowEdge[] = [
    edge("e_trigger", "trigger", "send_tag0"),
    edge("e_tag0_wait1", "send_tag0", "wait_1"),
    edge("e_wait1_fu1", "wait_1", "send_followup1"),
    edge("e_fu1_wait2", "send_followup1", "wait_2"),
    edge("e_wait2_fu2", "wait_2", "send_followup2"),
    edge("e_fu2_end", "send_followup2", "end_main"),
  ];
  const routed = buildRouterPaths("router", fanBaseX, 200, t.paths);
  nodes.push(...routed.nodes);
  edges.push(...routed.edges);
  return { nodes, edges };
}

/**
 * Standalone inbound router: "WhatsApp-Antwort erhalten" → ONE central KI router
 * → all nine categories fan out in parallel below it. Per inbound message the
 * engine activates exactly one column and skips the rest.
 */
export function buildInboundRouterGraph(
  paths: Partial<Record<WorkflowRouterPath, string>> = {},
): WorkflowGraph {
  const baseX = 40;
  const centerX = fanCenterX(baseX);
  const nodes: WorkflowNode[] = [
    node({ id: "trigger", kind: "trigger", x: centerX, y: 40, trigger: "MESSAGE_INBOUND", label: "WhatsApp-Antwort erhalten" }),
    node({ id: "router", kind: "aiRouter", x: centerX, y: 200, label: "KI-Antwort-Router" }),
  ];
  const edges: WorkflowEdge[] = [edge("e_trigger", "trigger", "router")];
  const routed = buildRouterPaths("router", baseX, 380, paths);
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
