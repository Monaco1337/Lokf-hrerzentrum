/**
 * Workflow studio entry point.
 *
 * Importing from this module guarantees all domain plugins are registered
 * before the builder reads the catalog. New modules (Bewerber, Kunden,
 * Rechnungen …) are added by importing + registering their plugin here — the
 * builder itself never changes.
 */
import { leadsPlugin } from "./leadsPlugin";
import { registerWorkflowPlugin } from "./registry";

registerWorkflowPlugin(leadsPlugin);

export * from "./registry";
export { leadsPlugin };
