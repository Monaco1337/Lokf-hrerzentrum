import { AutomationAdmin } from "@/features/fairtrain-funnel/crm/AutomationAdmin";
import { parseGraph } from "@/features/fairtrain-funnel/automation/workflow/graph";
import type { WorkflowSummary } from "@/features/fairtrain-funnel/automation/workflow/types";
import { isWorkflowEngineEnabled } from "@/server/env";
import { automationService } from "@/server/services/AutomationService";
import { whatsAppNumberRepository } from "@/server/repositories/WhatsAppNumberRepository";
import { workflowDefinitionRepository } from "@/server/repositories/WorkflowDefinitionRepository";
import { workflowRunRepository } from "@/server/repositories/WorkflowRunRepository";
import { userService } from "@/server/services/UserService";

export const dynamic = "force-dynamic";

async function loadWorkflows(): Promise<WorkflowSummary[]> {
  try {
    const [defs, counts] = await Promise.all([
      workflowDefinitionRepository.list(),
      workflowRunRepository.countLiveByDefinition(),
    ]);
    return defs.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      processKey: d.processKey,
      trigger: d.trigger,
      status: d.status,
      version: d.version,
      graph: parseGraph(d.graph),
      liveRuns: counts[d.id] ?? 0,
      updatedAt: d.updatedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export default async function AutomationPage() {
  const [
    templates,
    rules,
    logs,
    runLogs,
    previewLeads,
    whatsappNumbers,
    users,
    workflows,
  ] = await Promise.all([
    automationService.listTemplates(),
    automationService.listRules(),
    automationService.listRecentLogs(100),
    automationService.listRunLogs(100),
    automationService.previewLeadContexts(8),
    whatsAppNumberRepository.listActive(),
    userService.list({ includeInactive: false }),
    loadWorkflows(),
  ]);

  return (
    <AutomationAdmin
      templates={templates}
      rules={rules}
      logs={logs}
      runLogs={runLogs}
      previewLeads={previewLeads}
      whatsappNumbers={whatsappNumbers.map((n) => ({
        phoneNumberId: n.phoneNumberId,
        label: n.label,
        displayPhone: n.displayPhone,
      }))}
      users={users.map((u) => ({ id: u.id, name: u.name }))}
      workflows={workflows}
      engineEnabled={isWorkflowEngineEnabled()}
    />
  );
}
