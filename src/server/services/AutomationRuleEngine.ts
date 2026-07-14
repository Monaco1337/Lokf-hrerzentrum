/**
 * AutomationRuleEngine — evaluates rule conditions against a lead and executes
 * its actions. Internal CRM mutations (tasks, status, follow-ups, audit) run for
 * real so demo simulations are realistic; outbound messages are NEVER sent —
 * `sendTemplateSimulation` only renders + logs. Every run is persisted to
 * AutomationRunLog and mirrored to the AuditLog.
 */
import {
  AuditAction,
  type AutomationRunLogEntry,
  type AutomationTrigger,
  CommunicationChannel,
  type ConditionLogic,
  FUNNEL_PHASE_LABEL,
  isFunnelPhase,
  LeadPriority,
  LeadStatusSchema,
  type ConsentState,
  type LeadDetail,
  type RuleAction,
  type RuleCondition,
  type RunLogStatus,
  type WorkflowSimulationResult,
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
import { userRepository } from "../repositories/UserRepository";
import { auditLogService } from "./AuditLogService";
import { consentService } from "./ConsentService";
import {
  classifyEmploymentQuickReply,
  classifyEmploymentReply,
  SITUATION_LABEL,
  type EmploymentSituation,
} from "./EmploymentReplyClassifier";
import { noteRepository } from "../repositories/NoteRepository";
import {
  analyzeReply,
  REPLY_INTENT_LABEL,
  type ReplyAnalysis,
  type ReplyIntent,
} from "./ReplyIntentClassifier";
import { statusMachineService } from "./StatusMachineService";

/**
 * Context of the inbound reply that fired a MESSAGE_INBOUND run. Lets rules
 * branch on the concrete answer (quick-reply / free text / detected situation).
 * Absent for non-inbound triggers and for simulation/testmode — the reply
 * conditions then simply evaluate to "not met", so existing rules are unaffected.
 */
export interface InboundEventContext {
  replyReceived: boolean;
  body: string;
  buttonId?: string | undefined;
  buttonTitle?: string | undefined;
  quickReplySituation: EmploymentSituation | null;
  detectedSituation: EmploymentSituation;
  /** Rich AI classification of the reply ("Antwort analysieren (KI)"). */
  analysis: ReplyAnalysis;
}

/** Build an engine event context from a raw inbound reply. */
export function buildInboundEventContext(input: {
  body?: string | undefined;
  buttonId?: string | undefined;
  buttonTitle?: string | undefined;
}): InboundEventContext {
  return {
    replyReceived: true,
    body: input.body ?? "",
    buttonId: input.buttonId,
    buttonTitle: input.buttonTitle,
    quickReplySituation: classifyEmploymentQuickReply(input),
    detectedSituation: classifyEmploymentReply(input).situation,
    analysis: analyzeReply(input),
  };
}

/**
 * Resolve the reply analysis a condition should evaluate against: the live
 * inbound event (preferred), or — when a rule runs outside an inbound trigger —
 * the analysis previously stored on the lead. Returns null when neither exists,
 * so AI conditions simply evaluate to "not met" and existing rules are safe.
 */
function resolveReplyAnalysis(
  lead: LeadDetail,
  event?: InboundEventContext,
): ReplyAnalysis | null {
  if (event?.analysis) return event.analysis;
  if (!lead.replyIntent && !lead.replyInterest) return null;
  const intent = (lead.replyIntent ?? "other") as ReplyIntent;
  const interest =
    lead.replyInterest === "yes" || lead.replyInterest === "no"
      ? lead.replyInterest
      : "unknown";
  return {
    intent,
    interest,
    employment:
      intent === "employed" ||
      intent === "job_seeking" ||
      intent === "job_insecure" ||
      intent === "career_change"
        ? intent
        : null,
    flags: {
      interest: interest === "yes",
      employed: intent === "employed",
      jobSeeking: intent === "job_seeking",
      jobInsecure: intent === "job_insecure",
      careerChange: intent === "career_change",
      generalInterest: intent === "general_interest",
      noInterest: intent === "no_interest",
      callback: intent === "callback",
      question: intent === "question",
      stop: intent === "stop",
    },
    confidence: (lead.replyConfidence ?? 0) / 100,
    manualReview: lead.needsManualReview,
    originalMessage: lead.lastInboundMessage ?? "",
    source: "freetext",
  };
}

function foldText(input: string | undefined): string {
  return (input ?? "")
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();
}

interface ConditionResult {
  type: string;
  passed: boolean;
  note?: string;
}
interface ActionResult {
  type: string;
  result: string;
  /** When true the remaining actions of the rule are skipped (branch/endWorkflow). */
  stop?: boolean;
}

export class AutomationRuleEngine {
  private cachedActorId: string | null = null;

  /** A real user id used as the actor for automatic (event) executions. */
  private async systemActor(): Promise<string> {
    if (this.cachedActorId) return this.cachedActorId;
    const id = await userRepository.findSystemActorId();
    this.cachedActorId = id ?? "system:automation";
    return this.cachedActorId;
  }

  /**
   * Event-driven execution: run every ACTIVE rule bound to `trigger` against a
   * lead. This is what makes `status: "active"` real.
   *
   * `runMode` gates the side effects:
   *   • production_ready → actions run for real (status EXECUTED)
   *   • simulation       → dry run, no mutations, logged (status SIMULATED)
   *   • demo             → never auto-runs (seed/demo only)
   *
   * Loop-safety: triggers are fired from the user/action & webhook layer, and
   * the engine's own `changeLeadStatus` calls StatusMachineService directly
   * (not the status action), so executing a rule can never re-fire a trigger.
   * Best-effort by design — callers wrap this and never let it block.
   */
  async runForTrigger(
    trigger: AutomationTrigger,
    leadId: string,
    opts: { actor?: string; event?: InboundEventContext } = {},
  ): Promise<AutomationRunLogEntry[]> {
    const rules = await automationRuleRepository.listActiveByTrigger(trigger);
    const executable = rules.filter((r) => r.runMode !== "demo");
    if (executable.length === 0) return [];

    const lead = await leadRepository.findById(leadId);
    if (!lead) return [];

    const actor = opts.actor ?? (await this.systemActor());
    const consents = await consentService.currentStates(leadId);
    const isDemoLead = (await demoSeedRepository.listByType("Lead")).includes(leadId);

    const runs: AutomationRunLogEntry[] = [];
    for (const rule of executable) {
      const dryRun = rule.runMode === "simulation";
      const conditions = rule.conditions.map((c) =>
        this.evalCondition(c, lead, consents, isDemoLead, opts.event),
      );
      const allPassed = this.combineConditions(conditions, rule.conditionLogic);
      const guard = (c: RuleCondition) =>
        this.evalCondition(c, lead, consents, isDemoLead, opts.event).passed;

      const actions: ActionResult[] = [];
      let status: RunLogStatus = dryRun ? "SIMULATED" : "EXECUTED";
      let hadError = false;

      if (!allPassed) {
        status = "SKIPPED";
      } else {
        for (const action of rule.actions) {
          try {
            const res = await this.runAction(action, lead, actor, dryRun, guard);
            actions.push(res);
            if (res.stop) break;
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

      const verb = dryRun ? "simuliert" : "ausgeführt";
      const summary = !allPassed
        ? "Bedingungen nicht erfüllt – keine Aktion ausgeführt"
        : `${actions.length} Aktion(en) ${hadError ? "mit Fehlern " : ""}${verb} für ${lead.firstName} ${lead.lastName}`;

      const run = await automationRunLogRepository.append({
        ruleId: rule.id,
        leadId,
        status,
        summary,
        detail: { conditions, actions },
        isTest: dryRun,
        triggeredBy: `event:${trigger}`,
      });
      await automationRuleRepository.recordRun(rule.id, hadError);
      await auditLogRepository.append({
        actor,
        action: AuditAction.WORKFLOW_AUTOMATION,
        entityType: "AutomationRule",
        entityId: rule.id,
        details: JSON.stringify({ trigger, leadId, status, dryRun, actions: actions.length }),
      });
      runs.push(run);
    }
    return runs;
  }

  /**
   * Testmodus: dry-run an (unsaved) workflow DRAFT against a real lead and
   * return a full step-by-step trace. Never persists a run log, never mutates
   * data, never sends a message — safe read-only operation for the builder.
   */
  async traceDraft(
    draft: {
      trigger: string;
      conditions: RuleCondition[];
      conditionLogic?: ConditionLogic;
      actions: RuleAction[];
    },
    leadId: string,
  ): Promise<WorkflowSimulationResult> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);

    const consents = await consentService.currentStates(leadId);
    const isDemoLead = (await demoSeedRepository.listByType("Lead")).includes(leadId);

    const conditions = draft.conditions.map((c) =>
      this.evalCondition(c, lead, consents, isDemoLead),
    );
    const allPassed = this.combineConditions(conditions, draft.conditionLogic);
    const guard = (c: RuleCondition) =>
      this.evalCondition(c, lead, consents, isDemoLead).passed;

    const actions: ActionResult[] = [];
    if (allPassed) {
      for (const action of draft.actions) {
        try {
          const res = await this.runAction(action, lead, "simulation", true, guard);
          actions.push(res);
          if (res.stop) break;
        } catch (err) {
          actions.push({
            type: action.type,
            result: `Fehler: ${err instanceof Error ? err.message : "unbekannt"}`,
          });
        }
      }
    }

    const granted = (t: string) => consents.find((x) => x.type === t)?.granted ?? false;
    return {
      triggerType: draft.trigger,
      recipient: {
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`.trim() || "Lead",
        status: lead.status,
        whatsappConsent: granted("WHATSAPP"),
        emailConsent: granted("EMAIL"),
      },
      conditions: conditions.map((c) => ({
        type: c.type,
        passed: c.passed,
        ...(c.note !== undefined ? { note: c.note } : {}),
      })),
      allPassed,
      actions: actions.map((a) => ({ type: a.type, result: a.result })),
    };
  }

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
    const allPassed = this.combineConditions(conditions, rule.conditionLogic);
    const guard = (c: RuleCondition) =>
      this.evalCondition(c, lead, consents, isDemoLead).passed;

    const actions: ActionResult[] = [];
    let status: RunLogStatus = "SIMULATED";
    let hadError = false;

    if (!allPassed) {
      status = "SKIPPED";
    } else {
      for (const action of rule.actions) {
        try {
          const res = await this.runAction(action, lead, actor, false, guard);
          actions.push(res);
          if (res.stop) break;
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

  /**
   * Combine condition results with the rule's UND/ODER logic. No conditions →
   * always passes. "any" (ODER) → at least one; "all" (UND, default) → every.
   */
  private combineConditions(
    results: ConditionResult[],
    logic: ConditionLogic | undefined,
  ): boolean {
    if (results.length === 0) return true;
    return logic === "any"
      ? results.some((c) => c.passed)
      : results.every((c) => c.passed);
  }

  private evalCondition(
    c: RuleCondition,
    lead: LeadDetail,
    consents: ConsentState[],
    isDemoLead: boolean,
    event?: InboundEventContext,
  ): ConditionResult {
    const granted = (t: string) =>
      consents.find((x) => x.type === t)?.granted ?? false;
    const hoursSince = (d: Date | null) =>
      d ? (Date.now() - d.getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;

    switch (c.type) {
      case "whatsappReplyReceived": {
        const passed = event?.replyReceived === true;
        return {
          type: c.type,
          passed,
          note: passed ? "Antwort liegt vor" : "keine eingehende Antwort im Kontext",
        };
      }
      case "quickReplySelection": {
        const want = String(c.value ?? "") as EmploymentSituation;
        const got = event?.quickReplySituation ?? null;
        const passed = got !== null && got === want;
        return {
          type: c.type,
          passed,
          note: got
            ? `Button: ${SITUATION_LABEL[got] ?? got}`
            : "kein Quick-Reply-Button erkannt",
        };
      }
      case "detectedSituation": {
        const want = String(c.value ?? "") as EmploymentSituation;
        const got = event?.detectedSituation ?? null;
        const passed = got !== null && got === want;
        return {
          type: c.type,
          passed,
          note: got ? `erkannt: ${SITUATION_LABEL[got] ?? got}` : "keine Antwort im Kontext",
        };
      }
      case "analyzeReply": {
        const a = resolveReplyAnalysis(lead, event);
        if (!a) return { type: c.type, passed: false, note: "keine Antwort im Kontext" };
        const passed = !a.manualReview;
        return {
          type: c.type,
          passed,
          note: passed
            ? `erkannt: ${REPLY_INTENT_LABEL[a.intent]} (${Math.round(a.confidence * 100)}%)`
            : "unsicher → manuelle Prüfung",
        };
      }
      case "aiInterestDetected":
      case "aiEmployed":
      case "aiJobSeeking":
      case "aiCareerChange":
      case "aiJobInsecure":
      case "aiGeneralInterest":
      case "aiCallback":
      case "aiQuestion":
      case "aiStop":
      case "aiNoInterest": {
        const a = resolveReplyAnalysis(lead, event);
        if (!a) return { type: c.type, passed: false, note: "keine Antwort im Kontext" };
        const flagMap: Record<string, boolean> = {
          aiInterestDetected: a.flags.interest,
          aiEmployed: a.flags.employed,
          aiJobSeeking: a.flags.jobSeeking,
          aiCareerChange: a.flags.careerChange,
          aiJobInsecure: a.flags.jobInsecure,
          aiGeneralInterest: a.flags.generalInterest,
          aiCallback: a.flags.callback,
          aiQuestion: a.flags.question,
          aiStop: a.flags.stop,
          aiNoInterest: a.flags.noInterest,
        };
        const passed = flagMap[c.type] === true;
        return {
          type: c.type,
          passed,
          note: `Analyse: ${REPLY_INTENT_LABEL[a.intent]}`,
        };
      }
      case "replyTextEquals": {
        const passed =
          event != null && foldText(event.body) === foldText(String(c.value ?? ""));
        return { type: c.type, passed };
      }
      case "replyTextContains": {
        const needle = foldText(String(c.value ?? ""));
        const passed =
          event != null && needle.length > 0 && foldText(event.body).includes(needle);
        return { type: c.type, passed };
      }
      case "hasWhatsappConsent":
        return { type: c.type, passed: granted("WHATSAPP") };
      case "hasEmailConsent":
        return { type: c.type, passed: granted("EMAIL") };
      case "leadStatus":
        return { type: c.type, passed: lead.status === String(c.value) };
      case "funnelPhase": {
        // Process step (separate axis from the communication status).
        const passed = lead.funnelPhase === String(c.value);
        return {
          type: c.type,
          passed,
          note: `Phase: ${FUNNEL_PHASE_LABEL[lead.funnelPhase] ?? lead.funnelPhase}`,
        };
      }
      case "funnelStage":
        // Legacy: kept for backward compatibility. Older rules stored a lead
        // STATUS value here; new rules should use `funnelPhase`. Match either so
        // existing automations keep working after the status/phase split.
        return {
          type: c.type,
          passed:
            lead.funnelPhase === String(c.value) || lead.status === String(c.value),
        };
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

  /**
   * Dispatch a single action. When `dryRun` is true (Testmodus / simulation
   * runMode) NO real mutation is performed — only the human-readable result is
   * computed, so the log shows exactly what *would* happen.
   */
  private async runAction(
    action: RuleAction,
    lead: LeadDetail,
    actor: string,
    dryRun = false,
    guard?: (c: RuleCondition) => boolean,
  ): Promise<ActionResult> {
    const tag = dryRun ? " (Testmodus)" : "";
    switch (action.type) {
      case "sendTemplateSimulation": {
        if (!action.templateId) return { type: action.type, result: "Keine Vorlage gewählt" };
        const tpl = await automationTemplateRepository.findById(action.templateId);
        if (!tpl) return { type: action.type, result: "Vorlage nicht gefunden" };
        // Opt-out guard: every WhatsApp send is checked for opt_out == false.
        // An opted-out lead is skipped and the skip is protocolled in the run log.
        if (tpl.channel === CommunicationChannel.WHATSAPP && lead.optOut) {
          return {
            type: action.type,
            result: `Übersprungen: Lead hat WhatsApp abgemeldet (Opt-out)${tag}`,
          };
        }
        const ctx = buildTemplateContext(lead, "xn--lokfhrerzentrum-2vb.de", {
          ownerName: lead.assignedTo,
        });
        const preview = renderTemplate(tpl.body, ctx).slice(0, 160);
        if (!dryRun) await automationTemplateRepository.recordUsage(tpl.id);
        return {
          type: action.type,
          result: `Simulierter ${tpl.channel}-Versand · "${tpl.name}": ${preview}`,
        };
      }
      case "createTask": {
        const title = action.taskTitle?.trim() || "Automatische Aufgabe";
        if (dryRun) return { type: action.type, result: `Aufgabe würde erstellt: ${title}${tag}` };
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
        const whenLabel = when.toLocaleString("de-DE");
        if (dryRun) return { type: action.type, result: `Follow-up würde geplant: ${whenLabel}${tag}` };
        await leadRepository.update(lead.id, { nextFollowUpAt: when });
        await auditLogRepository.append({
          actor,
          action: AuditAction.FOLLOW_UP_SCHEDULED,
          entityType: "Lead",
          entityId: lead.id,
          details: JSON.stringify({ when: when.toISOString(), viaAutomation: true }),
        });
        return { type: action.type, result: `Follow-up geplant: ${whenLabel}` };
      }
      case "changeLeadStatus": {
        const parsed = LeadStatusSchema.safeParse(action.status);
        if (!parsed.success) return { type: action.type, result: "Ungültiger Zielstatus" };
        if (dryRun) return { type: action.type, result: `Status → ${parsed.data}${tag}` };
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
        if (dryRun) return { type: action.type, result: `Bearbeiter würde zugewiesen${tag}` };
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
        if (dryRun) return { type: action.type, result: `Würde eskaliert (Priorität: heiß)${tag}` };
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
        if (dryRun) return { type: action.type, result: `Log würde erstellt: ${action.note ?? "Eintrag"}${tag}` };
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
      case "changeFunnelPhase": {
        const target = String(action.funnelPhase ?? "");
        if (!isFunnelPhase(target))
          return { type: action.type, result: "Ungültige Funnel-Phase" };
        const label = FUNNEL_PHASE_LABEL[target];
        if (dryRun) return { type: action.type, result: `Funnel-Phase → ${label}${tag}` };
        await leadRepository.update(lead.id, { funnelPhase: target });
        await auditLogRepository.append({
          actor,
          action: AuditAction.WORKFLOW_AUTOMATION,
          entityType: "Lead",
          entityId: lead.id,
          details: JSON.stringify({ funnelPhase: target, viaAutomation: true }),
        });
        return { type: action.type, result: `Funnel-Phase → ${label}` };
      }
      case "addTag":
      case "removeTag": {
        const tagValue = (action.tag ?? "").trim();
        if (!tagValue) return { type: action.type, result: "Kein Tag angegeben" };
        const verb = action.type === "addTag" ? "hinzugefügt" : "entfernt";
        if (dryRun)
          return { type: action.type, result: `Tag "${tagValue}" würde ${verb}${tag}` };
        const current = new Set(lead.tags ?? []);
        if (action.type === "addTag") current.add(tagValue);
        else current.delete(tagValue);
        await leadRepository.update(lead.id, { tags: Array.from(current) });
        return { type: action.type, result: `Tag "${tagValue}" ${verb}` };
      }
      case "changeScore": {
        const delta = Number(action.score ?? 0);
        if (!Number.isFinite(delta) || delta === 0)
          return { type: action.type, result: "Kein Score-Wert angegeben" };
        const next = Math.max(0, Math.min(100, lead.score + delta));
        if (dryRun)
          return {
            type: action.type,
            result: `Score ${lead.score} → ${next} (${delta > 0 ? "+" : ""}${delta})${tag}`,
          };
        await leadRepository.update(lead.id, { score: next });
        return {
          type: action.type,
          result: `Score ${lead.score} → ${next} (${delta > 0 ? "+" : ""}${delta})`,
        };
      }
      case "pauseAutomation": {
        if (dryRun) return { type: action.type, result: `Automationen würden pausiert${tag}` };
        await leadRepository.update(lead.id, { automationPaused: true });
        return { type: action.type, result: "Automationen pausiert" };
      }
      case "resumeAutomation": {
        if (dryRun) return { type: action.type, result: `Automationen würden fortgesetzt${tag}` };
        await leadRepository.update(lead.id, { automationPaused: false });
        return { type: action.type, result: "Automationen fortgesetzt" };
      }
      case "delay": {
        const value = Number(action.delayValue ?? 0);
        const unit = action.delayUnit ?? "hours";
        if (!Number.isFinite(value) || value <= 0)
          return { type: action.type, result: "Keine Wartezeit angegeben" };
        const factor = unit === "minutes" ? 60_000 : unit === "days" ? 86_400_000 : 3_600_000;
        const unitLabel = unit === "minutes" ? "Min." : unit === "days" ? "Tage" : "Std.";
        const when = new Date(Date.now() + value * factor);
        if (dryRun)
          return {
            type: action.type,
            result: `Warten: ${value} ${unitLabel} (bis ${when.toLocaleString("de-DE")})${tag}`,
          };
        await leadRepository.update(lead.id, { nextFollowUpAt: when });
        return {
          type: action.type,
          result: `Warten: ${value} ${unitLabel} (Wiedervorlage ${when.toLocaleString("de-DE")})`,
        };
      }
      case "branch": {
        if (!action.branchCondition)
          return { type: action.type, result: "Keine Verzweigungsbedingung" };
        const cond: RuleCondition = {
          type: action.branchCondition,
          ...(action.branchValue !== undefined ? { value: action.branchValue } : {}),
        };
        const met = guard ? guard(cond) : false;
        return {
          type: action.type,
          result: met
            ? "Verzweigung: Bedingung erfüllt → weiter"
            : "Verzweigung: Bedingung nicht erfüllt → Workflow beendet",
          stop: !met,
        };
      }
      case "addNote": {
        const body = (action.note ?? "").trim() || "Automatische Notiz";
        if (dryRun) return { type: action.type, result: `Notiz würde erstellt: ${body}${tag}` };
        await noteRepository.create({ leadId: lead.id, body, author: actor });
        await auditLogRepository.append({
          actor,
          action: AuditAction.WORKFLOW_AUTOMATION,
          entityType: "Lead",
          entityId: lead.id,
          details: JSON.stringify({ note: body, viaAutomation: true }),
        });
        return { type: action.type, result: `Notiz erstellt: ${body}` };
      }
      case "notifyInternal": {
        const msg = (action.note ?? "").trim() || "Interne Benachrichtigung";
        if (dryRun) return { type: action.type, result: `Team würde benachrichtigt: ${msg}${tag}` };
        await taskRepository.create({
          title: `🔔 ${msg}`,
          leadId: lead.id,
          assigneeId: lead.assignedToId ?? null,
          createdById: actor,
          dueAt: new Date(Date.now() + 24 * 3_600_000),
        });
        await auditLogService.append({
          actor,
          action: AuditAction.WORKFLOW_AUTOMATION,
          entityType: "Lead",
          entityId: lead.id,
          details: { internalNotification: msg, viaAutomation: true },
        });
        return { type: action.type, result: `Team benachrichtigt: ${msg}` };
      }
      case "endWorkflow": {
        return {
          type: action.type,
          result: `Workflow beendet${tag}`,
          stop: true,
        };
      }
      default:
        return { type: action.type, result: "unbekannte Aktion" };
    }
  }
}

export const automationRuleEngine = new AutomationRuleEngine();
