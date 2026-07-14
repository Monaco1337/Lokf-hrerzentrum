/**
 * /crm/multichat — the unified WhatsApp inbox ("Multichat").
 *
 * Shows every WhatsApp conversation across ALL business numbers in one place,
 * with per-number/rep filters and inline reply (reply goes out from the same
 * number the thread uses). Auth-gated like the rest of the CRM; replying is
 * gated on `canManageLeads` inside the server action.
 */
import { requireCrmUser } from "@/server/actions/_helpers";
import { getWhatsAppConfigStatus } from "@/server/services/messaging/whatsappService";
import { loadMultichat } from "@/server/services/MultichatService";
import { AutoRefresh } from "@/features/fairtrain-funnel/crm/operations/AutoRefresh";
import { MultichatInbox } from "@/features/fairtrain-funnel/crm/messaging/MultichatInbox";

export const dynamic = "force-dynamic";

export default async function MultichatPage() {
  await requireCrmUser();
  const live = getWhatsAppConfigStatus().isLive;
  const data = await loadMultichat(live);
  return (
    <>
      {/* Near-real-time: pull new inbound messages + status changes in. */}
      <AutoRefresh intervalMs={12000} />
      <MultichatInbox data={data} />
    </>
  );
}
