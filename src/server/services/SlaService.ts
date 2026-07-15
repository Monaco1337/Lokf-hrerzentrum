/**
 * SlaService.
 *
 * Pure SLA evaluation + a server-side sweep that persists `slaBreachedAt`.
 *
 * Rule: a HOT lead must be CONTACTED (or later) within 30 minutes of creation.
 * If still HOT after 30 minutes without contact, the SLA is breached and the
 * lead is flagged for visible escalation.
 *
 * The sweep also self-heals two sources of a permanently-wrong "Eskalation"
 * badge in the CRM header:
 *   1. `priority=HOT` that was auto-assigned before a lead actually earned it
 *      (funnel completed AND documents uploaded) — see
 *      `PortalService.promoteHotIfEligible` for the forward-looking gate this
 *      mirrors backwards. A genuine manual override by an operator (found via
 *      AuditLog) is left untouched.
 *   2. `slaBreachedAt` that, once set, was never cleared again — even after
 *      the lead got contacted/reassigned or downgraded away from HOT. Without
 *      this, the header's "Eskalation" count only ever grows.
 */
import {
  AuditAction,
  LeadPriority,
  LeadStatus,
  type LeadSummary,
} from "@/features/fairtrain-funnel/types";
import {
  evaluateSla,
  HOT_SLA_MINUTES,
  type SlaEvaluation,
} from "@/features/fairtrain-funnel/utils/sla";

import { leadRepository } from "../repositories/LeadRepository";
import { auditLogService } from "./AuditLogService";
import { meetsHotBar } from "./LeadPriorityGate";
import { statusMachineService } from "./StatusMachineService";

export { evaluateSla, HOT_SLA_MINUTES };
export type { SlaEvaluation };

/** Leads still inside the 30-minute HOT contact window (mirrors utils/sla.ts). */
const CONTACT_WINDOW_STATUSES: ReadonlySet<LeadStatus> = new Set([
  LeadStatus.NEW,
  LeadStatus.QUALIFIED,
  LeadStatus.HOT,
  LeadStatus.CONTACT_PENDING,
]);

export interface SlaSweepResult {
  marked: number;
  reconciled: number;
  priorityDowngraded: number;
  slaCleared: number;
}

export class SlaService {
  evaluate(lead: LeadSummary, now?: Date): SlaEvaluation {
    return evaluateSla(lead, now);
  }

  /**
   * Background sweep: mark breached HOT leads, and self-heal both stale
   * over-assignment (see class doc) so the header stays truthful without a
   * manual fix every time. Intended to be invoked from a cron endpoint.
   */
  async sweep(now: Date = new Date()): Promise<SlaSweepResult> {
    // Self-heal first: advance leads that were already contacted via WhatsApp
    // but are stuck in a pre-contact status, so SLA math + the Dashboard reflect
    // reality before we evaluate breaches.
    const { advanced } = await statusMachineService.reconcileWhatsappContacted();

    const priorityDowngraded = await this.reconcileHotPriority();

    const candidates = await leadRepository.list(
      { priority: LeadPriority.HOT },
      { limit: 1000 },
    );
    let marked = 0;
    for (const lead of candidates) {
      if (lead.slaBreachedAt) continue;
      const evalResult = evaluateSla(lead, now);
      if (evalResult.breached) {
        await leadRepository.update(lead.id, { slaBreachedAt: now });
        marked += 1;
      }
    }

    const slaCleared = await this.clearStaleSlaBreaches();

    return { marked, reconciled: advanced, priorityDowngraded, slaCleared };
  }

  /**
   * Correct leads that ended up `priority=HOT` WITHOUT having actually earned
   * it (funnel completed AND documents uploaded) — from before that rule
   * existed, from a regression, or from an automation/reply-classifier flow
   * that escalates a lead for an urgent callback (health-related replies,
   * "markEscalated" rule actions) regardless of lead type. Applies to EVERY
   * lead, not just applications — a reactivated `alt_lead` that merely
   * replies positively is not a "qualified HOT applicant" either. Skips any
   * lead where an operator deliberately set the priority by hand (found via
   * AuditLog), so a human decision is never silently overridden.
   */
  private async reconcileHotPriority(): Promise<number> {
    const hotLeads = await leadRepository.list(
      { priority: LeadPriority.HOT },
      { limit: 5000 },
    );
    let downgraded = 0;
    for (const lead of hotLeads) {
      if (await meetsHotBar(lead)) continue;
      if (await this.hasManualPriorityOverride(lead.id)) continue;

      await leadRepository.update(lead.id, {
        priority: LeadPriority.WARM,
        slaBreachedAt: null,
      });
      await auditLogService.append({
        actor: "system",
        action: AuditAction.LEAD_UPDATED,
        entityType: "Lead",
        entityId: lead.id,
        details: {
          reason: "hot_priority_reconciliation",
          from: "HOT",
          to: "WARM",
          note: "Kriterium nicht erfüllt: Funnel abgeschlossen + Unterlagen hochgeladen",
        },
      });
      downgraded += 1;
    }
    return downgraded;
  }

  /**
   * The ONLY genuine manual override entry point is the CRM "Priorität"
   * quick-action (`setLeadPriority`), which logs `{ priority }` with no
   * `reason` key. Every automated writer (this reconciliation, the portal
   * upload gate, escalation flows) always includes a `reason`, and is
   * sometimes attributed to the lead's assigned rep for traceability — so
   * matching on the actor id alone would be unreliable. Matching on the
   * absence of `reason` is not.
   */
  private async hasManualPriorityOverride(leadId: string): Promise<boolean> {
    const entries = await auditLogService.listForEntity("Lead", leadId);
    return entries.some((e) => {
      if (e.action !== AuditAction.LEAD_UPDATED) return false;
      if (!e.details) return false;
      try {
        const parsed = JSON.parse(e.details) as Record<string, unknown>;
        return typeof parsed.priority === "string" && !("reason" in parsed);
      } catch {
        return false;
      }
    });
  }

  /**
   * A breach flag that, once set, was never cleared — even once the lead got
   * contacted/reassigned or downgraded away from HOT. Left unchecked the
   * header's "Eskalation" count only ever grows. Clears it the moment the
   * lead is no longer inside the 30-minute HOT contact window.
   */
  private async clearStaleSlaBreaches(): Promise<number> {
    const flagged = await leadRepository.list(
      { slaBreachedOnly: true },
      { limit: 2000 },
    );
    let cleared = 0;
    for (const lead of flagged) {
      const stillRelevant =
        lead.priority === LeadPriority.HOT &&
        CONTACT_WINDOW_STATUSES.has(lead.status);
      if (stillRelevant) continue;
      await leadRepository.update(lead.id, { slaBreachedAt: null });
      cleared += 1;
    }
    return cleared;
  }
}

export const slaService = new SlaService();
