"use server";
/**
 * CRM lead-management actions — operator-driven create/edit/quick-actions.
 *
 * These complement the public `submitLead` (funnel) and the existing
 * status/assign/follow-up actions. Every mutation persists through the
 * repository/service layer and writes an audit (ActivityLog) entry.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AuditAction,
  EmploymentStatusSchema,
  FunnelPathSchema,
  LeadPrioritySchema,
  PreferredLocationSchema,
} from "@/features/fairtrain-funnel/types";

import { NotFoundError, ValidationError } from "../errors";
import { leadRepository } from "../repositories/LeadRepository";
import { userRepository } from "../repositories/UserRepository";
import { auditLogService } from "../services/AuditLogService";
import { leadService } from "../services/LeadService";
import {
  getRequestContext,
  requirePermission,
  runAction,
  type Result,
} from "./_helpers";

function revalidateCrm(leadId?: string) {
  if (leadId) revalidatePath(`/crm/leads/${leadId}`);
  revalidatePath("/crm/leads");
  revalidatePath("/crm/pipeline");
  revalidatePath("/crm");
  revalidatePath("/crm/sales/followups");
  revalidatePath("/crm/bildungsgutschein");
  revalidatePath("/crm/agenturtermine");
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

const CreateSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(3).max(40),
  city: z.string().trim().max(80).optional().nullable(),
  funnelPath: FunnelPathSchema.default("UNEMPLOYED"),
  employmentStatus: EmploymentStatusSchema.default("UNEMPLOYED"),
  preferredLocation: PreferredLocationSchema.default("UNDECIDED"),
  acceptsShiftWork: z.boolean().default(true),
  motivationText: z.string().trim().max(2000).optional().nullable(),
  source: z.string().trim().max(80).optional().nullable(),
  assignedToId: z.string().min(1).optional().nullable(),
});

export async function createCrmLead(
  raw: unknown,
): Promise<Result<{ leadId: string }>> {
  return runAction(async () => {
    const actor = await requirePermission("canManageLeads");
    const parsed = CreateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Lead-Daten", {
        issues: parsed.error.issues,
      });
    }
    const d = parsed.data;
    const ctx = await getRequestContext();

    // Reuse the canonical creation pipeline (scoring, status history,
    // LEAD_CREATED audit, automation hooks) for consistency with funnel leads.
    const result = await leadService.submit(
      {
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        phone: d.phone,
        city: d.city ?? null,
        funnelPath: d.funnelPath,
        employmentStatus: d.employmentStatus,
        preferredLocation: d.preferredLocation,
        acceptsShiftWork: d.acceptsShiftWork,
        motivationText: d.motivationText ?? null,
        isInterestedInProgram: true,
        source: d.source ?? "crm-manual",
        utm: null,
        sensitive: {
          hasMpuIssue: false,
          hasDrugIssue: false,
          notesSensitive: null,
        },
        eligibilityAnswers: [],
        consents: [],
        uploadedFileIds: [],
        isManualCrmEntry: true,
      },
      ctx,
    );

    if (d.assignedToId) {
      const target = await userRepository.findRefById(d.assignedToId);
      if (target) {
        await leadRepository.update(result.leadId, {
          assignedToId: d.assignedToId,
          assignedTo: target.name,
          assignedById: actor.id,
          assignedAt: new Date(),
        });
        await auditLogService.append({
          actor: actor.id,
          action: AuditAction.LEAD_ASSIGNED,
          entityType: "Lead",
          entityId: result.leadId,
          details: { to: d.assignedToId, via: "create" },
        });
      }
    }

    revalidateCrm(result.leadId);
    return { leadId: result.leadId };
  });
}

// ---------------------------------------------------------------------------
// Edit core fields
// ---------------------------------------------------------------------------

const UpdateSchema = z.object({
  leadId: z.string().min(1),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  phone: z.string().trim().min(3).max(40),
  city: z.string().trim().max(80).optional().nullable(),
  source: z.string().trim().max(80).optional().nullable(),
});

export async function updateLeadCore(
  raw: unknown,
): Promise<Result<{ leadId: string }>> {
  return runAction(async () => {
    const actor = await requirePermission("canManageLeads");
    const parsed = UpdateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Lead-Daten", {
        issues: parsed.error.issues,
      });
    }
    const d = parsed.data;
    const lead = await leadRepository.findById(d.leadId);
    if (!lead) throw new NotFoundError("Lead", d.leadId);

    await leadRepository.update(d.leadId, {
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      city: d.city ?? null,
      source: d.source ?? null,
    });

    await auditLogService.append({
      actor: actor.id,
      action: AuditAction.LEAD_UPDATED,
      entityType: "Lead",
      entityId: d.leadId,
      details: { fields: ["firstName", "lastName", "email", "phone", "city", "source"] },
    });

    revalidateCrm(d.leadId);
    return { leadId: d.leadId };
  });
}

// ---------------------------------------------------------------------------
// Quick action: priority
// ---------------------------------------------------------------------------

const PrioritySchema = z.object({
  leadId: z.string().min(1),
  priority: LeadPrioritySchema,
});

export async function setLeadPriority(
  raw: unknown,
): Promise<Result<{ leadId: string }>> {
  return runAction(async () => {
    const actor = await requirePermission("canManageLeads");
    const parsed = PrioritySchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Priorität", {
        issues: parsed.error.issues,
      });
    }
    const lead = await leadRepository.findById(parsed.data.leadId);
    if (!lead) throw new NotFoundError("Lead", parsed.data.leadId);

    await leadRepository.update(parsed.data.leadId, {
      priority: parsed.data.priority,
    });
    await auditLogService.append({
      actor: actor.id,
      action: AuditAction.LEAD_UPDATED,
      entityType: "Lead",
      entityId: parsed.data.leadId,
      details: { priority: parsed.data.priority },
    });

    revalidateCrm(parsed.data.leadId);
    return { leadId: parsed.data.leadId };
  });
}

// ---------------------------------------------------------------------------
// Quick action: archive (soft delete — reversible, non-destructive)
// ---------------------------------------------------------------------------

const ArchiveSchema = z.object({
  leadId: z.string().min(1),
  archived: z.boolean().default(true),
});

export async function archiveLead(
  raw: unknown,
): Promise<Result<{ leadId: string }>> {
  return runAction(async () => {
    const actor = await requirePermission("canManageLeads");
    const parsed = ArchiveSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Anfrage", {
        issues: parsed.error.issues,
      });
    }

    await leadRepository.update(parsed.data.leadId, {
      deletedAt: parsed.data.archived ? new Date() : null,
    });
    await auditLogService.append({
      actor: actor.id,
      action: AuditAction.LEAD_UPDATED,
      entityType: "Lead",
      entityId: parsed.data.leadId,
      details: { archived: parsed.data.archived },
    });

    revalidateCrm(parsed.data.leadId);
    return { leadId: parsed.data.leadId };
  });
}
