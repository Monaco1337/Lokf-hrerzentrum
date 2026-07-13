/**
 * SlaService.
 *
 * Pure SLA evaluation + a server-side sweep that persists `slaBreachedAt`.
 *
 * Rule: a HOT lead must be CONTACTED (or later) within 30 minutes of creation.
 * If still HOT after 30 minutes without contact, the SLA is breached and the
 * lead is flagged for visible escalation.
 */
import {
  evaluateSla,
  HOT_SLA_MINUTES,
  type SlaEvaluation,
} from "@/features/fairtrain-funnel/utils/sla";
import { LeadPriority, type LeadSummary } from "@/features/fairtrain-funnel/types";

import { leadRepository } from "../repositories/LeadRepository";
import { statusMachineService } from "./StatusMachineService";

export { evaluateSla, HOT_SLA_MINUTES };
export type { SlaEvaluation };

export class SlaService {
  evaluate(lead: LeadSummary, now?: Date): SlaEvaluation {
    return evaluateSla(lead, now);
  }

  /**
   * Background sweep: mark breached HOT leads. Intended to be invoked from
   * a cron endpoint (Vercel Cron or VPS crontab).
   */
  async sweep(
    now: Date = new Date(),
  ): Promise<{ marked: number; reconciled: number }> {
    // Self-heal first: advance leads that were already contacted via WhatsApp
    // but are stuck in a pre-contact status, so SLA math + the Leitstand reflect
    // reality before we evaluate breaches.
    const { advanced } = await statusMachineService.reconcileWhatsappContacted();

    const candidates = await leadRepository.list(
      {
        priority: LeadPriority.HOT,
      },
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
    return { marked, reconciled: advanced };
  }
}

export const slaService = new SlaService();
