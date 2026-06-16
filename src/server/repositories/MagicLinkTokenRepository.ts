/**
 * MagicLinkTokenRepository.
 *
 * Stores ONLY the hash of the token, never the plaintext.
 * `usedAt` is the only mutable field (single-use marker).
 */
import type { Prisma } from "@prisma/client";

import type { MagicLinkScope } from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { parseMagicLinkScope } from "./types";

export interface InsertTokenInput {
  tokenHash: string;
  leadId: string;
  scope: MagicLinkScope;
  expiresAt: Date;
}

export interface TokenRecord {
  id: string;
  tokenHash: string;
  leadId: string;
  scope: MagicLinkScope;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class MagicLinkTokenRepository {
  async insert(
    input: InsertTokenInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.magicLinkToken.create({
      data: {
        tokenHash: input.tokenHash,
        leadId: input.leadId,
        scope: input.scope,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findByHash(tokenHash: string): Promise<TokenRecord | null> {
    const row = await prisma.magicLinkToken.findUnique({
      where: { tokenHash },
    });
    if (!row) return null;
    return {
      id: row.id,
      tokenHash: row.tokenHash,
      leadId: row.leadId,
      scope: parseMagicLinkScope(row.scope),
      expiresAt: row.expiresAt,
      usedAt: row.usedAt,
      createdAt: row.createdAt,
    };
  }

  async markUsed(
    id: string,
    usedAt: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.magicLinkToken.update({
      where: { id },
      data: { usedAt },
    });
  }
}

export const magicLinkTokenRepository = new MagicLinkTokenRepository();
