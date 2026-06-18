import { AutomationAdmin } from "@/features/fairtrain-funnel/crm/AutomationAdmin";
import { automationService } from "@/server/services/AutomationService";
import { userService } from "@/server/services/UserService";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const [templates, rules, logs, runLogs, previewLeads, users] =
    await Promise.all([
      automationService.listTemplates(),
      automationService.listRules(),
      automationService.listRecentLogs(100),
      automationService.listRunLogs(100),
      automationService.previewLeadContexts(8),
      userService.list({ includeInactive: false }),
    ]);

  return (
    <AutomationAdmin
      templates={templates}
      rules={rules}
      logs={logs}
      runLogs={runLogs}
      previewLeads={previewLeads}
      users={users.map((u) => ({ id: u.id, name: u.name }))}
    />
  );
}
