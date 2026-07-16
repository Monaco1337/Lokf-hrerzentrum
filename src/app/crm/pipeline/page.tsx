/**
 * /crm/pipeline — full 12-column kanban with drag & drop.
 *
 * Server-loads every active lead in the operator's scope, enriches with
 * insights, hands the snapshot to the client board. Status writes go through
 * the existing `updateLeadStatus` server action so audit logging, status
 * history and SLA bookkeeping are all preserved.
 */
import { PipelineBoard } from "@/features/fairtrain-funnel/crm/operations/PipelineBoard";
import { LeadStatus } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { applyScope } from "@/server/services/LeadAccess";
import { leadInsightsService } from "@/server/services/LeadInsightsService";
import { leadService } from "@/server/services/LeadService";

export const dynamic = "force-dynamic";

const BOARD_STATUSES: ReadonlyArray<LeadStatus> = [
  LeadStatus.NEW,
  LeadStatus.CONTACT_PENDING,
  LeadStatus.CALL_SCHEDULED,
  LeadStatus.CONTACTED,
  LeadStatus.QUALIFIED,
  LeadStatus.HOT,
  LeadStatus.BRIEFING_SENT,
  LeadStatus.DOC_PENDING,
  LeadStatus.DOC_READY,
  LeadStatus.AA_APPOINTMENT_PENDING,
  LeadStatus.AA_APPOINTMENT_DONE,
  LeadStatus.GUTSCHEIN_PENDING,
  LeadStatus.GUTSCHEIN_APPROVED,
  LeadStatus.ENROLLED,
  LeadStatus.STARTED,
  LeadStatus.LOST,
];

export default async function PipelinePage() {
  const user = await requireCrmUser();
  // Alt-Leads (Reaktivierung) never appear in the Pipeline until they
  // themselves start/complete the Eignungscheck and become "neu" (see
  // LeadService.submit) — mirrors the Dashboard/Leads scoping.
  const scope = applyScope({ status: BOARD_STATUSES, leadType: "neu" }, user);
  const leads = await leadService.list(scope);
  const enriched = await leadInsightsService.enrich(leads);
  return <PipelineBoard leads={enriched} />;
}
