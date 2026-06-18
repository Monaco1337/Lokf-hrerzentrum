import { notFound } from "next/navigation";

import { LeadDetail } from "@/features/fairtrain-funnel/crm/LeadDetail";
import { requireCrmUser } from "@/server/actions/_helpers";
import { ForbiddenError, NotFoundError } from "@/server/errors";
import { taskRepository } from "@/server/repositories/TaskRepository";
import { automationService } from "@/server/services/AutomationService";
import { assertCanAccessLead } from "@/server/services/LeadAccess";
import { leadService } from "@/server/services/LeadService";
import { getWhatsAppConfigStatus } from "@/server/services/messaging/whatsappService";
import { userService } from "@/server/services/UserService";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await requireCrmUser();
  try {
    await assertCanAccessLead(currentUser, id);
    const [data, automationTemplates, assignees, tasks] = await Promise.all([
      leadService.getFullDetail(id),
      automationService.listTemplates(),
      userService.list({ includeInactive: false }),
      taskRepository.list({ leadId: id, includeDone: true }),
    ]);
    return (
      <LeadDetail
        data={data}
        automationTemplates={automationTemplates}
        currentUser={currentUser}
        assignees={assignees}
        tasks={tasks}
        whatsappLive={getWhatsAppConfigStatus().isLive}
      />
    );
  } catch (err) {
    // Treat "no access" and "not found" identically — never leak the
    // existence of a lead to an actor that isn't allowed to see it.
    if (err instanceof NotFoundError || err instanceof ForbiddenError) {
      notFound();
    }
    throw err;
  }
}
