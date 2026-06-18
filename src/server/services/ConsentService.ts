/**
 * ConsentService.
 *
 * - PRIVACY consent is required for any lead submission.
 * - Granting and revoking both append a new immutable record.
 * - Optional IP hash via IP_SALT (server-side only, never plaintext IP).
 */
import { createHash } from "node:crypto";

import {
  AuditAction,
  ConsentAction,
  type ConsentInput,
  type ConsentState,
  type ConsentType,
} from "@/features/fairtrain-funnel/types";

import type { TransactionClient } from "../db/prisma";
import { getIpSalt } from "../env";
import { ConsentMissingError } from "../errors";
import { auditLogRepository } from "../repositories/AuditLogRepository";
import {
  type ConsentProof,
  consentRepository,
} from "../repositories/ConsentRepository";

/**
 * Version tag for the consent copy currently shown to applicants. Bump this
 * whenever the consent wording changes so each record proves the exact text
 * the lead accepted.
 */
export const CONSENT_TEXT_VERSION = "2026-06";

export interface ConsentContext {
  source: string | null;
  utm: string | null;
  ip: string | null;
  userAgent: string | null;
}

export function hashIp(ip: string): string {
  return createHash("sha256")
    .update(`${ip}:${getIpSalt()}`)
    .digest("hex");
}

export class ConsentService {
  /**
   * Append the requested consent records (one per item).
   * Used during lead creation inside the outer transaction.
   */
  async appendBatch(
    leadId: string,
    items: ReadonlyArray<ConsentInput>,
    ctx: ConsentContext,
    tx: TransactionClient,
  ): Promise<void> {
    const privacy = items.find((i) => i.type === "PRIVACY");
    if (!privacy || !privacy.granted) {
      throw new ConsentMissingError("PRIVACY");
    }

    const ipHash = ctx.ip ? hashIp(ctx.ip) : null;

    for (const item of items) {
      const action: ConsentAction = item.granted
        ? ConsentAction.GRANT
        : ConsentAction.REVOKE;

      await consentRepository.append(
        {
          leadId,
          type: item.type,
          action,
          source: ctx.source,
          utm: ctx.utm,
          ipHash,
          userAgent: ctx.userAgent,
          textVersion: CONSENT_TEXT_VERSION,
        },
        tx,
      );

      await auditLogRepository.append(
        {
          actor: "self",
          action:
            action === ConsentAction.GRANT
              ? AuditAction.CONSENT_GRANT
              : AuditAction.CONSENT_REVOKE,
          entityType: "Lead",
          entityId: leadId,
          details: JSON.stringify({ type: item.type, action }),
        },
        tx,
      );
    }
  }

  async revoke(
    leadId: string,
    type: ConsentType,
    ctx: ConsentContext,
  ): Promise<void> {
    const ipHash = ctx.ip ? hashIp(ctx.ip) : null;
    await consentRepository.append({
      leadId,
      type,
      action: ConsentAction.REVOKE,
      source: ctx.source,
      utm: ctx.utm,
      ipHash,
      userAgent: ctx.userAgent,
    });
    await auditLogRepository.append({
      actor: "self",
      action: AuditAction.CONSENT_REVOKE,
      entityType: "Lead",
      entityId: leadId,
      details: JSON.stringify({ type }),
    });
  }

  async currentStates(leadId: string): Promise<ConsentState[]> {
    return consentRepository.currentStates(leadId);
  }

  /** Opt-in proof for the WhatsApp channel (accepted/acceptedAt/source/text). */
  async whatsappOptInProof(leadId: string): Promise<ConsentProof> {
    return consentRepository.latestProof(leadId, "WHATSAPP");
  }
}

export const consentService = new ConsentService();
