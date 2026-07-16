/**
 * /crm/callback-requests — "Rückrufe angefordert".
 *
 * Alt-Leads (Reaktivierung) never appear in the Dashboard/Leads/Pipeline by
 * default. The one exception: once the AI detects a callback/consultation
 * request from a reactivated Alt-Lead in Multichat, it is opened here with
 * everything an operator needs to act (name, phone, request time, full chat
 * history, last inbound message, status) — until the Alt-Lead itself
 * starts/completes the Eignungscheck and becomes a normal lead.
 */
import { AutoRefresh } from "@/features/fairtrain-funnel/crm/operations/AutoRefresh";
import { CallbackRequestsInbox } from "@/features/fairtrain-funnel/crm/messaging/CallbackRequestsInbox";
import { requireCrmUser } from "@/server/actions/_helpers";
import { loadCallbackRequests } from "@/server/services/CallbackRequestsLoader";
import { getWhatsAppConfigStatus } from "@/server/services/messaging/whatsappService";

export const dynamic = "force-dynamic";

export default async function CallbackRequestsPage() {
  await requireCrmUser();
  const live = getWhatsAppConfigStatus().isLive;
  const data = await loadCallbackRequests(live);
  return (
    <>
      <AutoRefresh intervalMs={30000} />
      <CallbackRequestsInbox data={data} />
    </>
  );
}
