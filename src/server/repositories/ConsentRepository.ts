/**
 * ConsentRepository - APPEND-ONLY.
 *
 * Granting and revoking both produce new immutable records. The current state
 * is derived from the most recent record per (leadId, type).
 */
import type { Prisma } from "@prisma/client";

import {
  type ConsentAction,
  type ConsentState,
  type ConsentType,
  ConsentTypeSchema,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { parseConsentAction, parseConsentType } from "./types";

export interface AppendConsentInput {
  leadId: string;
  type: ConsentType;
  action: ConsentAction;
  source: string | null;
  utm: string | null;
  ipHash: string | null;
  userAgent: string | null;
  textVersion?: string | null;
}

export interface ConsentProof {
  accepted: boolean;
  acceptedAt: Date | null;
  source: string | null;
  textVersion: string | null;
}

export class ConsentRepository {
  async append(
    input: AppendConsentInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.consentRecord.create({
      data: {
        leadId: input.leadId,
        type: input.type,
        action: input.action,
        source: input.source,
        utm: input.utm,
        ipHash: input.ipHash,
        userAgent: input.userAgent,
        textVersion: input.textVersion ?? null,
      },
    });
  }

  /** Latest opt-in proof for a consent type (accepted = latest action GRANT). */
  async latestProof(leadId: string, type: ConsentType): Promise<ConsentProof> {
    const row = await prisma.consentRecord.findFirst({
      where: { leadId, type },
      orderBy: { createdAt: "desc" },
    });
    if (!row) {
      return { accepted: false, acceptedAt: null, source: null, textVersion: null };
    }
    const accepted = parseConsentAction(row.action) === "GRANT";
    return {
      accepted,
      acceptedAt: accepted ? row.createdAt : null,
      source: row.source,
      textVersion: row.textVersion ?? null,
    };
  }

  /**
   * Derive the current state per type from the latest record.
   */
  async currentStates(leadId: string): Promise<ConsentState[]> {
    const rows = await prisma.consentRecord.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });

    const seen = new Set<ConsentType>();
    const result: ConsentState[] = [];

    for (const r of rows) {
      const type = parseConsentType(r.type);
      if (seen.has(type)) continue;
      seen.add(type);
      const action = parseConsentAction(r.action);
      result.push({
        type,
        granted: action === "GRANT",
        lastChangeAt: r.createdAt,
      });
    }

    // Include any consent types that have no record yet as ungranted.
    for (const type of ConsentTypeSchema.options) {
      if (!seen.has(type)) {
        result.push({ type, granted: false, lastChangeAt: null });
      }
    }

    return result;
  }

  async list(leadId: string): Promise<
    Array<{
      type: ConsentType;
      action: ConsentAction;
      source: string | null;
      createdAt: Date;
    }>
  > {
    const rows = await prisma.consentRecord.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      type: parseConsentType(r.type),
      action: parseConsentAction(r.action),
      source: r.source,
      createdAt: r.createdAt,
    }));
  }
}

export const consentRepository = new ConsentRepository();
