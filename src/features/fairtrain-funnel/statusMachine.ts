/**
 * Lead status state machine.
 *
 * The allowed transition matrix is the single source of truth. Both the
 * service layer (StatusMachineService) and the CRM UI (StatusChanger)
 * consult this map to validate or render valid options.
 *
 * Statemachine is intentionally additive: terminal states (CLOSED, REJECTED,
 * BLOCKED) have an empty transition list and cannot be reopened from this
 * MVP. Reopening is a future admin-override flow that must also write to
 * AuditLog.
 */
import { LeadStatus } from "./types";

export const ALLOWED_TRANSITIONS: Readonly<
  Record<LeadStatus, ReadonlyArray<LeadStatus>>
> = {
  [LeadStatus.NEW]: [
    LeadStatus.QUALIFIED,
    LeadStatus.HOT,
    LeadStatus.CONTACT_PENDING,
    // A first outbound WhatsApp/message IS contact, so a brand-new lead may go
    // straight to CONTACTED (auto-advance on send). Keeps the Leitstand honest.
    LeadStatus.CONTACTED,
    LeadStatus.BLOCKED,
    LeadStatus.REJECTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.QUALIFIED]: [
    LeadStatus.HOT,
    LeadStatus.CONTACT_PENDING,
    LeadStatus.CONTACTED,
    LeadStatus.REJECTED,
    LeadStatus.BLOCKED,
    LeadStatus.LOST,
  ],
  [LeadStatus.HOT]: [
    LeadStatus.CONTACT_PENDING,
    LeadStatus.CONTACTED,
    LeadStatus.REJECTED,
    LeadStatus.BLOCKED,
    LeadStatus.LOST,
  ],
  [LeadStatus.CONTACT_PENDING]: [
    LeadStatus.CONTACTED,
    LeadStatus.CALL_SCHEDULED,
    LeadStatus.REJECTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.CONTACTED]: [
    LeadStatus.CALL_SCHEDULED,
    LeadStatus.BRIEFING_SENT,
    LeadStatus.DOC_PENDING,
    LeadStatus.REJECTED,
    LeadStatus.BLOCKED,
    LeadStatus.LOST,
  ],
  [LeadStatus.CALL_SCHEDULED]: [
    LeadStatus.BRIEFING_SENT,
    LeadStatus.DOC_PENDING,
    LeadStatus.CONTACTED,
    LeadStatus.REJECTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.BRIEFING_SENT]: [
    LeadStatus.DOC_PENDING,
    LeadStatus.DOC_READY,
    LeadStatus.REJECTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.DOC_PENDING]: [
    LeadStatus.DOC_READY,
    LeadStatus.REJECTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.DOC_READY]: [
    LeadStatus.AA_APPOINTMENT_PENDING,
    LeadStatus.REJECTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.AA_APPOINTMENT_PENDING]: [
    LeadStatus.AA_APPOINTMENT_DONE,
    LeadStatus.REJECTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.AA_APPOINTMENT_DONE]: [
    LeadStatus.GUTSCHEIN_PENDING,
    LeadStatus.REJECTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.GUTSCHEIN_PENDING]: [
    LeadStatus.GUTSCHEIN_APPROVED,
    LeadStatus.REJECTED,
    LeadStatus.LOST,
  ],
  [LeadStatus.GUTSCHEIN_APPROVED]: [
    LeadStatus.ENROLLED,
    LeadStatus.CLOSED,
    LeadStatus.LOST,
  ],
  [LeadStatus.ENROLLED]: [
    LeadStatus.STARTED,
    LeadStatus.CLOSED,
    LeadStatus.LOST,
  ],
  [LeadStatus.STARTED]: [LeadStatus.CLOSED, LeadStatus.LOST],
  [LeadStatus.CLOSED]: [],
  [LeadStatus.LOST]: [],
  [LeadStatus.REJECTED]: [],
  [LeadStatus.BLOCKED]: [],
};

export function isTransitionAllowed(
  from: LeadStatus,
  to: LeadStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function allowedNextStatuses(from: LeadStatus): ReadonlyArray<LeadStatus> {
  return ALLOWED_TRANSITIONS[from];
}

export const TERMINAL_STATUSES: ReadonlySet<LeadStatus> = new Set([
  LeadStatus.CLOSED,
  LeadStatus.LOST,
  LeadStatus.REJECTED,
  LeadStatus.BLOCKED,
]);

export function isTerminal(status: LeadStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/**
 * Linear progress rank of the happy-path pipeline. Used to decide whether an
 * automatic engagement signal (we contacted them / they replied) may advance a
 * lead FORWARD — it must never pull a lead backwards. Terminal statuses are
 * intentionally absent (rank `undefined`) so auto-advance never touches them.
 */
export const PIPELINE_RANK: Partial<Record<LeadStatus, number>> = {
  [LeadStatus.NEW]: 0,
  [LeadStatus.QUALIFIED]: 1,
  [LeadStatus.HOT]: 1,
  [LeadStatus.CONTACT_PENDING]: 2,
  [LeadStatus.CONTACTED]: 3,
  [LeadStatus.CALL_SCHEDULED]: 4,
  [LeadStatus.BRIEFING_SENT]: 5,
  [LeadStatus.DOC_PENDING]: 6,
  [LeadStatus.DOC_READY]: 7,
  [LeadStatus.AA_APPOINTMENT_PENDING]: 8,
  [LeadStatus.AA_APPOINTMENT_DONE]: 9,
  [LeadStatus.GUTSCHEIN_PENDING]: 10,
  [LeadStatus.GUTSCHEIN_APPROVED]: 11,
  [LeadStatus.ENROLLED]: 12,
  [LeadStatus.STARTED]: 13,
};
