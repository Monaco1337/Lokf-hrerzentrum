/**
 * WhatsAppOptOutService — enterprise WhatsApp opt-out ("Abmelden").
 *
 * A lead that replies with a stop keyword (STOP / STOPP / ABMELDEN /
 * KEINE NACHRICHTEN / UNSUBSCRIBE / ENDE) is opted out of ALL WhatsApp contact:
 *  - `optOut = true` (+ `optOutAt`), WhatsApp marketing disabled
 *  - every active/queued automation + campaign job is stopped immediately
 *  - the `whatsapp_opt_out` tag is added
 *  - an audit entry with the timestamp + original message is written
 *  - a one-time confirmation message is sent back
 *
 * The lead is NEVER deleted and stays fully in the CRM. All future WhatsApp
 * sends are blocked centrally (MessageLedgerService / AutomationService).
 *
 * `applyOptOut` is idempotent: an already-opted-out lead is left untouched and
 * no second confirmation is sent.
 */
import {
  AuditAction,
  CommunicationChannel,
} from "@/features/fairtrain-funnel/types";

import { auditLogService } from "./AuditLogService";
import { messageLedgerService } from "./MessageLedgerService";
import { campaignRepository } from "../repositories/CampaignRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { userRepository } from "../repositories/UserRepository";

/** The tag automatically added to every opted-out lead. */
export const OPT_OUT_TAG = "whatsapp_opt_out";

/**
 * Stop keywords (case-insensitive). Matched against the whole normalised
 * message and the quick-reply button title — never as a loose substring, so a
 * sentence like "auf keinen fall stoppen" does not trigger a false opt-out.
 */
export const OPT_OUT_KEYWORDS: readonly string[] = [
  "STOP",
  "STOPP",
  "ABMELDEN",
  "KEINE NACHRICHTEN",
  "UNSUBSCRIBE",
  "ENDE",
];

/** Confirmation sent back after a successful opt-out. */
export const OPT_OUT_CONFIRMATION =
  "Vielen Dank. Sie erhalten ab sofort keine weiteren WhatsApp-Nachrichten von uns. Sollten Sie später wieder Interesse haben, können Sie uns jederzeit erneut kontaktieren.";

/**
 * Normalise a message for keyword comparison: uppercase, strip leading/trailing
 * punctuation/emojis, collapse internal whitespace.
 */
function normalize(input: string | undefined | null): string {
  return (input ?? "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/^[^A-ZÄÖÜ0-9]+|[^A-ZÄÖÜ0-9]+$/g, "")
    .trim();
}

/**
 * Does an inbound message (text and/or quick-reply button) request an opt-out?
 * Exact match after normalisation — standard, false-positive-safe behaviour.
 */
export function isOptOutMessage(input: {
  body?: string | undefined;
  buttonTitle?: string | undefined;
}): boolean {
  const candidates = [normalize(input.body), normalize(input.buttonTitle)];
  return candidates.some((c) => c.length > 0 && OPT_OUT_KEYWORDS.includes(c));
}

export interface ApplyOptOutInput {
  originalMessage: string;
  at: Date;
  /** Where the opt-out came from (webhook, manual CRM action, …). */
  actor?: string;
  /** Send the confirmation message back (default true). */
  sendConfirmation?: boolean;
}

export interface ApplyOptOutResult {
  applied: boolean;
  alreadyOptedOut: boolean;
  canceledJobs: number;
  confirmationSent: boolean;
}

export class WhatsAppOptOutService {
  /**
   * Opt a lead out of all WhatsApp contact. Idempotent — a lead that is already
   * opted out returns `{ applied: false, alreadyOptedOut: true }` and neither
   * re-stamps fields nor re-sends the confirmation.
   */
  async applyOptOut(
    leadId: string,
    input: ApplyOptOutInput,
  ): Promise<ApplyOptOutResult> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) {
      return {
        applied: false,
        alreadyOptedOut: false,
        canceledJobs: 0,
        confirmationSent: false,
      };
    }

    const actor = input.actor ?? "whatsapp-webhook";

    if (lead.optOut) {
      return {
        applied: false,
        alreadyOptedOut: true,
        canceledJobs: 0,
        confirmationSent: false,
      };
    }

    // 1) Flip the lead into the opted-out state. Marketing off + automation
    //    paused + campaign completed = no further WhatsApp contact of any kind.
    const tags = Array.from(new Set([...(lead.tags ?? []), OPT_OUT_TAG]));
    await leadRepository.update(leadId, {
      optOut: true,
      optOutAt: input.at,
      whatsappMarketing: false,
      automationPaused: true,
      campaignCompleted: true,
      tags,
      lastInboundMessage: input.originalMessage.slice(0, 500),
      lastInboundMessageAt: input.at,
    });

    // 2) Cancel every still-queued campaign job so no scheduled follow-up fires.
    const canceledJobs = await campaignRepository.cancelQueuedJobsForLead(
      leadId,
      "whatsapp_opt_out",
    );

    // 3) Audit trail with timestamp + the verbatim original message.
    await auditLogService.append({
      actor,
      action: AuditAction.WHATSAPP_OPT_OUT,
      entityType: "Lead",
      entityId: leadId,
      details: {
        at: input.at.toISOString(),
        originalMessage: input.originalMessage.slice(0, 1000),
        canceledJobs,
        tag: OPT_OUT_TAG,
      },
    });

    // 4) Confirmation reply. The inbound message opens a 24h service window, so
    //    a free-text session message is delivered reliably. Sent with the
    //    opt-out + consent guards bypassed (this specific message confirms the
    //    user's own request). Best-effort: a failed confirmation never rolls
    //    back the opt-out itself.
    let confirmationSent = false;
    if (input.sendConfirmation !== false) {
      try {
        const actorId = await userRepository.findSystemActorId();
        await messageLedgerService.sendText({
          leadId,
          body: OPT_OUT_CONFIRMATION,
          actorId: actorId ?? "system",
          channel: CommunicationChannel.WHATSAPP,
          bypassOptOut: true,
          bypassConsent: true,
          // Compliance confirmation must always go out, regardless of any
          // contact-protection state on the lead.
          bypassContactGuard: true,
        });
        confirmationSent = true;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[whatsapp-opt-out] confirmation send failed", {
          leadId,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }

    return {
      applied: true,
      alreadyOptedOut: false,
      canceledJobs,
      confirmationSent,
    };
  }
}

export const whatsAppOptOutService = new WhatsAppOptOutService();
