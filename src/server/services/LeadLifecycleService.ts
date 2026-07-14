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
import { LeadStatus } from "@/features/fairtrain-funnel/types";

import { statusMachineService } from "./StatusMachineService";

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
    return statusMachineService.advanceOnEngagement({
      leadId,
      target: EVENT_TARGET[event],
      actor: opts?.actor ?? "system",
      reason: opts?.reason ?? EVENT_REASON[event],
    });
  }
}

export const leadLifecycleService = new LeadLifecycleService();
