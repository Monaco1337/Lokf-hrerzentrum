/**
 * CommunicationRepository - APPEND-ONLY.
 *
 * Every outgoing or incoming message becomes a row. No updates, no deletes.
 */
import type { Prisma } from "@prisma/client";

import {
  type CommunicationChannel,
  type CommunicationDirection,
  type CommunicationEntry,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import {
  parseCommunicationChannel,
  parseCommunicationDirection,
} from "./types";

export interface AppendCommunicationInput {
  leadId: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  payload: string;
  providerMessageId: string | null;
  errorCode: string | null;
}

export class CommunicationRepository {
  async append(
    input: AppendCommunicationInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.communicationEvent.create({
      data: {
        leadId: input.leadId,
        channel: input.channel,
        direction: input.direction,
        payload: input.payload,
        providerMessageId: input.providerMessageId,
        errorCode: input.errorCode,
      },
    });
  }

  async list(leadId: string): Promise<CommunicationEntry[]> {
    const rows = await prisma.communicationEvent.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      channel: parseCommunicationChannel(r.channel),
      direction: parseCommunicationDirection(r.direction),
      payload: r.payload,
      providerMessageId: r.providerMessageId,
      errorCode: r.errorCode,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Batch lookup for the latest outbound timestamp per lead. Used by the
   * LeadInsightsService to compute "letzter Kontakt" and the staleness /
   * drop-off heuristics, all in a single SQL pass.
   *
   * Returns a Map keyed by leadId. Leads without any outbound event are
   * absent from the map (callers must default to null).
   */
  async lastOutboundPerLead(
    leadIds: ReadonlyArray<string>,
  ): Promise<Map<string, Date>> {
    if (leadIds.length === 0) return new Map();
    const rows = await prisma.communicationEvent.groupBy({
      by: ["leadId"],
      where: {
        leadId: { in: [...leadIds] },
        direction: "OUT",
      },
      _max: { createdAt: true },
    });
    const result = new Map<string, Date>();
    for (const row of rows) {
      if (row._max.createdAt) {
        result.set(row.leadId, row._max.createdAt);
      }
    }
    return result;
  }
}

export const communicationRepository = new CommunicationRepository();
