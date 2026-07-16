import { notFound } from "next/navigation";

import { LeadDetail } from "@/features/fairtrain-funnel/crm/LeadDetail";
import { requireCrmUser } from "@/server/actions/_helpers";
import { ForbiddenError, NotFoundError } from "@/server/errors";
import { taskRepository } from "@/server/repositories/TaskRepository";
import { assertCanAccessLead } from "@/server/services/LeadAccess";
import { leadService } from "@/server/services/LeadService";
import { leadInsightsService } from "@/server/services/LeadInsightsService";
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
    const whatsappLive = getWhatsAppConfigStatus().isLive;
    const [data, assignees, tasks] = await Promise.all([
      leadService.getFullDetail(id),
      userService.list({ includeInactive: false }),
      taskRepository.list({ leadId: id, includeDone: true }),
    ]);
    const insights = await leadInsightsService.enrichOne(data.lead);
    return (
      <LeadDetail
        data={data}
        currentUser={currentUser}
        assignees={assignees}
        tasks={tasks}
        whatsappLive={whatsappLive}
        insights={insights}
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
