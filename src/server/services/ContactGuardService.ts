/**
 * ContactGuardService — the single source of truth for "may we still contact
 * this lead automatically?".
 *
 * A lead that a human already worked (call / Multichat) and that now waits for
 * the applicant to act (Eignungscheck / Unterlagen) must NOT receive any further
 * automatic reactivation / follow-up / WhatsApp / e-mail. Every automated send
 * path calls `evaluate()` before dispatching; the campaign release calls
 * `isReactivationBlocked()` to exclude already-handled leads up front.
 *
 * The WhatsApp opt-out is enforced separately (WA-specific) at the send sites,
 * so it is deliberately NOT re-checked here.
 */
import {
  AuditAction,
  CONTACT_BLOCKING_STATES,
  CONTACT_STATE_LABEL,
  ContactState,
  LeadStatus,
  manualResolution,
  type ManualResolutionId,
} from "@/features/fairtrain-funnel/types";

import { auditLogService } from "./AuditLogService";
import { campaignRepository } from "../repositories/CampaignRepository";
import { leadRepository } from "../repositories/LeadRepository";

/** The subset of lead fields the guard needs — works with LeadSummary/Detail. */
export interface GuardableLead {
  status: LeadStatus;
  contactState: ContactState;
  reactivationExcluded: boolean;
  automationPaused: boolean;
  lastManualContactAt: Date | null;
  communicationStarted: boolean;
  lastManualContactBy?: string | null;
  lastManualContactChannel?: string | null;
}

export interface ContactGuardDecision {
  blocked: boolean;
  /** Machine code, e.g. "reactivation_excluded", "contact_state:waiting_for_funnel". */
  code?: string;
  /** User-facing German reason. */
  reason?: string;
}

export interface ContactGuardOptions {
  /**
   * Ignore the plain `automationPaused` flag. Used ONLY for a direct response to
   * the lead's own inbound action (WhatsApp reply / quick-reply): the
   * reactivation campaign auto-pauses a lead on ANY reply, which must never
   * block the follow-up the lead literally just asked for. Genuine manual
   * handling (reactivationExcluded / blocking contactState / lastManualContactAt)
   * still blocks.
   */
  ignoreAutomationPaused?: boolean;
}

/**
 * Pipeline statuses that mean the lead already moved past a cold first contact
 * (is being handled / in the funnel / has documents / an appointment / closed).
 * Used to exclude such leads from a fresh reactivation campaign (point 9).
 */
const REACTIVATION_EXCLUDED_STATUSES: ReadonlySet<LeadStatus> = new Set([
  LeadStatus.CONTACTED,
  LeadStatus.REPLIED,
  LeadStatus.FORWARDED,
  LeadStatus.LANDINGPAGE_OPENED,
  LeadStatus.FUNNEL_STARTED,
  LeadStatus.FUNNEL_COMPLETED,
  LeadStatus.CALL_SCHEDULED,
  LeadStatus.BRIEFING_SENT,
  LeadStatus.DOC_PENDING,
  LeadStatus.DOC_READY,
  LeadStatus.AA_APPOINTMENT_PENDING,
  LeadStatus.AA_APPOINTMENT_DONE,
  LeadStatus.GUTSCHEIN_PENDING,
  LeadStatus.GUTSCHEIN_APPROVED,
  LeadStatus.ENROLLED,
  LeadStatus.STARTED,
  LeadStatus.CLOSED,
  LeadStatus.LOST,
  LeadStatus.REJECTED,
]);

export const CONTACT_BLOCK_MESSAGE =
  "Automatischer Versand blockiert: Lead wird bereits manuell bearbeitet (Kontaktschutz).";

