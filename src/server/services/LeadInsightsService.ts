/**
 * LeadInsightsService — per-lead intelligence orchestrator.
 *
 * Combines the pure `computeLeadInsights` engine with a single batched
 * repository call to enrich an entire list of leads in one DB round-trip.
 * Designed to be drop-in callable from the dashboard / leads page server
 * components without N+1 queries.
 *
 * Architecture: Service → Repository → Prisma. The service never imports
 * `prisma` directly.
 */
import { computeLeadInsights } from "@/features/fairtrain-funnel/intelligence/leadInsights";
import type {
  EnrichedLeadSummary,
  LeadInsights,
  LeadSummary,
} from "@/features/fairtrain-funnel/types";

import { communicationRepository } from "../repositories/CommunicationRepository";

export class LeadInsightsService {
  /**
   * Enrich an arbitrary lead list. Outbound communications are looked up in
   * a single batched query so this scales with the typical CRM page size.
   */
  async enrich(
    leads: ReadonlyArray<LeadSummary>,
    now: Date = new Date(),
  ): Promise<EnrichedLeadSummary[]> {
    if (leads.length === 0) return [];
    const ids = leads.map((l) => l.id);
    const lastOutbound = await communicationRepository.lastOutboundPerLead(ids);
    return leads.map((lead) => ({
      lead,
      insights: computeLeadInsights({
        lead,
        lastOutboundAt: lastOutbound.get(lead.id) ?? null,
        now,
      }),
    }));
  }

  /** Single-lead enrichment — used by the lead detail page. */
  async enrichOne(
    lead: LeadSummary,
    now: Date = new Date(),
  ): Promise<LeadInsights> {
    const map = await communicationRepository.lastOutboundPerLead([lead.id]);
    return computeLeadInsights({
      lead,
      lastOutboundAt: map.get(lead.id) ?? null,
      now,
    });
  }
}

export const leadInsightsService = new LeadInsightsService();
