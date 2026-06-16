/**
 * LeadWorkflowEngine — automatic side-effects of a status transition.
 *
 * The brief mandates that a single drag-&-drop or button click in the
 * pipeline cascades into:
 *   • Follow-up neu setzen
 *   • Aufgabe automatisch erzeugen
 *   • Timeline-Eintrag (existing via StatusHistory)
 *   • Dashboard-Aktualisierung (via revalidatePath in the caller)
 *   • Dokumenten-/Gutscheinstatus aktualisieren wo passend
 *
 * Side-effects live in their own service so the StatusMachineService stays
 * focused on transition validity + persistence. Everything here is best-
 * effort and gracefully degrades — a failing side-effect must never roll
 * back the user-visible status change.
 *
 * Each rule is deterministic, derived from the targeted status and the
 * existing lead state. No external dependencies.
 */
import { LeadStatus, AuditAction } from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { auditLogRepository } from "../repositories/AuditLogRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { taskRepository } from "../repositories/TaskRepository";

interface SideEffectInput {
  leadId: string;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  /** ID of the user that initiated the transition (audit author). */
  actor: string;
}

interface FollowUpRule {
  /** Hours from now until the follow-up. */
  delayHours: number;
  reason: string;
}

interface TaskRule {
  title: string;
  description: string;
  /** Days from now until task is due. */
  dueDays: number;
  priority: "URGENT" | "HIGH" | "NORMAL" | "LOW";
}

/**
 * Per-target-status rules. A status that's not listed in this table won't
 * trigger any automatic Task / Follow-up — the engine just records audit.
 */
const FOLLOWUP_RULES: Partial<Record<LeadStatus, FollowUpRule>> = {
  [LeadStatus.CONTACT_PENDING]: {
    delayHours: 48,
    reason: "Erneut anrufen (nicht erreicht)",
  },
  [LeadStatus.CALL_SCHEDULED]: {
    delayHours: 24,
    reason: "Geplanten Rückruf durchführen",
  },
  [LeadStatus.BRIEFING_SENT]: {
    delayHours: 48,
    reason: "Briefing nachverfolgen",
  },
  [LeadStatus.DOC_PENDING]: {
    delayHours: 72,
    reason: "Unterlagen nachhalten",
  },
  [LeadStatus.AA_APPOINTMENT_PENDING]: {
    delayHours: 24,
    reason: "Agenturtermin nachbereiten",
  },
  [LeadStatus.GUTSCHEIN_PENDING]: {
    delayHours: 120,
    reason: "Gutschein-Status bei Agentur prüfen",
  },
  [LeadStatus.GUTSCHEIN_APPROVED]: {
    delayHours: 24,
    reason: "Anmeldung einleiten",
  },
  [LeadStatus.QUALIFIED]: {
    delayHours: 24,
    reason: "Qualifizierten Lead in die nächste Phase überführen",
  },
  [LeadStatus.HOT]: {
    delayHours: 4,
    reason: "Heiße Spur — sofort weiterführen",
  },
};

const TASK_RULES: Partial<Record<LeadStatus, TaskRule>> = {
  [LeadStatus.CONTACT_PENDING]: {
    title: "Erneut anrufen",
    description: "Erstkontakt fehlgeschlagen — Wiederholung in 48h.",
    dueDays: 2,
    priority: "HIGH",
  },
  [LeadStatus.DOC_PENDING]: {
    title: "Unterlagen anfordern und nachhalten",
    description: "Lebenslauf, Ausweis und Zeugnisse vom Bewerber einholen.",
    dueDays: 3,
    priority: "HIGH",
  },
  [LeadStatus.AA_APPOINTMENT_PENDING]: {
    title: "Agenturtermin vereinbaren",
    description: "AA-Termin mit Sachbearbeiter koordinieren.",
    dueDays: 5,
    priority: "URGENT",
  },
  [LeadStatus.GUTSCHEIN_PENDING]: {
    title: "Gutschein-Antrag bei AA prüfen",
    description: "Bewilligungs-Status bei der Agentur abfragen.",
    dueDays: 5,
    priority: "NORMAL",
  },
  [LeadStatus.GUTSCHEIN_APPROVED]: {
    title: "Anmeldung einleiten",
    description: "Förderung gesichert — Einschreibung & Vertrag abschließen.",
    dueDays: 2,
    priority: "URGENT",
  },
  [LeadStatus.ENROLLED]: {
    title: "Startunterlagen vorbereiten",
    description: "Onboarding-Pack und Startdatum mit Bewerber abstimmen.",
    dueDays: 4,
    priority: "NORMAL",
  },
};

