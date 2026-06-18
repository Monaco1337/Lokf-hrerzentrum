"use server";
/**
 * Admin actions for the applicant portal: link lifecycle + document review.
 * All require `canManageLeads` and are scoped to the actor's lead access.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PortalDocumentKindSchema } from "@/features/fairtrain-funnel/types";

import { ValidationError } from "../errors";
import { portalDocumentRepository } from "../repositories/PortalDocumentRepository";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { portalService } from "../services/PortalService";
import { requirePermission, runAction, type Result } from "./_helpers";

function revalidateLead(leadId: string): void {
  revalidatePath(`/crm/leads/${leadId}`);
  revalidatePath("/crm/applicants");
  revalidatePath("/crm/unterlagen");
}

const LeadIdSchema = z.object({ leadId: z.string().min(1) });

export async function createPortalLink(
  raw: unknown,
): Promise<Result<{ url: string; linkId: string }>> {
  return runAction(async () => {
    const parsed = LeadIdSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Anfrage");
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const { url, link } = await portalService.createLink(
      parsed.data.leadId,
      actor.id,
    );
    revalidateLead(parsed.data.leadId);
    return { url, linkId: link.id };
  });
}

const SetEnabledSchema = z.object({
  linkId: z.string().min(1),
  leadId: z.string().min(1),
  enabled: z.boolean(),
});

export async function setPortalLinkEnabled(
  raw: unknown,
): Promise<Result<{ ok: boolean }>> {
  return runAction(async () => {
    const parsed = SetEnabledSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Anfrage");
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    await portalService.setLinkEnabled(
      parsed.data.linkId,
      parsed.data.enabled,
      actor.id,
    );
    revalidateLead(parsed.data.leadId);
    return { ok: true };
  });
}

const SetExpirySchema = z.object({
  linkId: z.string().min(1),
  leadId: z.string().min(1),
  expiresAt: z.string().min(1),
});

export async function setPortalLinkExpiry(
  raw: unknown,
): Promise<Result<{ ok: boolean }>> {
  return runAction(async () => {
    const parsed = SetExpirySchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Anfrage");
    const date = new Date(parsed.data.expiresAt);
    if (Number.isNaN(date.getTime())) throw new ValidationError("Ungültiges Datum");
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    await portalService.setLinkExpiry(parsed.data.linkId, date, actor.id);
    revalidateLead(parsed.data.leadId);
    return { ok: true };
  });
}

const RequestDocsSchema = z.object({
  leadId: z.string().min(1),
  kinds: z.array(PortalDocumentKindSchema).min(1),
});

export async function requestPortalDocuments(
  raw: unknown,
): Promise<Result<{ ok: boolean }>> {
  return runAction(async () => {
    const parsed = RequestDocsSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Anfrage");
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    await portalService.requestDocuments(
      parsed.data.leadId,
      parsed.data.kinds,
      actor.id,
    );
    revalidateLead(parsed.data.leadId);
    return { ok: true };
  });
}

const ReviewSchema = z.object({
  documentId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewerNote: z.string().max(1000).optional(),
});

export async function reviewPortalDocument(
  raw: unknown,
): Promise<Result<{ ok: boolean }>> {
  return runAction(async () => {
    const parsed = ReviewSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError("Ungültige Anfrage");
    const actor = await requirePermission("canManageLeads");
    const doc = await portalDocumentRepository.findById(parsed.data.documentId);
    if (!doc) throw new ValidationError("Dokument nicht gefunden");
    await assertLeadScopeForActor(actor, doc.leadId);
    await portalService.reviewDocument(
      parsed.data.documentId,
      parsed.data.decision,
      actor.id,
      parsed.data.reviewerNote,
    );
    revalidateLead(doc.leadId);
    return { ok: true };
  });
}
