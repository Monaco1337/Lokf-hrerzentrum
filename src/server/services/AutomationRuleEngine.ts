/**
 * AutomationRuleEngine — evaluates rule conditions against a lead and executes
 * its actions. Internal CRM mutations (tasks, status, follow-ups, audit) run for
 * real so demo simulations are realistic; outbound messages are NEVER sent —
 * `sendTemplateSimulation` only renders + logs. Every run is persisted to
 * AutomationRunLog and mirrored to the AuditLog.
 */
import {
  AuditAction,
  LeadPriority,
  LeadStatusSchema,
  type ConsentState,
  type LeadDetail,
  type RuleAction,
  type RuleCondition,
  type RunLogStatus,
} from "@/features/fairtrain-funnel/types";
import {
  buildTemplateContext,
  renderTemplate,
} from "@/features/fairtrain-funnel/automation/TemplateRenderer";

import { NotFoundError } from "../errors";
import { auditLogRepository } from "../repositories/AuditLogRepository";
import { automationRuleRepository } from "../repositories/AutomationRuleRepository";
import { automationRunLogRepository } from "../repositories/AutomationRunLogRepository";
import { automationTemplateRepository } from "../repositories/AutomationTemplateRepository";
import { demoSeedRepository } from "../repositories/DemoSeedRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { taskRepository } from "../repositories/TaskRepository";
import { consentService } from "./ConsentService";
import { statusMachineService } from "./StatusMachineService";

interface ConditionResult {
  type: string;
  passed: boolean;
  note?: string;
}
interface ActionResult {
  type: string;
  result: string;
}

export class AutomationRuleEngine {
  async simulate(ruleId: string, leadId: string, actor: string) {
    const rule = await automationRuleRepository.findById(ruleId);
    if (!rule) throw new NotFoundError("AutomationRule", ruleId);
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);

    const consents = await consentService.currentStates(leadId);
    const isDemoLead = (
      await demoSeedRepository.listByType("Lead")
    ).includes(leadId);

    const conditions = rule.conditions.map((c) =>
      this.evalCondition(c, lead, consents, isDemoLead),
    );
    const allPassed = conditions.every((c) => c.passed);

    const actions: ActionResult[] = [];
    let status: RunLogStatus = "SIMULATED";
    let hadError = false;

    if (!allPassed) {
      status = "SKIPPED";
    } else {
      for (const action of rule.actions) {
        try {
          actions.push(await this.runAction(action, lead, actor));
        } catch (err) {
          hadError = true;
          actions.push({
            type: action.type,
            result: `Fehler: ${err instanceof Error ? err.message : "unbekannt"}`,
          });
        }
      }
      if (hadError) status = "ERROR";
    }

    const summary = !allPassed
      ? `Bedingungen nicht erfüllt – keine Aktion ausgeführt`
      : `${actions.length} Aktion(en) ${hadError ? "mit Fehlern " : ""}simuliert für ${lead.firstName} ${lead.lastName}`;

