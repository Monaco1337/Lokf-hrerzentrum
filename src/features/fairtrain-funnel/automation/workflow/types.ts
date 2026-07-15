/**
 * Serializable DTOs passed from the server to the workflow builder UI.
 */
import type {
  WorkflowGraph,
  WorkflowProcessKey,
  WorkflowTrigger,
} from "./graph";

export type WorkflowUiStatus = "draft" | "active" | "inactive";

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string | null;
  processKey: WorkflowProcessKey;
  trigger: WorkflowTrigger;
  status: WorkflowUiStatus;
  version: number;
  graph: WorkflowGraph;
  /** How many leads this workflow is currently driving (live runs). */
  liveRuns: number;
  updatedAt: string;
}

/** Minimal template option for the send-node dropdown. */
export interface WorkflowTemplateOption {
  id: string;
  name: string;
  channel: string;
}