function plusHours(h: number): Date {
  return new Date(Date.now() + h * 3_600_000);
}

function plusDays(d: number): Date {
  return new Date(Date.now() + d * 86_400_000);
}

export class LeadWorkflowEngine {
  /**
   * Apply automatic follow-ups, tasks and audit entries that should fire
   * when a lead transitions to `toStatus`. The lead's status itself has
   * already been persisted by the caller; this layer only adds adjacent
   * artefacts. Failures are logged and swallowed.
   */
  async apply(input: SideEffectInput): Promise<void> {
    const lead = await leadRepository.findById(input.leadId);
    if (!lead) return;

    // 1) Follow-up date — only set if the lead has none yet, or the existing
    //    one is in the past. Never blow away a future follow-up that an
    //    operator deliberately picked.
    const followUpRule = FOLLOWUP_RULES[input.toStatus];
    if (followUpRule) {
      const cur = lead.nextFollowUpAt;
      const isPast = cur ? cur.getTime() < Date.now() : true;
      if (!cur || isPast) {
        try {
          const newDate = plusHours(followUpRule.delayHours);
          await leadRepository.update(input.leadId, {
            nextFollowUpAt: newDate,
          });
          await auditLogRepository.append({
            actor: input.actor,
            action: AuditAction.FOLLOW_UP_SCHEDULED,
            entityType: "Lead",
            entityId: input.leadId,
            details: JSON.stringify({
              reason: followUpRule.reason,
              dueAt: newDate.toISOString(),
              triggeredByStatus: input.toStatus,
            }),
          });
        } catch (err) {
          await this.logFailure("followup", input, err);
        }
      }
    }

    // 2) Auto-Task — only create if no open task with the same auto-marker
    //    already exists. This keeps the engine idempotent across repeated
    //    drag-drops back and forth.
    const taskRule = TASK_RULES[input.toStatus];
    if (taskRule) {
      try {
        const existing = await prisma.task.findFirst({
          where: {
            leadId: input.leadId,
            title: taskRule.title,
            status: { not: "DONE" },
          },
        });
        if (!existing) {
          await taskRepository.create({
            title: taskRule.title,
            description: `${taskRule.description}\n\nAutomatisch durch Statuswechsel "${input.toStatus}" angelegt.`,
            priority: taskRule.priority,
            leadId: input.leadId,
            assigneeId: lead.assignedToId ?? null,
            dueAt: plusDays(taskRule.dueDays),
            createdById: input.actor,
          });
        }
      } catch (err) {
        await this.logFailure("task", input, err);
      }
    }

    // 3) Document scaffolding — when moving into DOC_PENDING, make sure the
    //    canonical four document slots exist. Don't recreate anything that's
    //    already there.
    if (input.toStatus === LeadStatus.DOC_PENDING) {
      await this.ensureDocumentSlots(input.leadId, input.actor);
    }
  }

  /**
   * Make sure the standard set of operative document slots exists when
   * documents become operative.  Uses the existing `Document` table which
   * already tracks {kind, status}.
   */
  private async ensureDocumentSlots(
    leadId: string,
    actor: string,
  ): Promise<void> {
    const REQUIRED_TYPES = ["LEBENSLAUF", "AUSWEIS", "ZEUGNIS", "GUTSCHEIN"];
    try {
      const existing = await prisma.document.findMany({
        where: { leadId },
        select: { type: true },
      });
      const have = new Set(existing.map((d) => d.type));
      for (const type of REQUIRED_TYPES) {
        if (have.has(type)) continue;
        try {
          await prisma.document.create({
            data: {
              leadId,
              type,
              status: "MISSING_DATA",
            },
          });
        } catch {
          /* unique constraint or schema mismatch — skip silently */
        }
      }
      await auditLogRepository.append({
        actor,
        action: AuditAction.DOCUMENT_REQUESTED,
        entityType: "Lead",
        entityId: leadId,
        details: "Unterlagen-Slots automatisch angelegt (Workflow Engine)",
      });
    } catch (err) {
      await this.logFailure("documents", { leadId, actor } as never, err);
    }
  }

  private async logFailure(
    kind: string,
    input: { leadId: string; actor: string },
    err: unknown,
  ): Promise<void> {
    try {
      await auditLogRepository.append({
        actor: input.actor,
        action: AuditAction.WORKFLOW_AUTOMATION,
        entityType: "Lead",
        entityId: input.leadId,
        details: `Workflow-Side-Effect "${kind}" fehlgeschlagen: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    } catch {
      /* nothing else we can do */
    }
  }
}

export const leadWorkflowEngine = new LeadWorkflowEngine();
