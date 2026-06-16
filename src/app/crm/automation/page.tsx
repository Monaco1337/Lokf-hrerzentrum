import { AutomationAdmin } from "@/features/fairtrain-funnel/crm/AutomationAdmin";
import { automationService } from "@/server/services/AutomationService";

export const dynamic = "force-dynamic";

export default async function AutomationPage() {
  const [templates, logs] = await Promise.all([
    automationService.listTemplates(),
    automationService.listRecentLogs(100),
  ]);

  return <AutomationAdmin templates={templates} logs={logs} />;
}
