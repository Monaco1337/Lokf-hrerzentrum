"use server";
/**
 * CRM Server Actions for lead automation templates and sends.
 */
import { z } from "zod";

import {
  CommunicationChannel,
  ConsentTypeSchema,
  MetaApprovalStatusSchema,
  TemplateCategorySchema,
  TemplateStatusSchema,
} from "@/features/fairtrain-funnel/types";
import { revalidatePath } from "next/cache";

import { NotFoundError, ValidationError } from "../errors";
import { automationTemplateRepository } from "../repositories/AutomationTemplateRepository";
import { automationService } from "../services/AutomationService";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { requirePermission, runAction, type Result } from "./_helpers";

/**
 * Meta WhatsApp template names may only contain lowercase letters, digits and
 * underscores. A stray capital (e.g. "Willkommens_nachricht") makes Meta reject
 * the send with (#132001). Normalise to the exact wire form Meta expects.
 */
function normalizeMetaTemplateName(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

const UpdateTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  subject: z.string().max(200).nullable().optional(),
  body: z.string().min(1).max(10000).optional(),
  category: TemplateCategorySchema.optional(),
  status: TemplateStatusSchema.optional(),
  requiresConsent: ConsentTypeSchema.nullable().optional(),
  metaTemplateName: z.string().max(120).nullable().optional(),
  metaApprovalStatus: MetaApprovalStatusSchema.nullable().optional(),
  senderPhoneNumberId: z.string().max(200).nullable().optional(),
  metaBodyParams: z.array(z.string().max(500)).max(20).optional(),
  language: z.string().min(2).max(10).optional(),
});

const PreviewTemplateSchema = z.object({
  templateId: z.string().min(1),
  leadId: z.string().min(1).optional(),
});

const TestSendSchema = z.object({
  templateId: z.string().min(1),
  recipient: z.string().min(3).max(200),
});

const ResendSchema = z.object({
  leadId: z.string().min(1),
  templateId: z.string().min(1),
});

export async function updateAutomationTemplate(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = UpdateTemplateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid template payload");
    }
    const actor = await requirePermission("canManageAutomations");
    const { id, ...rest } = parsed.data;
    const patch: {
      name?: string;
      subject?: string | null;
      body?: string;
      category?: import("@/features/fairtrain-funnel/types").TemplateCategoryType;
      status?: import("@/features/fairtrain-funnel/types").TemplateStatusType;
      requiresConsent?: import("@/features/fairtrain-funnel/types").ConsentType | null;
      metaTemplateName?: string | null;
      metaApprovalStatus?:
        | import("@/features/fairtrain-funnel/types").MetaApprovalStatusType
        | null;
      senderPhoneNumberId?: string | null;
      metaBodyParams?: string[];
      language?: string;
    } = {};
    if (rest.metaBodyParams !== undefined) patch.metaBodyParams = rest.metaBodyParams;
    if (rest.language !== undefined) patch.language = rest.language;
    if (rest.name !== undefined) patch.name = rest.name;
    if (rest.subject !== undefined) patch.subject = rest.subject;
    if (rest.body !== undefined) patch.body = rest.body;
    if (rest.category !== undefined) patch.category = rest.category;
    if (rest.status !== undefined) patch.status = rest.status;
    if (rest.requiresConsent !== undefined) patch.requiresConsent = rest.requiresConsent;
    if (rest.metaTemplateName !== undefined)
      patch.metaTemplateName = normalizeMetaTemplateName(rest.metaTemplateName);
    if (rest.metaApprovalStatus !== undefined)
      patch.metaApprovalStatus = rest.metaApprovalStatus;
    if (rest.senderPhoneNumberId !== undefined) {
      const sender = rest.senderPhoneNumberId?.trim() || null;
      // WhatsApp templates must keep a sender ("Senden über"). Block clearing it.
      const existing = await automationTemplateRepository.findById(id);
      if (existing?.channel === "WHATSAPP" && !sender) {
        throw new ValidationError(
          'Bitte unter „Senden über" eine WhatsApp-Nummer auswählen.',
        );
      }
      patch.senderPhoneNumberId = sender;
    }
    const updated = await automationService.updateTemplate(id, patch, actor.id);
    revalidatePath("/crm/automation");
    return { id: updated.id };
  });
}

