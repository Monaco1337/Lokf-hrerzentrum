/**
 * LeadLifecycleService — the SINGLE SOURCE OF TRUTH for how a real domain
 * event moves a lead through the pipeline.
 *
 * Every module (Multichat, Funnel, CRM, Leitstand, Automations) reports what
 * HAPPENED (an event) — never a raw status. This service owns the one mapping
 * from event → target status and delegates the actual, forward-only transition
 * (with StatusHistory timeline + AuditLog + validity checks) to the
 * StatusMachineService. This guarantees:
 *   - status is never "manually stuck": it always reflects real activity,
 *   - there is exactly one place that decides event → status,
 *   - the move is forward-only, never regresses, never touches terminal leads,
 *   - it is best-effort: reporting an event NEVER breaks the caller.
 *
 * Timeline + audit are produced by the underlying transition, so every event
 * that advances a lead automatically leaves a Zeitstrahl entry + audit record.
 */
import {
  FunnelPhase,
  FUNNEL_PHASE_RANK,
} from "@/features/fairtrain-funnel/funnelPhase";
import { LeadStatus } from "@/features/fairtrain-funnel/types";

import { leadRepository } from "../repositories/LeadRepository";
import { statusMachineService } from "./StatusMachineService";

/** Funnel lifecycle events that also carry a process (funnel) phase + trigger. */
const FUNNEL_EVENT_PHASE: Partial<Record<LeadLifecycleEvent, FunnelPhase>> = {
  FUNNEL_STARTED: FunnelPhase.ELIGIBILITY_STARTED,
  FUNNEL_COMPLETED: FunnelPhase.ELIGIBILITY_COMPLETED,
};

/** Map the funnel lifecycle event onto its Automation-Builder trigger id. */
const FUNNEL_EVENT_TRIGGER: Partial<
  Record<LeadLifecycleEvent, "FUNNEL_STARTED" | "FUNNEL_COMPLETED">
> = {
  FUNNEL_STARTED: "FUNNEL_STARTED",
  FUNNEL_COMPLETED: "FUNNEL_COMPLETED",
};

/** Real activities that can advance a lead. Named after what HAPPENED. */
export type LeadLifecycleEvent =
  | "MESSAGE_SENT" // first outbound WhatsApp/E-Mail (no landing link)
  | "LINK_FORWARDED" // outbound message containing the Eignungscheck/portal link
  | "REPLY_RECEIVED" // lead answered in Multichat (inbound webhook)
  | "LANDINGPAGE_OPENED" // lead opened the tokenised portal link
  | "FUNNEL_STARTED" // lead started the funnel/portal (first interaction)
  | "FUNNEL_COMPLETED"; // lead finished the Eignungscheck/portal

/** The one, authoritative event → status table. */
const EVENT_TARGET: Record<LeadLifecycleEvent, LeadStatus> = {
  MESSAGE_SENT: LeadStatus.CONTACTED,
  LINK_FORWARDED: LeadStatus.FORWARDED,
  REPLY_RECEIVED: LeadStatus.REPLIED,
  LANDINGPAGE_OPENED: LeadStatus.LANDINGPAGE_OPENED,
  FUNNEL_STARTED: LeadStatus.FUNNEL_STARTED,
  FUNNEL_COMPLETED: LeadStatus.FUNNEL_COMPLETED,
};

const EVENT_REASON: Record<LeadLifecycleEvent, string> = {
  MESSAGE_SENT: "Erstkontakt gesendet",
  LINK_FORWARDED: "Eignungscheck-/Landingpage-Link gesendet",
  REPLY_RECEIVED: "Antwort im Multichat erhalten",
  LANDINGPAGE_OPENED: "Landingpage geöffnet",
  FUNNEL_STARTED: "Funnel gestartet",
  FUNNEL_COMPLETED: "Funnel abgeschlossen",
};

export class LeadLifecycleService {
  /**
   * Report that `event` happened for a lead. Advances the pipeline status
   * forward when appropriate; returns the new status or null on a no-op.
   * Best-effort — never throws.
   */
  async record(
    leadId: string,
    event: LeadLifecycleEvent,
    opts?: { actor?: string; reason?: string },
  ): Promise<LeadStatus | null> {
    const status = await statusMachineService.advanceOnEngagement({
      leadId,
      target: EVENT_TARGET[event],
      actor: opts?.actor ?? "system",
      reason: opts?.reason ?? EVENT_REASON[event],
    });

    // Funnel events additionally set the process phase and fire the matching
    // Automation-Builder trigger (Funnel gestartet / abgeschlossen).
    if (FUNNEL_EVENT_TRIGGER[event]) {
      await this.emitFunnelEvent(leadId, event);
    }

    return status;
  }

  /**
   * Set the funnel process phase (forward-only) and fire the corresponding
   * Automation-Builder trigger. Best-effort: a failure here never breaks the
   * caller or the status transition. Also usable directly (e.g. the public
   * Eignungscheck submit) when only the funnel event should fire without
   * advancing the pipeline status.
   */
  async emitFunnelEvent(
    leadId: string,
    event: LeadLifecycleEvent,
  ): Promise<void> {
    const phase = FUNNEL_EVENT_PHASE[event];
    const trigger = FUNNEL_EVENT_TRIGGER[event];
    if (!phase || !trigger) return;

    // Forward-only funnel phase: never regress a lead's process phase.
    try {
      const lead = await leadRepository.findById(leadId);
      const currentRank = lead?.funnelPhase
        ? FUNNEL_PHASE_RANK[lead.funnelPhase] ?? 0
        : 0;
      if (FUNNEL_PHASE_RANK[phase] > currentRank) {
        await leadRepository.update(leadId, { funnelPhase: phase });
      }
    } catch {
      // best-effort phase update
    }

    // Fire the automation trigger (dynamic import breaks the import cycle
    // LeadLifecycle → Engine → …services… → LeadLifecycle).
    try {
      const { automationRuleEngine } = await import("./AutomationRuleEngine");
      await automationRuleEngine.runForTrigger(trigger, leadId);
    } catch {
      // best-effort trigger
    }

    // Funnel start/completion cancels ALL reactivation & reminder flows so a
    // lead in the application funnel never receives another reactivation
    // message. Also cancels any legacy campaign jobs — closing the historic gap
    // regardless of whether the new engine is live. Best-effort.
    try {
      const { workflowEngine } = await import("./workflow/WorkflowEngine");
      await workflowEngine.onFunnelStarted(leadId);
    } catch {
      // best-effort cancellation
    }
  }
}

export const leadLifecycleService = new LeadLifecycleService();
