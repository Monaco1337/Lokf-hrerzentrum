import { describe, expect, it } from "vitest";

import {
  conditionTargetId,
  nextNodeId,
  parseGraph,
  ROUTER_PATHS,
  routerTargetId,
  triggerNode,
  type WorkflowGraph,
} from "@/features/fairtrain-funnel/automation/workflow/graph";
import {
  buildInboundRouterGraph,
  buildReactivationGraph,
  extractRouterPathTemplates,
} from "@/server/services/workflow/defaultWorkflows";

describe("workflow graph — pure traversal helpers", () => {
  const graph: WorkflowGraph = {
    nodes: [
      { id: "t", kind: "trigger", x: 0, y: 0 },
      { id: "a", kind: "sendTemplate", x: 0, y: 1 },
      { id: "r", kind: "aiRouter", x: 0, y: 2 },
      { id: "x", kind: "end", x: 0, y: 3 },
      { id: "y", kind: "end", x: 0, y: 4 },
      { id: "c", kind: "condition", x: 0, y: 5 },
    ],
    edges: [
      { id: "e1", from: "t", to: "a" },
      { id: "e2", from: "r", to: "x", path: "job_seeking" },
      { id: "e3", from: "r", to: "y", path: "other" },
      { id: "e4", from: "c", to: "x", branch: "true" },
    ],
  };

  it("parseGraph tolerates invalid JSON", () => {
    expect(parseGraph("not json")).toEqual({ nodes: [], edges: [] });
    expect(parseGraph(null)).toEqual({ nodes: [], edges: [] });
  });

  it("finds the trigger node", () => {
    expect(triggerNode(graph)?.id).toBe("t");
  });

  it("nextNodeId returns the single linear successor", () => {
    expect(nextNodeId(graph, "t")).toBe("a");
    expect(nextNodeId(graph, "x")).toBeNull();
  });

  it("routerTargetId picks the exact path, else falls back to 'other'", () => {
    expect(routerTargetId(graph, "r", "job_seeking")).toBe("x");
    // no explicit edge for 'callback' → fall back to the 'other' edge.
    expect(routerTargetId(graph, "r", "callback")).toBe("y");
  });

  it("conditionTargetId resolves branch edges", () => {
    expect(conditionTargetId(graph, "c", "true")).toBe("x");
    expect(conditionTargetId(graph, "c", "false")).toBeNull();
  });
});

describe("default workflows", () => {
  it("reactivation graph: enroll trigger, reminder waits stop on funnel/reply, all router paths present", () => {
    const g = buildReactivationGraph({ tag0: "T0", followup1: "F1", followup2: "F2" });
    const trig = triggerNode(g);
    expect(trig?.trigger).toBe("CAMPAIGN_ENROLL");

    // Tag-0 template wired through.
    const tag0 = g.nodes.find((n) => n.id === "send_tag0");
    expect(tag0?.templateId).toBe("T0");

    // Reminder waits must never race a reply or a funnel start.
    const waits = g.nodes.filter((n) => n.kind === "wait");
    expect(waits.length).toBeGreaterThanOrEqual(2);
    for (const w of waits) {
      expect(w.waitStopIfFunnelStarted).toBe(true);
      expect(w.waitRequireNoReply).toBe(true);
    }

    // The KI router exposes exactly one edge per path.
    const router = g.nodes.find((n) => n.kind === "aiRouter");
    expect(router).toBeTruthy();
    const paths = g.edges.filter((e) => e.from === router!.id).map((e) => e.path);
    for (const p of ROUTER_PATHS) expect(paths).toContain(p);
  });

  it("inbound router graph: MESSAGE_INBOUND trigger → router → all nine paths", () => {
    const g = buildInboundRouterGraph();
    expect(triggerNode(g)?.trigger).toBe("MESSAGE_INBOUND");
    const router = g.nodes.find((n) => n.kind === "aiRouter")!;
    const paths = g.edges.filter((e) => e.from === router.id).map((e) => e.path);
    for (const p of ROUTER_PATHS) expect(paths).toContain(p);
  });

  it("inbound router is a PURE parallel fan-out: one edge per path, no extras", () => {
    const g = buildInboundRouterGraph();
    const router = g.nodes.find((n) => n.kind === "aiRouter")!;
    const outgoing = g.edges.filter((e) => e.from === router.id);
    // Exactly one outgoing edge per category — the router never chains.
    expect(outgoing.length).toBe(ROUTER_PATHS.length);
    const distinct = new Set(outgoing.map((e) => e.path));
    expect(distinct.size).toBe(ROUTER_PATHS.length);
    // The trigger flows only into the router (single central entry).
    const trig = triggerNode(g)!;
    const fromTrigger = g.edges.filter((e) => e.from === trig.id);
    expect(fromTrigger.length).toBe(1);
    expect(fromTrigger[0]!.to).toBe(router.id);
  });

  it("router selects exactly one path and skips the others", () => {
    const g = buildInboundRouterGraph();
    const router = g.nodes.find((n) => n.kind === "aiRouter")!;
    const jobTarget = routerTargetId(g, router.id, "job_seeking");
    const stopTarget = routerTargetId(g, router.id, "stop");
    expect(jobTarget).toBeTruthy();
    expect(stopTarget).toBeTruthy();
    // Distinct categories resolve to distinct branch entries.
    expect(jobTarget).not.toBe(stopTarget);
  });

  it("layout rebuild preserves the per-path templates", () => {
    const g = buildInboundRouterGraph({ callback: "TPL_CB", employed: "TPL_EMP" });
    const extracted = extractRouterPathTemplates(g);
    expect(extracted.callback).toBe("TPL_CB");
    expect(extracted.employed).toBe("TPL_EMP");
    // Round-trip: rebuilding from the extracted map keeps them wired.
    const rebuilt = buildInboundRouterGraph(extracted);
    expect(extractRouterPathTemplates(rebuilt)).toEqual(extracted);
  });
});