    const run = await automationRunLogRepository.append({
      ruleId,
      leadId,
      status,
      summary,
      detail: { conditions, actions },
      isTest: true,
      triggeredBy: actor,
    });
    await automationRuleRepository.recordRun(ruleId, hadError);
    await auditLogRepository.append({
      actor,
      action: AuditAction.AUTOMATION_RULE_SIMULATED,
      entityType: "AutomationRule",
      entityId: ruleId,
      details: JSON.stringify({ leadId, status, actions: actions.length }),
    });
    return run;
  }

  private evalCondition(
    c: RuleCondition,
    lead: LeadDetail,
    consents: ConsentState[],
    isDemoLead: boolean,
  ): ConditionResult {
    const granted = (t: string) =>
      consents.find((x) => x.type === t)?.granted ?? false;
    const hoursSince = (d: Date | null) =>
      d ? (Date.now() - d.getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;

    switch (c.type) {
      case "hasWhatsappConsent":
        return { type: c.type, passed: granted("WHATSAPP") };
      case "hasEmailConsent":
        return { type: c.type, passed: granted("EMAIL") };
      case "leadStatus":
        return { type: c.type, passed: lead.status === String(c.value) };
      case "funnelStage":
        return { type: c.type, passed: lead.status === String(c.value) };
      case "priority":
        return { type: c.type, passed: lead.priority === String(c.value) };
      case "scoreGreaterThan":
        return { type: c.type, passed: lead.score > Number(c.value ?? 0) };
      case "ownerAssigned":
        return { type: c.type, passed: lead.assignedToId != null };
      case "isDemo":
        return { type: c.type, passed: isDemoLead };
      case "businessHoursOnly": {
        const now = new Date();
        const ok = now.getDay() >= 1 && now.getDay() <= 5 && now.getHours() >= 8 && now.getHours() < 18;
        return { type: c.type, passed: ok, note: ok ? "innerhalb Geschäftszeiten" : "außerhalb Geschäftszeiten" };
      }
      case "noInboundReplyForHours":
      case "noFormOpenedForHours":
      case "noUploadForHours": {
        const h = hoursSince(lead.updatedAt ?? lead.createdAt);
        const passed = h >= Number(c.value ?? 0);
        return { type: c.type, passed, note: `${Math.floor(h)}h seit letzter Aktivität` };
      }
      case "missingDocuments":
        return { type: c.type, passed: true, note: "Demo-Annahme: Unterlagen unvollständig" };
      default:
        return { type: c.type, passed: false, note: "unbekannte Bedingung" };
    }
  }

  private async runAction(
    action: RuleAction,
    lead: LeadDetail,
    actor: string,
  ): Promise<ActionResult> {
    switch (action.type) {
      case "sendTemplateSimulation": {
        if (!action.templateId) return { type: action.type, result: "Keine Vorlage gewählt" };
        const tpl = await automationTemplateRepository.findById(action.templateId);
        if (!tpl) return { type: action.type, result: "Vorlage nicht gefunden" };
        const ctx = buildTemplateContext(lead, "lokfuehrerzentrum.de", {
          ownerName: lead.assignedTo,
        });
        const preview = renderTemplate(tpl.body, ctx).slice(0, 160);
        await automationTemplateRepository.recordUsage(tpl.id);
        return {
          type: action.type,
          result: `Simulierter ${tpl.channel}-Versand · "${tpl.name}": ${preview}`,
        };
      }
      case "createTask": {
        const title = action.taskTitle?.trim() || "Automatische Aufgabe";
        const task = await taskRepository.create({
          title,
          leadId: lead.id,
          assigneeId: lead.assignedToId ?? null,
          createdById: actor,
          dueAt: new Date(Date.now() + 24 * 3_600_000),
        });
        await auditLogRepository.append({
          actor,
          action: AuditAction.TASK_CREATED,
          entityType: "Task",
          entityId: task.id,
          details: JSON.stringify({ title, viaAutomation: true }),
        });
        return { type: action.type, result: `Aufgabe erstellt: ${title}` };
      }
      case "createFollowUp": {
        const when = new Date(Date.now() + (action.hours ?? 24) * 3_600_000);
        await leadRepository.update(lead.id, { nextFollowUpAt: when });
        await auditLogRepository.append({
          actor,
          action: AuditAction.FOLLOW_UP_SCHEDULED,
          entityType: "Lead",
          entityId: lead.id,
          details: JSON.stringify({ when: when.toISOString(), viaAutomation: true }),
        });
        return { type: action.type, result: `Follow-up geplant: ${when.toLocaleString("de-DE")}` };
      }
      case "changeLeadStatus": {
        const parsed = LeadStatusSchema.safeParse(action.status);
        if (!parsed.success) return { type: action.type, result: "Ungültiger Zielstatus" };
        await statusMachineService.transition({
          leadId: lead.id,
          toStatus: parsed.data,
          actor,
          reason: "Automation",
          override: true,
        });
        return { type: action.type, result: `Status → ${parsed.data}` };
      }
      case "assignOwner": {
        if (!action.ownerId) return { type: action.type, result: "Kein Bearbeiter angegeben" };
        await leadRepository.update(lead.id, {
          assignedToId: action.ownerId,
          assignedAt: new Date(),
        });
        await auditLogRepository.append({
          actor,
          action: AuditAction.LEAD_ASSIGNED,
          entityType: "Lead",
          entityId: lead.id,
          details: JSON.stringify({ ownerId: action.ownerId, viaAutomation: true }),
        });
        return { type: action.type, result: `Bearbeiter zugewiesen` };
      }
      case "markEscalated": {
        await leadRepository.update(lead.id, { priority: LeadPriority.HOT });
        await auditLogRepository.append({
          actor,
          action: AuditAction.WORKFLOW_AUTOMATION,
          entityType: "Lead",
          entityId: lead.id,
          details: JSON.stringify({ escalated: true, note: action.note ?? "" }),
        });
        return { type: action.type, result: "Als eskaliert markiert (Priorität: heiß)" };
      }
      case "addActivityLog": {
        await auditLogRepository.append({
          actor,
          action: AuditAction.WORKFLOW_AUTOMATION,
          entityType: "Lead",
          entityId: lead.id,
          details: JSON.stringify({ note: action.note ?? "Automatischer Eintrag" }),
        });
        return { type: action.type, result: `Log: ${action.note ?? "Eintrag erstellt"}` };
      }
      case "notifyAdminSimulation":
        return {
          type: action.type,
          result: `Admin-Benachrichtigung (Simulation): ${action.note ?? "Hinweis"}`,
        };
      default:
        return { type: action.type, result: "unbekannte Aktion" };
    }
  }
}

export const automationRuleEngine = new AutomationRuleEngine();
