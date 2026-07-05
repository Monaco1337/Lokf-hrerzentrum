/**
 * /crm/settings/whatsapp-numbers — manage the WhatsApp Business sender fleet.
 *
 * Each number is a Meta Cloud API `phone_number_id` + label + owning rep. All
 * numbers share one WABA + token (env), so adding a number here makes it live
 * immediately — no deploy. Gated on `canManageSettings`.
 */
import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { requireCrmUser } from "@/server/actions/_helpers";
import { whatsAppNumberRepository } from "@/server/repositories/WhatsAppNumberRepository";
import { getWhatsAppConfigStatus } from "@/server/services/messaging/whatsappService";
import { userService } from "@/server/services/UserService";
import { WhatsAppNumberAdmin } from "@/features/fairtrain-funnel/crm/messaging/WhatsAppNumberAdmin";

export const dynamic = "force-dynamic";

export default async function WhatsAppNumbersPage() {
  const user = await requireCrmUser();
  if (!can(user.role, "canManageSettings")) {
    redirect("/crm");
  }

  const [numbers, users, config] = await Promise.all([
    whatsAppNumberRepository.list(),
    userService.list({ includeInactive: false }),
    Promise.resolve(getWhatsAppConfigStatus()),
  ]);

  const reps = users.map((u) => ({ id: u.id, name: u.name, role: u.role }));

  return (
    <WhatsAppNumberAdmin
      initialNumbers={numbers}
      reps={reps}
      config={config}
    />
  );
}
