/**
 * Pure mapping from the deterministic reply analysis to a workflow router path.
 * Kept dependency-free (type-only imports) so it is unit-testable without loading
 * the server environment.
 */
import type { ReplyAnalysis, ReplyIntent } from "../ReplyIntentClassifier";
import type { WorkflowRouterPath } from "@/features/fairtrain-funnel/automation/workflow/graph";

/** Map the deterministic intent onto one of the router paths. */
export function intentToPath(intent: ReplyIntent): WorkflowRouterPath {
  switch (intent) {
    case "stop":
      return "stop";
    case "no_interest":
      return "no_interest";
    case "callback":
      return "callback";
    case "consultation":
      return "consultation";
    case "question":
    case "general_interest":
      return "more_info";
    case "job_seeking":
      return "job_seeking";
    case "employed":
    case "job_insecure":
    case "career_change":
      return "employed";
    case "other":
      return "other";
    default:
      return "unclear";
  }
}

/**
 * Resolve the router path for a full analysis. Ambiguous replies (manualReview)
 * always route to "unclear" so the engine never sends a wrong follow-up — the
 * lead is flagged for a human instead.
 */
export function pathForAnalysis(analysis: ReplyAnalysis): WorkflowRouterPath {
  if (analysis.manualReview) return "unclear";
  return intentToPath(analysis.intent);
}
