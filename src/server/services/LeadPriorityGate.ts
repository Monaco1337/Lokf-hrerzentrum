/**
 * LeadPriorityGate — the ONE place that decides whether a lead has actually
 * earned `priority=HOT`.
 *
 * HOT means "qualified applicant ready to handle NOW": the Eignungscheck
 * (funnel) is completed, at least one document has been uploaded, and the
 * score cleared the HOT threshold. Nothing else may set `priority=HOT`
 * directly — every call site that wants to escalate a lead (automation
 * rules, employment-situation routing, the SLA reconciliation sweep, the
 * portal upload flow) goes through `escalateLead` here, so an "urgent
 * callback needed" signal from e.g. a health-related reply can never turn
 * into a false "qualified HOT applicant" count in the Dashboard/header.
 */
import { FUNNEL_PHASE_RANK, FunnelPhase } from "@/features/fairtrain-funnel/funnelPhase";
import { SCORING_CONSTANTS } from "@/features/fairtrain-funnel/scoring/scoring";
import { AuditAction, LeadPriority, type LeadSummary } from "@/features/fairtrain-funnel/types";

import { leadRepository } from "../repositories/LeadRepository";
import { portalDocumentRepository } from "../repositories/PortalDocumentRepository";
import { auditLogService } from "./AuditLogService";

export async function meetsHotBar(lead: LeadSummary): Promise<boolean> {
  if (lead.score < SCORING_CONSTANTS.HOT_THRESHOLD) return false;
  const funnelDone =
    FUNNEL_PHASE_RANK[lead.funnelPhase] >=
    FUNNEL_PHASE_RANK[FunnelPhase.ELIGIBILITY_COMPLETED];
  if (!funnelDone) return false;
  const docs = await portalDocumentRepository.list(lead.id);
  return docs.some((d) => d.status === "UPLOADED" || d.status === "APPROVED");
}

/**
 * Escalate a lead for urgent human attention. Only actually sets `HOT` if
 * the lead has earned it (see `meetsHotBar`); otherwise it bumps priority to
 * WARM (never downgrades an existing HOT/BLOCKED) so the urgency is still
 * visible without inflating the "qualified applicants" count. The caller is
 * responsible for the actual urgency mechanism (e.g. a due task) — this only
 * governs the `priority` field.
 */
export async function escalateLead(
  leadId: string,
  opts: { actor: string; reason: string },
): Promise<void> {
  const lead = await leadRepository.findById(leadId);
  if (!lead || lead.priority === LeadPriority.BLOCKED) return;

  if (lead.priority === LeadPriority.HOT) return;

  const eligible = await meetsHotBar(lead);
  const nextPriority = eligible ? LeadPriority.HOT : LeadPriority.WARM;
  if (nextPriority === lead.priority) return;

  await leadRepository.update(leadId, { priority: nextPriority });
  await auditLogService.append({
    actor: opts.actor,
    action: AuditAction.LEAD_UPDATED,
    entityType: "Lead",
    entityId: leadId,
    details: { reason: opts.reason, priority: nextPriority },
  });
}
