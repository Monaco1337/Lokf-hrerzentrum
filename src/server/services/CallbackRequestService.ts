/**
 * CallbackRequestService — the "Rückrufe angefordert" queue for reactivated
 * Alt-Leads.
 *
 * Alt-Leads (Reaktivierung) never show up in the Dashboard or under "Leads"
 * by default — they live exclusively in Multichat until the AI detects that
 * they actually want a callback/consultation (e.g. "bitte anrufen",
 * "Rückruf", "melden Sie sich", "Beratung", …). At that point they are
 * flagged here and surface in the dedicated queue with everything an
 * operator needs to act (name, phone, request time, full chat history, last
 * inbound message, status) — until the Alt-Lead itself starts/completes the
 * funnel and is converted to a normal lead (see `LeadService.submit`).
 *
 * Detection is intentionally centralized in ONE place (`detectAndFlag`,
 * called from `WhatsAppWebhookService` after reply classification) instead
 * of duplicated across every classifier (WorkflowEngine / EmploymentSituation
 * / WhatsAppReplyClassification) — all three already persist their result on
 * the lead (`replyIntent` or `funnelPhase`), so checking the lead's resulting
 * state afterwards catches every path without touching their internals.
 */
import { FunnelPhase, FUNNEL_PHASE_RANK } from "@/features/fairtrain-funnel/funnelPhase";
import type { CallbackNextStep } from "@/features/fairtrain-funnel/messaging/types";
import { AuditAction } from "@/features/fairtrain-funnel/types";
import { absoluteUrl } from "@/lib/site";

import { leadRepository } from "../repositories/LeadRepository";
import { auditLogService } from "./AuditLogService";
import { messageLedgerService } from "./MessageLedgerService";

export type { CallbackNextStep };
export { CALLBACK_NEXT_STEP_LABEL } from "@/features/fairtrain-funnel/messaging/types";

/** Funnel phases that signal a genuine callback/consultation request. */
const CALLBACK_SIGNAL_PHASES: ReadonlySet<FunnelPhase> = new Set([
  FunnelPhase.CALLBACK_REQUIRED,
  FunnelPhase.CONSULTATION_REQUIRED,
]);

export class CallbackRequestService {
  /**
   * Re-checks a lead right after reply classification and, if it is an
   * Alt-Lead that just signalled a callback/consultation wish, opens (or
   * keeps open) its entry in the "Rückrufe angefordert" queue. Idempotent —
   * an already-open request keeps its original `callbackRequestedAt`.
   */
  async detectAndFlag(
    leadId: string,
    opts: { actor: string; at: Date; reason: string },
  ): Promise<boolean> {
    const lead = await leadRepository.findById(leadId);
    if (!lead || lead.leadType !== "alt_lead") return false;

    const qualifies =
      lead.replyIntent === "callback" ||
      CALLBACK_SIGNAL_PHASES.has(lead.funnelPhase);
    if (!qualifies) return false;

    // Already open → don't reset the original request timestamp.
    if (lead.callbackRequestedAt && !lead.callbackHandledAt) return false;

    const nextPhase = CALLBACK_SIGNAL_PHASES.has(lead.funnelPhase)
      ? lead.funnelPhase
      : FUNNEL_PHASE_RANK[lead.funnelPhase] < FUNNEL_PHASE_RANK[FunnelPhase.CALLBACK_REQUIRED]
        ? FunnelPhase.CALLBACK_REQUIRED
        : lead.funnelPhase;

    await leadRepository.update(leadId, {
      callbackRequestedAt: opts.at,
      callbackHandledAt: null,
      funnelPhase: nextPhase,
    });
    await auditLogService.append({
      actor: opts.actor,
      action: AuditAction.LEAD_UPDATED,
      entityType: "Lead",
      entityId: leadId,
      details: {
        reason: opts.reason,
        callbackRequested: true,
        replyIntent: lead.replyIntent,
        funnelPhase: nextPhase,
      },
    });
    return true;
  }

  /**
   * Operator resolution from the "Rückrufe angefordert" queue: closes the
   * open request and, depending on the chosen next step, sends the
   * Eignungscheck link or advances the funnel phase for follow-up.
   */
  async resolve(
    leadId: string,
    opts: { actor: string; nextStep: CallbackNextStep },
  ): Promise<void> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) return;

    if (opts.nextStep === "send_eligibility") {
      const link = absoluteUrl("/eignungscheck");
      const greeting = lead.firstName ? `Hallo ${lead.firstName},` : "Hallo,";
      const body = [
        greeting,
        "danke für Ihren Rückruf-Wunsch. Gerne machen wir gleich weiter: Hier geht es zu Ihrem persönlichen Eignungscheck für die geförderte Weiterbildung zum Triebfahrzeugführer (Lokführer):",
        link,
        "Der Check dauert nur wenige Minuten.",
        "Viele Grüße\nIhr Team vom Lokführerzentrum",
      ].join("\n\n");
      await messageLedgerService.sendText({
        leadId,
        body,
        actorId: opts.actor,
        bypassConsent: true,
        bypassContactGuard: true,
        respondingToInbound: true,
      });
    }

    const phaseByStep: Partial<Record<CallbackNextStep, FunnelPhase>> = {
      send_eligibility: FunnelPhase.WAITING_ELIGIBILITY,
      consultation_required: FunnelPhase.CONSULTATION_REQUIRED,
      appointment_scheduled: FunnelPhase.APPOINTMENT_SCHEDULED,
    };
    const nextPhase = phaseByStep[opts.nextStep];

    await leadRepository.update(leadId, {
      callbackHandledAt: new Date(),
      ...(nextPhase ? { funnelPhase: nextPhase } : {}),
    });
    await auditLogService.append({
      actor: opts.actor,
      action: AuditAction.LEAD_UPDATED,
      entityType: "Lead",
      entityId: leadId,
      details: {
        reason: "callback_request_resolved",
        nextStep: opts.nextStep,
      },
    });
  }
}

export const callbackRequestService = new CallbackRequestService();
