/**
 * MagicLinkTokenService.
 *
 * - 32-byte random tokens, base64url-encoded.
 * - Only `sha256(token + TOKEN_PEPPER)` is stored; plaintext is returned once.
 * - Single-use: `usedAt` is set on consume; consuming again throws.
 * - Token URLs contain no PII or lead identifiers.
 */
import { createHash, randomBytes } from "node:crypto";

import {
  AuditAction,
  type MagicLinkScope,
} from "@/features/fairtrain-funnel/types";

import { getTokenPepper, serverEnv } from "../env";
import { TokenInvalidError } from "../errors";
import { auditLogService } from "./AuditLogService";
import { magicLinkTokenRepository } from "../repositories/MagicLinkTokenRepository";

export interface CreateTokenResult {
  /** Plaintext token. Returned exactly once - do NOT persist this value. */
  token: string;
  url: string;
  expiresAt: Date;
}

export interface ConsumeTokenResult {
  leadId: string;
  scope: MagicLinkScope;
}

function hashToken(token: string): string {
  return createHash("sha256")
    .update(`${token}:${getTokenPepper()}`)
    .digest("hex");
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export class MagicLinkTokenService {
  async create(
    leadId: string,
    scope: MagicLinkScope,
    actor: string,
    ttlMinutes: number = serverEnv.MAGIC_LINK_TTL_MINUTES,
  ): Promise<CreateTokenResult> {
    const token = randomToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    await magicLinkTokenRepository.insert({
      tokenHash,
      leadId,
      scope,
      expiresAt,
    });

    await auditLogService.append({
      actor,
      action: AuditAction.MAGIC_LINK_ISSUED,
      entityType: "Lead",
      entityId: leadId,
      details: { scope, expiresAt: expiresAt.toISOString() },
    });

    const baseUrl = serverEnv.APP_BASE_URL.replace(/\/$/, "");
    const url = `${baseUrl}/m/${token}`;
    return { token, url, expiresAt };
  }

  async consume(token: string): Promise<ConsumeTokenResult> {
    if (!token || token.length < 16) {
      throw new TokenInvalidError("INVALID");
    }
    const tokenHash = hashToken(token);
    const row = await magicLinkTokenRepository.findByHash(tokenHash);
    if (!row) throw new TokenInvalidError("INVALID");
    if (row.usedAt) throw new TokenInvalidError("USED");
    if (row.expiresAt.getTime() < Date.now()) {
      throw new TokenInvalidError("EXPIRED");
    }

    await magicLinkTokenRepository.markUsed(row.id, new Date());

    await auditLogService.append({
      actor: "magic_link",
      action: AuditAction.MAGIC_LINK_CONSUMED,
      entityType: "Lead",
      entityId: row.leadId,
      details: { scope: row.scope },
    });

    return { leadId: row.leadId, scope: row.scope };
  }
}

export const magicLinkTokenService = new MagicLinkTokenService();
