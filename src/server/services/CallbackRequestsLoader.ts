/**
 * Loader for the "Rückrufe angefordert" page: combines the open Alt-Lead
 * callback-request queue (`LeadRepository.listCallbackRequests`) with each
 * lead's full WhatsApp chat history, so the UI has everything it needs
 * (name, phone, request time, chat history, last inbound message, current
 * status) in a single server-side load.
 */
import { FUNNEL_PHASE_LABEL, parseFunnelPhase } from "@/features/fairtrain-funnel/funnelPhase";
import type {
  CallbackRequestItem,
  CallbackRequestsData,
} from "@/features/fairtrain-funnel/messaging/types";

import { leadRepository } from "../repositories/LeadRepository";
import { loadMultichatConversationForLead } from "./MultichatService";

export type { CallbackRequestItem, CallbackRequestsData };

export async function loadCallbackRequests(
  whatsappLive: boolean,
): Promise<CallbackRequestsData> {
  const leads = await leadRepository.listCallbackRequests();

  const items = await Promise.all(
    leads.map(async (lead) => {
      const { conversation } = await loadMultichatConversationForLead(
        lead.id,
        whatsappLive,
      );
      const phase = parseFunnelPhase(lead.funnelPhase);
      return {
        leadId: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        email: lead.email,
        callbackRequestedAt: (lead.callbackRequestedAt ?? lead.updatedAt).toISOString(),
        funnelPhase: phase,
        funnelPhaseLabel: FUNNEL_PHASE_LABEL[phase],
        lastInboundMessage: lead.lastInboundMessage ?? null,
        lastInboundMessageAt: lead.lastInboundMessageAt
          ? lead.lastInboundMessageAt.toISOString()
          : null,
        conversation,
      } satisfies CallbackRequestItem;
    }),
  );

  return { items, whatsappLive };
}