export class ContactGuardService {
  /**
   * Should an AUTOMATIC outbound message to this lead be blocked? Returns the
   * first matching reason. Manual, operator-initiated sends bypass this guard.
   */
  evaluate(
    lead: GuardableLead,
    opts: ContactGuardOptions = {},
  ): ContactGuardDecision {
    if (lead.reactivationExcluded) {
      return {
        blocked: true,
        code: "reactivation_excluded",
        reason:
          "Automatischer Versand blockiert: Lead ist von der Reaktivierung ausgeschlossen.",
      };
    }
    if (CONTACT_BLOCKING_STATES.has(lead.contactState)) {
      return {
        blocked: true,
        code: `contact_state:${lead.contactState}`,
        reason: `Automatischer Versand blockiert: ${CONTACT_STATE_LABEL[lead.contactState]}.`,
      };
    }
    if (lead.automationPaused && !opts.ignoreAutomationPaused) {
      return {
        blocked: true,
        code: "automation_paused",
        reason: "Automatischer Versand blockiert: Automationen für diesen Lead pausiert.",
      };
    }
    if (lead.lastManualContactAt) {
      return {
        blocked: true,
        code: "manual_contact",
        reason:
          "Automatischer Versand blockiert: Lead wurde bereits manuell kontaktiert.",
      };
    }
    return { blocked: false };
  }

  /**
   * Should this lead be EXCLUDED from a fresh reactivation campaign? Broader than
   * `evaluate`: also excludes leads already past first contact in the pipeline or
   * whose campaign communication already started. Only truly untouched leads
   * (NEW / QUALIFIED / HOT / CONTACT_PENDING, no manual handling) may be enqueued.
   */
  isReactivationBlocked(lead: GuardableLead): boolean {
    // A freshly imported Alt-Lead is `automationPaused` by default (it hasn't
    // been released yet); the release itself un-pauses it in enqueueTag0. So
    // `automationPaused` alone must NEVER block a reactivation release — only
    // genuine manual-handling signals do (reactivationExcluded, a blocking
    // contactState, or a recorded manual contact).
    if (this.evaluate(lead, { ignoreAutomationPaused: true }).blocked) {
      return true;
    }
    if (lead.communicationStarted) return true;
    if (lead.contactState === ContactState.DOCUMENTS_RECEIVED) return true;
    if (REACTIVATION_EXCLUDED_STATUSES.has(lead.status)) return true;
    return false;
  }

  /**
   * Apply a Multichat "Erledigt" resolution: set the handling state, exclude the
   * lead from reactivation, pause automations, stop the campaign, cancel every
   * queued follow-up job and record who/when/where. Idempotent — re-applying the
   * same resolution just re-writes the same state.
   */
  async resolveManualConversation(
    leadId: string,
    opts: {
      resolution: ManualResolutionId;
      actor: string;
      channel?: string;
    },
  ): Promise<{ contactState: ContactState; canceledJobs: number }> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) return { contactState: ContactState.NONE, canceledJobs: 0 };

    const r = manualResolution(opts.resolution);
    const now = new Date();

    const canceledJobs = await campaignRepository.cancelQueuedJobsForLead(
      leadId,
      `manual_resolution:${opts.resolution}`,
    );

    await leadRepository.update(leadId, {
      contactState: r.contactState,
      reactivationExcluded: r.reactivationExcluded,
      automationPaused: true,
      campaignCompleted: true,
      lastManualContactAt: now,
      lastManualContactBy: opts.actor,
      lastManualContactChannel: opts.channel ?? "multichat",
      // Leave the "neue Antwort" inbox once handled.
      lastWhatsappReplyAt: null,
      ...(opts.resolution === "no_interest"
        ? { campaignStatus: "kein_interesse" as string }
        : {}),
      // A callback means a human will reach out again → schedule a reminder.
      ...(opts.resolution === "callback"
        ? { nextFollowUpAt: new Date(now.getTime() + 24 * 3_600_000) }
        : {}),
    });

    await auditLogService.append({
      actor: opts.actor,
      action: AuditAction.LEAD_CONTACT_PROTECTED,
      entityType: "Lead",
      entityId: leadId,
      details: {
        resolution: opts.resolution,
        contactState: r.contactState,
        reactivationExcluded: r.reactivationExcluded,
        channel: opts.channel ?? "multichat",
        canceledJobs,
      },
    });

    return { contactState: r.contactState, canceledJobs };
  }
}

export const contactGuardService = new ContactGuardService();
