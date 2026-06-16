/**
 * LeadIntelligenceRepository — read-only aggregations that feed the Lead
 * Control Center briefing.
 *
 * Separated from `LeadRepository` so the core lead CRUD stays small and
 * focused. The Intelligence repo only ever does count queries; it never
 * writes and never reads full rows.
 *
 * Architecture:
 *   LeadIntelligenceService → LeadIntelligenceRepository → Prisma
 */
import { LeadStatus } from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";

export interface PriorityBucketCounts {
  hotPending: number;
  slaBreached: number;
  dropoffRisk: number;
  docsPending: number;
  aaPending: number;
  voucherPending: number;
}

export interface PriorityBucketsInput {
  dropoffCutoff: Date;
  staleStatuses: ReadonlyArray<LeadStatus>;
}

export class LeadIntelligenceRepository {
  /**
   * Count buckets that feed the Lead Control Center briefing row.
   * Raw counts only — tone/label decisions live in the service layer so this
   * repository stays presentation-agnostic.
   */
  async aggregatePriorityBuckets(
    opts: PriorityBucketsInput,
  ): Promise<PriorityBucketCounts> {
    const [
      hotPending,
      slaBreached,
      dropoffRisk,
      docsPending,
      aaPending,
      voucherPending,
    ] = await Promise.all([
      prisma.lead.count({
        where: {
          deletedAt: null,
          priority: "HOT",
          status: {
            in: [
              LeadStatus.NEW,
              LeadStatus.QUALIFIED,
              LeadStatus.HOT,
              LeadStatus.CONTACT_PENDING,
            ],
          },
        },
      }),
      prisma.lead.count({
        where: {
          deletedAt: null,
          priority: "HOT",
          slaBreachedAt: { not: null },
          status: {
            in: [
              LeadStatus.NEW,
              LeadStatus.QUALIFIED,
              LeadStatus.HOT,
              LeadStatus.CONTACT_PENDING,
            ],
          },
        },
      }),
      prisma.lead.count({
        where: {
          deletedAt: null,
          status: { in: [...opts.staleStatuses] },
          updatedAt: { lt: opts.dropoffCutoff },
        },
      }),
      prisma.lead.count({
        where: { deletedAt: null, status: LeadStatus.DOC_PENDING },
      }),
      prisma.lead.count({
        where: {
          deletedAt: null,
          status: LeadStatus.AA_APPOINTMENT_PENDING,
        },
      }),
      prisma.lead.count({
        where: { deletedAt: null, status: LeadStatus.GUTSCHEIN_PENDING },
      }),
    ]);

    return {
      hotPending,
      slaBreached,
      dropoffRisk,
      docsPending,
      aaPending,
      voucherPending,
    };
  }
}

export const leadIntelligenceRepository = new LeadIntelligenceRepository();
