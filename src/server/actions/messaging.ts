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

import {
  CommunicationChannel,
  CommunicationChannelSchema,
} from "@/features/fairtrain-funnel/types";

import { ValidationError } from "../errors";
import { leadRepository } from "../repositories/LeadRepository";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { messageLedgerService } from "../services/MessageLedgerService";
import { requirePermission, runAction, type Result } from "./_helpers";

function revalidateCommunication(leadId?: string): void {
  revalidatePath("/crm/communication");
  revalidatePath("/crm/communication/whatsapp");
  revalidatePath("/crm/communication/email");
  revalidatePath("/crm/communication/log");
  revalidatePath("/crm/multichat");
  // Sending / replying can auto-advance the lead's pipeline status, so refresh
  // the surfaces that count by status (Leitstand, Leads, Pipeline).
  revalidatePath("/crm");
  revalidatePath("/crm/leads");
  revalidatePath("/crm/pipeline");
  if (leadId) revalidatePath(`/crm/leads/${leadId}`);
}

const SendWhatsAppTextSchema = z.object({
  leadId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

/**
 * Free-text WhatsApp reply used by the Multichat inbox. The sending number is
 * resolved automatically (thread number → assigned rep's number → first active
 * number) inside MessageLedgerService, so the operator never picks a number.
 *
 * This is a HUMAN, agent-initiated reply inside an open conversation (the lead
 * wrote to us). We therefore bypass the opt-in consent gate — requiring a
 * separate WhatsApp consent for a manual reply to someone who just messaged us
 * makes no sense and blocks legitimate support in the 24h service window. The
 * opt-out guard is NOT bypassed: a lead who wrote STOP stays blocked (surfaced
 * to the operator as a clear error).
 */
export async function sendWhatsAppText(
  raw: unknown,
): Promise<Result<{ id: string; status: string; isDemo: boolean }>> {
  return runAction(async () => {
    const parsed = SendWhatsAppTextSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Nachricht", {
        issues: parsed.error.issues,
      });
    }
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const entry = await messageLedgerService.sendText({
      leadId: parsed.data.leadId,
      body: parsed.data.body,
      actorId: actor.id,
      channel: CommunicationChannel.WHATSAPP,
      bypassConsent: true,
    });
    revalidateCommunication(parsed.data.leadId);
    // A real send that the provider rejected must surface the reason instead of
    // silently pretending success.
    if (entry.status === "FAILED") {
      throw new ValidationError(
        entry.failedReason
          ? `WhatsApp-Versand fehlgeschlagen: ${entry.failedReason}`
          : "WhatsApp-Versand fehlgeschlagen.",
      );
    }
    return { id: entry.id, status: entry.status, isDemo: entry.isDemo };
  });
}

const MarkReplyHandledSchema = z.object({ leadId: z.string().min(1) });

/**
 * "Als erledigt markieren" in the Multichat "Neue Antworten" inbox: clears the
 * unhandled-reply flag on the lead so it leaves the inbox / the leads "neue
 * Antworten" filter. The inbound message + history are kept intact.
 */
export async function markReplyHandled(
  raw: unknown,
): Promise<Result<{ leadId: string }>> {
  return runAction(async () => {
    const parsed = MarkReplyHandledSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültiger Lead");
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    await leadRepository.update(parsed.data.leadId, {
      lastWhatsappReplyAt: null,
    });
    revalidateCommunication(parsed.data.leadId);
    return { leadId: parsed.data.leadId };
  });
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
    // A real (non-demo) send that failed must surface the provider reason to
    // the user instead of pretending it worked.
    if (entry.status === "FAILED") {
      throw new ValidationError(
        entry.failedReason
          ? `WhatsApp-Versand von Meta abgelehnt: ${entry.failedReason}`
          : "WhatsApp-Versand fehlgeschlagen.",
      );
    }
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
