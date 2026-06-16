/**
 * Pure SLA evaluation - safe to import in UI components.
 *
 * The sweep that PERSISTS slaBreachedAt lives in `src/server/services/SlaService.ts`
 * (server-only). UI uses this helper for read-only rendering.
 */
import { LeadPriority, LeadStatus, type LeadSummary } from "../types";

export const HOT_SLA_MINUTES = 30;
const HOT_SLA_MS = HOT_SLA_MINUTES * 60_000;

export interface SlaEvaluation {
  breached: boolean;
  minutesElapsed: number;
  minutesRemaining: number;
}

export function evaluateSla(
  lead: LeadSummary,
  now: Date = new Date(),
): SlaEvaluation {
  if (lead.priority !== LeadPriority.HOT) {
    return { breached: false, minutesElapsed: 0, minutesRemaining: 0 };
  }
  const stillInContactWindow =
    lead.status === LeadStatus.NEW ||
    lead.status === LeadStatus.QUALIFIED ||
    lead.status === LeadStatus.HOT ||
    lead.status === LeadStatus.CONTACT_PENDING;
  if (!stillInContactWindow) {
    return { breached: false, minutesElapsed: 0, minutesRemaining: 0 };
  }
  const elapsed = now.getTime() - lead.createdAt.getTime();
  const minutesElapsed = Math.floor(elapsed / 60_000);
  const breached = elapsed > HOT_SLA_MS || lead.slaBreachedAt !== null;
  const minutesRemaining = Math.max(0, HOT_SLA_MINUTES - minutesElapsed);
  return { breached, minutesElapsed, minutesRemaining };
}
