/**
 * LeadService - orchestrates lead creation and exposes detail/list queries.
 *
 * Lead creation is atomic: lead row, sensitive answers, eligibility answers,
 * consent records, initial status history and audit log are written in a
 * single Prisma transaction.
 */
import { FunnelPhase } from "@/features/fairtrain-funnel/funnelPhase";
import { computeScore } from "@/features/fairtrain-funnel/scoring/scoring";
import {
  AuditAction,
  type ConsentInput,
  type ConsentType,
  type EmploymentStatus,
  type FunnelPath,
  type LeadFilters,
  type LeadFullDetail,
  type LeadKpis,
  LeadPriority,
  LeadStatus,
  type LeadSummary,
  type NoteEntry,
  type PreferredLocation,
  type SensitiveAnswersData,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { NotFoundError } from "../errors";
import { auditLogRepository } from "../repositories/AuditLogRepository";
import { automationLogRepository } from "../repositories/AutomationLogRepository";
import { callLogRepository } from "../repositories/CallLogRepository";
import { communicationRepository } from "../repositories/CommunicationRepository";
import { documentRepository } from "../repositories/DocumentRepository";
import { eligibilityAnswerRepository } from "../repositories/EligibilityAnswerRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { noteRepository } from "../repositories/NoteRepository";
import { portalDocumentRepository } from "../repositories/PortalDocumentRepository";
import { portalLinkRepository } from "../repositories/PortalLinkRepository";
import { sensitiveAnswersRepository } from "../repositories/SensitiveAnswersRepository";
import { statusHistoryRepository } from "../repositories/StatusHistoryRepository";
import { uploadedFileRepository } from "../repositories/UploadedFileRepository";
import { auditLogService } from "./AuditLogService";
import { automationRuleEngine } from "./AutomationRuleEngine";
import { automationService } from "./AutomationService";
import { REACTIVATION_CAMPAIGN_KEY } from "@/features/fairtrain-funnel/campaign/types";

import { campaignStopService } from "./CampaignStopService";
import { leadLifecycleService } from "./LeadLifecycleService";
import { consentService, type ConsentContext } from "./ConsentService";
import { fileUploadService } from "./FileUploadService";
import { leadImportService } from "./LeadImportService";

// Re-export ConsentInput here for the action layer (avoids cross-feature pulls).
export type { ConsentInput } from "@/features/fairtrain-funnel/types";

export interface SubmitLeadInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string | null;
  funnelPath: FunnelPath;
  employmentStatus: EmploymentStatus;
  preferredLocation: PreferredLocation;
  acceptsShiftWork: boolean;
  motivationText: string | null;
  isInterestedInProgram: boolean;
  source: string | null;
  utm: string | null;
  sensitive: SensitiveAnswersData;
  eligibilityAnswers: Array<{
    questionId: string;
    answer: string;
    score: number;
  }>;
  consents: ReadonlyArray<{ type: ConsentType; granted: boolean }>;
  uploadedFileIds: ReadonlyArray<string>;
  /**
   * True only for a CRM operator manually adding a contact (e.g. a phone
   * lead) via `createCrmLead` — they never went through the public
   * Eignungscheck. Defaults to false: the public wizard submission genuinely
   * DID just complete the funnel, so it gets the honest FUNNEL_COMPLETED
   * status + funnel phase instead of an instant QUALIFIED/HOT triage.
   */
  isManualCrmEntry?: boolean;

  // extended person data (all optional in MVP - the K.O. step alone can submit)
  birthDate?: Date | null;
  birthPlace?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  addressCity?: string | null;
  nationality?: string | null;

  // agency data
  agencyCity?: string | null;
  agencyCustomerNumber?: string | null;
  agencyCaseWorker?: string | null;

  // CV / live-interview
  unemployedSince?: string | null;
  careerHistory?: string | null;
  schoolEducation?: string | null;
  graduationYear?: string | null;
  languages?: string | null;
  computerSkills?: string | null;
  interests?: string | null;

  // K.O. snapshot
  acceptsTravelHotel?: boolean | null;
  acceptsPsychLoad?: boolean | null;
  hasNoKbaDrugEntries?: boolean | null;
}

