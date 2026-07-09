/**
 * /crm/import — bulk Alt-Lead import (Excel/CSV).
 *
 * Imported contacts are created as paused Alt-Leads (no automation, no send).
 * Sending starts only after a manual campaign release. Gated on canManageLeads.
 */
import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { LeadImportWizard } from "@/features/fairtrain-funnel/crm/import/LeadImportWizard";
import { requireCrmUser } from "@/server/actions/_helpers";

export const dynamic = "force-dynamic";

export default async function LeadImportPage() {
  const user = await requireCrmUser();
  if (!can(user.role, "canManageLeads")) {
    redirect("/crm");
  }
  return <LeadImportWizard />;
}
