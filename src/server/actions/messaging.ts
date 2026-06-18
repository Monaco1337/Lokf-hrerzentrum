"use server";
/**
 * Messaging actions — the simulated communication ledger control surface.
 *
 * Every action persists through the central CommunicationRepository, creates an
 * ActivityLog entry, and revalidates the affected views. No real messages are
 * sent unless a real WhatsApp adapter is configured (see whatsappService).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CommunicationChannelSchema } from "@/features/fairtrain-funnel/types";

import { ValidationError } from "../errors";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { messageLedgerService } from "../services/MessageLedgerService";
import { requirePermission, runAction, type Result } from "./_helpers";

function revalidateCommunication(leadId?: string): void {
  revalidatePath("/crm/communication");
  revalidatePath("/crm/communication/whatsapp");
  revalidatePath("/crm/communication/email");
  revalidatePath("/crm/communication/log");
  if (leadId) revalidatePath(`/crm/leads/${leadId}`);
}

const SendTemplateSchema = z.object({
  leadId: z.string().min(1),
  templateId: z.string().min(1),
});

export async function sendTemplateMessage(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = SendTemplateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Versand-Daten", {
        issues: parsed.error.issues,
      });
    }
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const entry = await messageLedgerService.sendTemplate({
      leadId: parsed.data.leadId,
      templateId: parsed.data.templateId,
      actorId: actor.id,
      sentBy: "ADMIN",
    });
    revalidateCommunication(parsed.data.leadId);
    return { id: entry.id };
  });
}

const LogManualSchema = z.object({
  leadId: z.string().min(1),
  channel: CommunicationChannelSchema,
  body: z.string().trim().min(1).max(4000),
  direction: z.enum(["OUT", "IN"]).optional(),
});

export async function logManualMessage(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = LogManualSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Nachrichten-Daten", {
        issues: parsed.error.issues,
      });
    }
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const entry = await messageLedgerService.logManual({
      leadId: parsed.data.leadId,
      channel: parsed.data.channel,
      body: parsed.data.body,
      actorId: actor.id,
      direction: parsed.data.direction,
    });
    revalidateCommunication(parsed.data.leadId);
    return { id: entry.id };
  });
}

const SimulateInboundSchema = z.object({
  leadId: z.string().min(1),
  channel: CommunicationChannelSchema,
  body: z.string().trim().min(1).max(4000),
});

export async function simulateInboundMessage(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = SimulateInboundSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Antwort-Daten", {
        issues: parsed.error.issues,
      });
    }
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const entry = await messageLedgerService.simulateInbound({
      leadId: parsed.data.leadId,
      channel: parsed.data.channel,
      body: parsed.data.body,
      actorId: actor.id,
    });
    revalidateCommunication(parsed.data.leadId);
    return { id: entry.id };
  });
}

const AdvanceStatusSchema = z.object({ messageId: z.string().min(1) });

export async function advanceMessageStatus(
  raw: unknown,
): Promise<Result<{ id: string; status: string }>> {
  return runAction(async () => {
    const parsed = AdvanceStatusSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Nachricht");
    }
    const actor = await requirePermission("canManageLeads");
    const entry = await messageLedgerService.advanceStatus(parsed.data.messageId);
    await assertLeadScopeForActor(actor, entry.leadId);
    revalidateCommunication(entry.leadId);
    return { id: entry.id, status: entry.status };
  });
}

const FailMessageSchema = z.object({
  messageId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
});

export async function failMessage(
  raw: unknown,
): Promise<Result<{ id: string; status: string }>> {
  return runAction(async () => {
    const parsed = FailMessageSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültiger Fehlergrund");
    }
    const actor = await requirePermission("canManageLeads");
    const entry = await messageLedgerService.failMessage(
      parsed.data.messageId,
      parsed.data.reason,
      actor.id,
    );
    await assertLeadScopeForActor(actor, entry.leadId);
    revalidateCommunication(entry.leadId);
    return { id: entry.id, status: entry.status };
  });
}
