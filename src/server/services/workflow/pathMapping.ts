/**
 * Pure mapping from the deterministic reply intent to a workflow router path.
 * Kept dependency-free (type-only import) so it is unit-testable without loading
 * the server environment.
 */
import type { ReplyIntent } from "../ReplyIntentClassifier";
import type { WorkflowRouterPath } from "@/features/fairtrain-funnel/automation/workflow/graph";

/** Map the deterministic intent onto one of the six visible router paths. */
export function intentToPath(intent: ReplyIntent): WorkflowRouterPath {
  switch (intent) {
    case "job_seeking":
      return "job_seeking";
    case "employed":
    case "job_insecure":
    case "career_change":
      return "employed";
    case "general_interest":
    case "question":
      return "more_info";
    case "callback":
      return "callback";
    case "no_interest":
    case "stop":
      return "no_interest";
    default:
      return "other";
  }
}
