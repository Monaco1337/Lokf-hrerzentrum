/**
 * CampaignRepository — the single Prisma access point for the Alt-Lead
 * reactivation feature: import batches, import rows and the send queue
 * (CampaignMessageJob). Enum-shaped strings are validated at the service
 * boundary; this layer stays thin and typed.
 */
import type { Prisma } from "@prisma/client";

import type {
  CampaignChannel,
  CampaignJobStatus,
} from "@/features/fairtrain-funnel/campaign/types";

import { prisma } from "../db/prisma";

export interface ImportBatchCounters {
  totalRows: number;
  imported: number;
  duplicates: number;
  invalid: number;
  alreadyContacted: number;
  whatsappAvailable: number;
  emailAvailable: number;
}

export interface CreateImportBatchInput extends ImportBatchCounters {
  filename: string;
  campaign: string;
  createdById: string;
}

export interface ImportRowInput {
  rowIndex: number;
  rawJson: string;
  status: "imported" | "duplicate" | "invalid" | "skipped";
  leadId?: string | null;
  errorReason?: string | null;
  phoneNormalized?: string | null;
  emailNormalized?: string | null;
}

export interface CampaignJobRecord {
  id: string;
  leadId: string;
  campaign: string;
  step: number;
  channel: CampaignChannel;
  scheduledFor: Date;
  status: CampaignJobStatus;
  sentAt: Date | null;
  providerMessageId: string | null;
  reason: string | null;
}

function toJobRecord(row: {
  id: string;
  leadId: string;
  campaign: string;
  step: number;
  channel: string;
  scheduledFor: Date;
  status: string;
  sentAt: Date | null;
  providerMessageId: string | null;
  reason: string | null;
}): CampaignJobRecord {
  return {
    id: row.id,
    leadId: row.leadId,
    campaign: row.campaign,
    step: row.step,
    channel: row.channel as CampaignChannel,
    scheduledFor: row.scheduledFor,
    status: row.status as CampaignJobStatus,
    sentAt: row.sentAt,
    providerMessageId: row.providerMessageId,
    reason: row.reason,
  };
}

export class CampaignRepository {
  // --- Import batches -------------------------------------------------------

  async createBatch(
    input: CreateImportBatchInput,
    tx?: Prisma.TransactionClient,
  ): Promise<string> {
    const client = tx ?? prisma;
    const batch = await client.leadImportBatch.create({
      data: {
        filename: input.filename,
        campaign: input.campaign,
        totalRows: input.totalRows,
        imported: input.imported,
        duplicates: input.duplicates,
        invalid: input.invalid,
        alreadyContacted: input.alreadyContacted,
        whatsappAvailable: input.whatsappAvailable,
        emailAvailable: input.emailAvailable,
        createdById: input.createdById,
      },
      select: { id: true },
    });
    return batch.id;
  }

  async addRows(
    batchId: string,
    rows: ImportRowInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (rows.length === 0) return;
    const client = tx ?? prisma;
    await client.leadImportRow.createMany({
      data: rows.map((r) => ({
        batchId,
        rowIndex: r.rowIndex,
        rawJson: r.rawJson,
        status: r.status,
        leadId: r.leadId ?? null,
        errorReason: r.errorReason ?? null,
        phoneNormalized: r.phoneNormalized ?? null,
        emailNormalized: r.emailNormalized ?? null,
      })),
    });
  }

  async findBatch(id: string) {
    return prisma.leadImportBatch.findUnique({ where: { id } });
  }

  async listBatches(campaign?: string) {
    return prisma.leadImportBatch.findMany({
      where: campaign ? { campaign } : {},
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async markBatchReleased(
    id: string,
    releaseTier: string,
    releasedCount: number,
    releasedById: string,
  ): Promise<void> {
    await prisma.leadImportBatch.update({
      where: { id },
      data: {
        status: "released",
        releaseTier,
        releasedCount,
        releasedById,
        releasedAt: new Date(),
      },
    });
  }

  // --- Campaign message jobs ------------------------------------------------

  /**
   * Idempotent enqueue: the unique (leadId, step, channel) key means a repeated
   * call for the same lead/step/channel is a no-op instead of a double send.
   */
  async enqueueJob(input: {
    leadId: string;
    campaign: string;
    step: number;
    channel: CampaignChannel;
    scheduledFor: Date;
  }): Promise<void> {
    await prisma.campaignMessageJob.upsert({
      where: {
        leadId_step_channel: {
          leadId: input.leadId,
          step: input.step,
          channel: input.channel,
        },
      },
      create: {
        leadId: input.leadId,
        campaign: input.campaign,
        step: input.step,
        channel: input.channel,
        scheduledFor: input.scheduledFor,
        status: "queued",
      },
      update: {}, // never overwrite an existing job (idempotent)
    });
  }

  async findDueJobs(now: Date, limit = 200): Promise<CampaignJobRecord[]> {
    const rows = await prisma.campaignMessageJob.findMany({
      where: { status: "queued", scheduledFor: { lte: now } },
      orderBy: { scheduledFor: "asc" },
      take: limit,
    });
    return rows.map(toJobRecord);
  }

  async countDueJobs(now: Date): Promise<number> {
    return prisma.campaignMessageJob.count({
      where: { status: "queued", scheduledFor: { lte: now } },
    });
  }

  async updateJob(
    id: string,
    data: {
      status?: CampaignJobStatus;
      sentAt?: Date | null;
      providerMessageId?: string | null;
      reason?: string | null;
    },
  ): Promise<void> {
    await prisma.campaignMessageJob.update({ where: { id }, data });
  }

  /** Cancel every still-queued job for a lead (stop-rule enforcement). */
  async cancelQueuedJobsForLead(
    leadId: string,
    reason: string,
  ): Promise<number> {
    const res = await prisma.campaignMessageJob.updateMany({
      where: { leadId, status: "queued" },
      data: { status: "canceled", reason },
    });
    return res.count;
  }

  async listJobsForLead(leadId: string): Promise<CampaignJobRecord[]> {
    const rows = await prisma.campaignMessageJob.findMany({
      where: { leadId },
      orderBy: { step: "asc" },
    });
    return rows.map(toJobRecord);
  }
}

export const campaignRepository = new CampaignRepository();