export interface SubmitLeadResult {
  leadId: string;
  priority: LeadPriority;
  status: LeadStatus;
  score: number;
  blockedReasons: ReadonlyArray<string>;
}

export type { LeadFullDetail };

function isComplete(input: SubmitLeadInput): boolean {
  return Boolean(
    input.firstName.trim() &&
      input.lastName.trim() &&
      input.email.trim() &&
      input.phone.trim() &&
      input.city &&
      input.city.trim(),
  );
}

export class LeadService {
  async submit(
    input: SubmitLeadInput,
    ctx: ConsentContext,
  ): Promise<SubmitLeadResult> {
    const scoring = computeScore({
      funnelPath: input.funnelPath,
      preferredLocation: input.preferredLocation,
      acceptsShiftWork: input.acceptsShiftWork,
      hasMpuIssue: input.sensitive.hasMpuIssue,
      hasDrugIssue: input.sensitive.hasDrugIssue,
      motivationText: input.motivationText,
      isInterestedInProgram: input.isInterestedInProgram,
      isProfileComplete: isComplete(input),
      acceptsTravelHotel: input.acceptsTravelHotel ?? undefined,
      acceptsPsychLoad: input.acceptsPsychLoad ?? undefined,
      hasNoKbaDrugEntries: input.hasNoKbaDrugEntries ?? undefined,
    });

    const isManualCrmEntry = input.isManualCrmEntry === true;

    // Single source of truth for the initial pipeline position: a public
    // Eignungscheck submission is, factually, "the funnel just got completed"
    // — never an instant QUALIFIED/HOT triage. Blocked (hard K.O. exclusion)
    // is the one legitimate immediate outcome and stays unchanged. This is
    // what makes the lead show up in the Dashboard's "Neue Funnel-Leads" card
    // right away instead of only under Leads. A manually added CRM contact
    // never went through the funnel, so it starts at NEW as before.
    const initialStatus: LeadStatus =
      scoring.priority === LeadPriority.BLOCKED
        ? LeadStatus.BLOCKED
        : isManualCrmEntry
          ? LeadStatus.NEW
          : LeadStatus.FUNNEL_COMPLETED;

    // HOT priority is a "handle this NOW" signal — it must only ever be true
    // once the applicant is actually reachable AND serious, i.e. the funnel is
    // done AND they already attached documents. A bare score >= 80 alone is
    // NOT enough at the moment of submission (nobody has uploaded anything
    // yet in the common case). If files were attached in this very
    // submission, the condition is already satisfied and HOT applies right
    // away; otherwise we cap to WARM and let `PortalService` promote to HOT
    // the moment real documents come in.
    const hasDocsAtSubmission = input.uploadedFileIds.length > 0;
    const initialPriority: LeadPriority =
      scoring.priority === LeadPriority.HOT && !hasDocsAtSubmission
        ? LeadPriority.WARM
        : scoring.priority;

    const leadId = await prisma.$transaction(async (tx) => {
      const lead = await leadRepository.create(
        {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          city: input.city,
          funnelPath: input.funnelPath,
          employmentStatus: input.employmentStatus,
          preferredLocation: input.preferredLocation,
          acceptsShiftWork: input.acceptsShiftWork,
          motivationText: input.motivationText,
          score: scoring.score,
          priority: initialPriority,
          status: initialStatus,
          // Process step (separate from `status`): they just finished the
          // Eignungscheck, full stop — even a blocked lead did complete it.
          // A manual CRM entry has no funnel phase yet (stays "none").
          ...(isManualCrmEntry
            ? {}
            : { funnelPhase: FunnelPhase.ELIGIBILITY_COMPLETED }),
          source: input.source,
          utm: input.utm,
          assignedTo: null,
          birthDate: input.birthDate ?? null,
          birthPlace: input.birthPlace ?? null,
          street: input.street ?? null,
          houseNumber: input.houseNumber ?? null,
          postalCode: input.postalCode ?? null,
          addressCity: input.addressCity ?? null,
          nationality: input.nationality ?? null,
          agencyCity: input.agencyCity ?? null,
          agencyCustomerNumber: input.agencyCustomerNumber ?? null,
          agencyCaseWorker: input.agencyCaseWorker ?? null,
          unemployedSince: input.unemployedSince ?? null,
          careerHistory: input.careerHistory ?? null,
          schoolEducation: input.schoolEducation ?? null,
          graduationYear: input.graduationYear ?? null,
          languages: input.languages ?? null,
          computerSkills: input.computerSkills ?? null,
          interests: input.interests ?? null,
          acceptsTravelHotel: input.acceptsTravelHotel ?? null,
          acceptsPsychLoad: input.acceptsPsychLoad ?? null,
          hasNoKbaDrugEntries: input.hasNoKbaDrugEntries ?? null,
        },
        tx,
      );

      await sensitiveAnswersRepository.create(
        {
          leadId: lead.id,
          hasMpuIssue: input.sensitive.hasMpuIssue,
          hasDrugIssue: input.sensitive.hasDrugIssue,
          notesSensitive: input.sensitive.notesSensitive,
        },
        tx,
      );

      if (input.eligibilityAnswers.length > 0) {
        await eligibilityAnswerRepository.createMany(
          { leadId: lead.id, answers: [...input.eligibilityAnswers] },
          tx,
        );
      }

      await consentService.appendBatch(
        lead.id,
        input.consents as ReadonlyArray<ConsentInput>,
        ctx,
        tx,
      );

      if (input.uploadedFileIds.length > 0) {
        await fileUploadService.attachFilesToLead(
          input.uploadedFileIds,
          lead.id,
          tx,
        );
      }

      await statusHistoryRepository.append(
        {
          leadId: lead.id,
          fromStatus: null,
          toStatus: initialStatus,
          changedBy: "self",
          reason: "initial submission",
        },
        tx,
      );

      await auditLogRepository.append(
        {
          actor: "self",
          action: AuditAction.LEAD_CREATED,
          entityType: "Lead",
          entityId: lead.id,
          details: JSON.stringify({
            score: scoring.score,
            priority: initialPriority,
            computedPriority: scoring.priority,
            blockedReasons: scoring.blockedReasons,
            source: input.source,
          }),
        },
        tx,
      );

      return lead.id;
    });

    // Post-commit automation — must not block or fail the public submit path.
    try {
      await automationService.onLeadCreated(leadId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[automation] lead.created failed", { leadId, err });
    }

    // Event-driven workflow rules bound to "Lead erstellt". Best-effort.
    try {
      await automationRuleEngine.runForTrigger("LEAD_CREATED", leadId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[automation] rule LEAD_CREATED failed", { leadId, err });
    }

    // Note: the "Funnel abgeschlossen" trigger + funnel-phase update for the
    // PUBLIC wizard path is fired once, at the call site (`submitLead.ts`),
    // after this transaction commits — never duplicated here, so the
    // Automation-Builder trigger and any workflow it starts fire exactly once
    // per submission.

    // Reactivation: if this wizard submission matches an active Alt-Lead
    // (same phone/email), they completed the Eignungscheck → stop that
    // campaign. Best-effort; never blocks the public submit.
    try {
      const match = await leadRepository.findActiveCampaignLeadByContact(
        REACTIVATION_CAMPAIGN_KEY,
        input.phone,
        input.email,
        leadId,
      );
      if (match) {
        await campaignStopService.stop(
          match.id,
          "eignungscheck_completed",
          "qualifiziert",
        );
        // Single source of truth: the matched lead completed the Eignungscheck.
        await leadLifecycleService.record(match.id, "FUNNEL_COMPLETED", {
          actor: "self",
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[campaign] eignungscheck-complete stop failed", { leadId, err });
    }

    return {
      leadId,
      priority: initialPriority,
      status: initialStatus,
      score: scoring.score,
      blockedReasons: scoring.blockedReasons,
    };
  }

  /**
   * Bulk-import Alt-Leads from an Excel/CSV buffer. Creates leads with the
   * reactivation defaults and deliberately does NOT call
   * `automationService.onLeadCreated` — no message is sent on import.
   */
  async importAltLeads(
    buffer: Buffer,
    filename: string,
    actor: string,
  ): Promise<import("./LeadImportService").ImportCommitResult> {
    const result = await leadImportService.commit(buffer, filename, actor);
    await auditLogService.append({
      actor,
      action: AuditAction.LEAD_CREATED,
      entityType: "LeadImportBatch",
      entityId: result.batchId,
      details: { filename, ...result.counters },
    });
    return result;
  }

  async list(
    filters: LeadFilters,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<LeadSummary[]> {
    return leadRepository.list(filters, opts);
  }

  async kpis(): Promise<LeadKpis> {
    return leadRepository.aggregateKpis();
  }

  async getFullDetail(leadId: string): Promise<LeadFullDetail> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);

    const [
      statusHistory,
      notes,
      documents,
      uploadedFiles,
      communications,
      eligibilityAnswers,
      consents,
      automationLogs,
      callLogs,
      auditLog,
      portalLink,
      portalDocuments,
    ] = await Promise.all([
      statusHistoryRepository.list(leadId),
      noteRepository.list(leadId),
      documentRepository.list(leadId),
      uploadedFileRepository.listByLead(leadId),
      communicationRepository.list(leadId),
      eligibilityAnswerRepository.listForLead(leadId),
      consentService.currentStates(leadId),
      automationLogRepository.listForLead(leadId),
      callLogRepository.listForLead(leadId),
      auditLogRepository.listForEntity("Lead", leadId),
      portalLinkRepository.findLatestForLead(leadId),
      portalDocumentRepository.list(leadId),
    ]);

    return {
      lead,
      statusHistory,
      notes,
      documents,
      uploadedFiles,
      communications,
      eligibilityAnswers,
      consents,
      automationLogs,
      callLogs,
      auditLog,
      portalLink,
      portalDocuments,
    };
  }

  /**
   * Reveal sensitive answers WITH audit. Caller must pass the admin actor.
   */
  async revealSensitive(
    leadId: string,
    actor: string,
  ): Promise<SensitiveAnswersData | null> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);
    const data = await sensitiveAnswersRepository.getForLead(leadId);
    await auditLogService.append({
      actor,
      action: AuditAction.SENSITIVE_REVEAL,
      entityType: "Lead",
      entityId: leadId,
      details: { revealed: Boolean(data) },
    });
    return data;
  }

  async addNote(
    leadId: string,
    body: string,
    actor: string,
  ): Promise<NoteEntry> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);
    const note = await noteRepository.create({
      leadId,
      body,
      author: actor,
    });
    await auditLogService.append({
      actor,
      action: AuditAction.NOTE_ADDED,
      entityType: "Lead",
      entityId: leadId,
      details: { noteId: note.id },
    });
    return note;
  }

  async scheduleFollowUp(
    leadId: string,
    when: Date | null,
    actor: string,
  ): Promise<void> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);
    await leadRepository.update(leadId, { nextFollowUpAt: when });
    await auditLogService.append({
      actor,
      action: AuditAction.FOLLOW_UP_SCHEDULED,
      entityType: "Lead",
      entityId: leadId,
      details: { when: when?.toISOString() ?? null },
    });
  }

  /**
   * Permanently delete a lead and everything attached to it. Physical uploaded
   * files are purged from storage first, then the DB rows cascade away. The
   * append-only audit entry is the only trace that remains.
   */
  async delete(leadId: string, actor: string): Promise<void> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);

    const files = await uploadedFileRepository.listByLead(leadId);
    for (const file of files) {
      await fileUploadService.deleteFile(file.id, actor);
    }

    await leadRepository.hardDelete(leadId);
    await auditLogService.append({
      actor,
      action: AuditAction.LEAD_DELETED,
      entityType: "Lead",
      entityId: leadId,
      details: { email: lead.email },
    });
  }
}

export const leadService = new LeadService();
