"use server";
/**
 * CRM Server Actions for lead automation templates and sends.
 */
import { z } from "zod";

import {
  CommunicationChannel,
  ConsentTypeSchema,
} from "@/features/fairtrain-funnel/types";

import { NotFoundError, ValidationError } from "../errors";
import { automationService } from "../services/AutomationService";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { requirePermission, runAction, type Result } from "./_helpers";

const UpdateTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  subject: z.string().max(200).nullable().optional(),
  body: z.string().min(1).max(10000).optional(),
  enabled: z.boolean().optional(),
  requiresConsent: ConsentTypeSchema.nullable().optional(),
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
      enabled?: boolean;
      requiresConsent?: import("@/features/fairtrain-funnel/types").ConsentType | null;
    } = {};
    if (rest.name !== undefined) patch.name = rest.name;
    if (rest.subject !== undefined) patch.subject = rest.subject;
    if (rest.body !== undefined) patch.body = rest.body;
    if (rest.enabled !== undefined) patch.enabled = rest.enabled;
    if (rest.requiresConsent !== undefined) patch.requiresConsent = rest.requiresConsent;
    const updated = await automationService.updateTemplate(id, patch, actor.id);
    return { id: updated.id };
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
