/**
 * WorkflowSeedService — creates the default unified workflows (idempotent) and
 * performs the ONE-TIME, non-destructive migration of the legacy reactivation
 * queue (CampaignMessageJob) into WorkflowRuns.
 *
 * Nothing existing is deleted: templates, leads and campaign rows stay intact.
 * The migration positions each lead at its CURRENT point in the sequence so no
 * message is ever re-sent, and cancels the now-superseded legacy queue jobs so
 * the two systems can never both send.
 */
import {
  REACTIVATION_CAMPAIGN_KEY,
  campaignStepConfig,
} from "@/features/fairtrain-funnel/campaign/types";

import { automationTemplateRepository } from "../../repositories/AutomationTemplateRepository";
import { campaignRepository } from "../../repositories/CampaignRepository";
import { leadRepository } from "../../repositories/LeadRepository";
import {
  workflowDefinitionRepository,
  type WorkflowDefinitionRecord,
} from "../../repositories/WorkflowDefinitionRepository";
import { workflowRunRepository } from "../../repositories/WorkflowRunRepository";
import {
  buildApplicationGraph,
  buildInboundRouterGraph,
  buildReactivationGraph,
  WORKFLOW_NAME,
} from "./defaultWorkflows";

const DAY_MS = 86_400_000;

export interface MigrationSummary {
  scanned: number;
  enrolled: number;
  continued: number;
  skipped: number;
}

export class WorkflowSeedService {
  private async templateIdBySlug(slug: string): Promise<string | undefined> {
    const t = await automationTemplateRepository.findBySlug(slug);
    return t?.id;
  }

  /**
   * Ensure the three default workflows exist. Creates only what is missing
   * (matched by name), so re-running never duplicates or overwrites edits.
   */
  async ensureDefaults(): Promise<{ created: string[] }> {
    const created: string[] = [];

    const [tag0, followup1, followup2] = await Promise.all([
      this.templateIdBySlug(campaignStepConfig(1)?.whatsappTemplateSlug ?? ""),
      this.templateIdBySlug(campaignStepConfig(2)?.whatsappTemplateSlug ?? ""),
      this.templateIdBySlug(campaignStepConfig(3)?.whatsappTemplateSlug ?? ""),
    ]);

    const existing = await workflowDefinitionRepository.list();
    const byName = new Set(existing.map((d) => d.name));

    if (!byName.has(WORKFLOW_NAME.reactivation)) {
      await workflowDefinitionRepository.create({
        name: WORKFLOW_NAME.reactivation,
        description:
          "Alt-Lead-Reaktivierung: Erstkontakt, Erinnerungen und KI-Antwort-Routing in EINEM Prozess. Funnel-Start beendet den Ablauf automatisch.",
        processKey: "reactivation",
        trigger: "CAMPAIGN_ENROLL",
        status: "active",
        graph: buildReactivationGraph({ tag0, followup1, followup2 }),
      });
      created.push(WORKFLOW_NAME.reactivation);
    }

    if (!byName.has(WORKFLOW_NAME.inboundRouter)) {
      await workflowDefinitionRepository.create({
        name: WORKFLOW_NAME.inboundRouter,
        description:
          "Antwort-Router für Leads ohne laufende Reaktivierung: klassifiziert jede eingehende WhatsApp-Antwort und sendet genau die passende Folgevorlage.",
        processKey: "inbound_router",
        trigger: "MESSAGE_INBOUND",
        status: "active",
        graph: buildInboundRouterGraph(),
      });
      created.push(WORKFLOW_NAME.inboundRouter);
    }

    if (!byName.has(WORKFLOW_NAME.application)) {
      await workflowDefinitionRepository.create({
        name: WORKFLOW_NAME.application,
        description:
          "Bewerbungsprozess ab Funnel-Start: setzt die Funnel-Phase und legt die Bearbeitungsaufgabe an.",
        processKey: "application",
        trigger: "FUNNEL_STARTED",
        status: "active",
        graph: buildApplicationGraph(),
      });
      created.push(WORKFLOW_NAME.application);
    }

    return { created };
  }

  /**
   * One-time, non-destructive: take every lead that still has a queued
   * reactivation job and drive it via the engine instead. Leads that already
   * received step N are positioned at the matching wait node (no re-send);
   * leads not yet contacted are enrolled normally. Legacy queue jobs are then
   * canceled so only ONE system sends.
   */
  async migrateFromCampaign(): Promise<MigrationSummary> {
    const summary: MigrationSummary = { scanned: 0, enrolled: 0, continued: 0, skipped: 0 };
    const def = await workflowDefinitionRepository.firstActiveByProcess("reactivation");
    if (!def) return summary;

    const queued = await campaignRepository.listQueuedJobs(REACTIVATION_CAMPAIGN_KEY);
    const byLead = new Map<string, Date>(); // leadId → earliest scheduledFor
    for (const job of queued) {
      const prev = byLead.get(job.leadId);
      if (!prev || job.scheduledFor.getTime() < prev.getTime()) {
        byLead.set(job.leadId, job.scheduledFor);
      }
    }

    for (const [leadId, scheduledFor] of byLead) {
      summary.scanned += 1;
      const outcome = await this.migrateLead(def, leadId, scheduledFor);
      summary[outcome] += 1;
    }
    return summary;
  }

  private async migrateLead(
    def: WorkflowDefinitionRecord,
    leadId: string,
    scheduledFor: Date,
  ): Promise<"enrolled" | "continued" | "skipped"> {
    const existing = await workflowRunRepository.findLiveForLead(leadId, "reactivation");
    if (existing) return "skipped";

    const lead = await leadRepository.findById(leadId);
    if (!lead || lead.optOut || lead.campaignCompleted) return "skipped";

    const step = lead.campaignStep ?? 0;

    // Not yet contacted → enroll from the start (engine sends Tag 0).
    if (step <= 0) {
      const { workflowEngine } = await import("./WorkflowEngine");
      const id = await workflowEngine.enroll(def, leadId);
      await campaignRepository.cancelQueuedJobsForLead(leadId, "In Workflow-Engine übernommen");
      return id ? "enrolled" : "skipped";
    }

    // Already contacted → continue at the matching wait node WITHOUT re-sending.
    const nodeId = step === 1 ? "wait_1" : "wait_2";
    const created = await workflowRunRepository.create({
      definitionId: def.id,
      definitionVersion: def.version,
      processKey: "reactivation",
      graphSnapshot: def.graph,
      leadId,
      currentNodeId: nodeId,
      context: JSON.stringify({ migrated: true }),
    });
    if (!created) return "skipped";
    await workflowRunRepository.update(created.id, {
      status: "waiting",
      resumeAt: scheduledFor ?? new Date(Date.now() + DAY_MS),
      enteredNodeAt: new Date(),
    });
    await campaignRepository.cancelQueuedJobsForLead(leadId, "In Workflow-Engine übernommen");
    return "continued";
  }
}

export const workflowSeedService = new WorkflowSeedService();