const CreateTemplateSchema = z.object({
  name: z.string().min(1).max(120),
  channel: z.enum(["WHATSAPP", "EMAIL", "INTERNAL"]),
  category: TemplateCategorySchema,
  status: TemplateStatusSchema.default("draft"),
  subject: z.string().max(200).nullable().optional(),
  body: z.string().min(1).max(10000),
  requiresConsent: ConsentTypeSchema.nullable().optional(),
  metaTemplateName: z.string().max(120).nullable().optional(),
  metaApprovalStatus: MetaApprovalStatusSchema.nullable().optional(),
  senderPhoneNumberId: z.string().max(200).nullable().optional(),
  metaBodyParams: z.array(z.string().max(500)).max(20).optional(),
  language: z.string().min(2).max(10).optional(),
});

export async function createAutomationTemplate(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = CreateTemplateSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Invalid template payload");
    const actor = await requirePermission("canManageAutomations");
    const d = parsed.data;
    const sender = d.senderPhoneNumberId?.trim() || null;
    // WhatsApp templates require an explicit sender number ("Senden über").
    if (d.channel === "WHATSAPP" && !sender) {
      throw new ValidationError(
        'Bitte unter „Senden über" eine WhatsApp-Nummer auswählen.',
      );
    }
    const created = await automationService.createTemplate(
      {
        name: d.name,
        channel: d.channel,
        category: d.category,
        status: d.status,
        language: d.language ?? "de",
        subject: d.subject ?? null,
        body: d.body,
        requiresConsent: d.requiresConsent ?? null,
        metaTemplateName: normalizeMetaTemplateName(d.metaTemplateName ?? null),
        metaApprovalStatus: d.metaApprovalStatus ?? null,
        senderPhoneNumberId: sender,
        metaBodyParams: d.channel === "WHATSAPP" ? (d.metaBodyParams ?? []) : [],
      },
      actor.id,
    );
    revalidatePath("/crm/automation");
    return { id: created.id };
  });
}

const TemplateIdSchema = z.object({ id: z.string().min(1) });

export async function duplicateAutomationTemplate(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = TemplateIdSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Invalid payload");
    const actor = await requirePermission("canManageAutomations");
    const created = await automationService.duplicateTemplate(parsed.data.id, actor.id);
    revalidatePath("/crm/automation");
    return { id: created.id };
  });
}

export async function deleteAutomationTemplate(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = TemplateIdSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Invalid payload");
    const actor = await requirePermission("canManageAutomations");
    await automationService.deleteTemplate(parsed.data.id, actor.id);
    revalidatePath("/crm/automation");
    return { id: parsed.data.id };
  });
}

export async function previewAutomationTemplate(
  raw: unknown,
): Promise<
  Result<{ subject: string | null; body: string; html: string | null }>
> {
  return runAction(async () => {
    const parsed = PreviewTemplateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid preview payload");
    }
    return automationService.previewTemplate(
      parsed.data.templateId,
      parsed.data.leadId,
    );
  });
}

export async function sendAutomationTest(
  raw: unknown,
): Promise<Result<{ logId: string; status: string }>> {
  return runAction(async () => {
    const parsed = TestSendSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid test send payload");
    }
    const actor = await requirePermission("canManageAutomations");
    const template = await automationService.listTemplates().then((all) =>
      all.find((t) => t.id === parsed.data.templateId),
    );
    if (!template) throw new NotFoundError("AutomationTemplate", parsed.data.templateId);

    if (template.channel === CommunicationChannel.EMAIL) {
      z.string().email().parse(parsed.data.recipient);
    }

    const log = await automationService.sendTest(
      parsed.data.templateId,
      parsed.data.recipient,
      actor.id,
    );
    return { logId: log.id, status: log.status };
  });
}

export async function resendAutomationForLead(
  raw: unknown,
): Promise<Result<{ logId: string; status: string }>> {
  return runAction(async () => {
    const parsed = ResendSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid resend payload");
    }
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const log = await automationService.resendForLead(
      parsed.data.leadId,
      parsed.data.templateId,
      actor.id,
    );
    return { logId: log.id, status: log.status };
  });
}
