import { AutomationAdmin } from "@/features/fairtrain-funnel/crm/AutomationAdmin";
import { automationService } from "@/server/services/AutomationService";
import { whatsAppNumberRepository } from "@/server/repositories/WhatsAppNumberRepository";
import { userService } from "@/server/services/UserService";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const [templates, rules, logs, runLogs, previewLeads, whatsappNumbers, users] =
    await Promise.all([
      automationService.listTemplates(),
      automationService.listRules(),
      automationService.listRecentLogs(100),
      automationService.listRunLogs(100),
      automationService.previewLeadContexts(8),
      whatsAppNumberRepository.listActive(),
      userService.list({ includeInactive: false }),
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
    />
  );
}
