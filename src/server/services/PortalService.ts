/**
 * PortalService — orchestrates the applicant self-service portal flow.
 *
 * Responsibilities:
 *  - Admin: create/enable/disable/expire portal links, request documents and
 *    review (approve/reject) uploaded documents.
 *  - Public (token-scoped): resolve a minimal applicant-safe context, save and
 *    submit the form, and simulate document uploads in demo mode.
 *
 * No real files are required: uploads are recorded as placeholder metadata so
 * the flow is fully demonstrable. A real StorageAdapter can attach later via
 * `PortalDocument.uploadedFileId` without changing this contract.
 */
import {
  AuditAction,
  EmploymentStatusSchema,
  PORTAL_DOCUMENT_LABEL,
  PORTAL_DOCUMENT_ORDER,
  PORTAL_REQUIRED_DOCUMENTS,
  type PortalContext,
  type PortalDocumentEntry,
  type PortalDocumentKind,
  PortalFormSchema,
  type PortalFormValues,
  type PortalLinkEntry,
} from "@/features/fairtrain-funnel/types";

import { leadRepository } from "../repositories/LeadRepository";
import { portalDocumentRepository } from "../repositories/PortalDocumentRepository";
import { portalLinkRepository } from "../repositories/PortalLinkRepository";
import { auditLogService } from "./AuditLogService";
import { portalTokenService } from "./PortalTokenService";
import { statusMachineService } from "./StatusMachineService";

/** Lead statuses before "documents ready" — safe to auto-advance from. */
const PRE_DOC_READY = new Set([
  "NEW",
  "QUALIFIED",
  "HOT",
  "CONTACT_PENDING",
  "CONTACTED",
  "CALL_SCHEDULED",
  "BRIEFING_SENT",
  "DOC_PENDING",
]);

const DEFAULT_TTL_DAYS = 21;

export interface CreatePortalLinkResult {
  url: string;
  link: PortalLinkEntry;
}

function computeCompletion(docs: PortalDocumentEntry[]): number {
  const done = PORTAL_REQUIRED_DOCUMENTS.filter((kind) => {
    const doc = docs.find((d) => d.kind === kind);
    return doc?.status === "UPLOADED" || doc?.status === "APPROVED";
  }).length;
  return Math.round((done / PORTAL_REQUIRED_DOCUMENTS.length) * 100);
}

export class PortalService {
  // -------------------------------------------------------------------------
  // Admin operations.
  // -------------------------------------------------------------------------
  async createLink(
    leadId: string,
    actor: string,
    ttlDays = DEFAULT_TTL_DAYS,
  ): Promise<CreatePortalLinkResult> {
    await portalDocumentRepository.ensureChecklist(leadId);

    const token = portalTokenService.generate();
    const tokenHash = portalTokenService.hash(token);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const link = await portalLinkRepository.insert({ tokenHash, leadId, expiresAt });

    await auditLogService.append({
      actor,
      action: AuditAction.PORTAL_LINK_CREATED,
      entityType: "Lead",
      entityId: leadId,
      details: { expiresAt: expiresAt.toISOString(), linkId: link.id },
    });

    return { url: portalTokenService.buildUrl(token), link };
  }

  async setLinkEnabled(
    linkId: string,
    enabled: boolean,
    actor: string,
  ): Promise<void> {
    const link = await portalLinkRepository.findById(linkId);
    if (!link) return;
    await portalLinkRepository.setStatus(linkId, enabled ? "ACTIVE" : "DISABLED");
    await auditLogService.append({
      actor,
      action: AuditAction.PORTAL_LINK_UPDATED,
      entityType: "Lead",
      entityId: link.leadId,
      details: { linkId, enabled },
    });
  }

  async setLinkExpiry(
    linkId: string,
    expiresAt: Date,
    actor: string,
  ): Promise<void> {
    const link = await portalLinkRepository.findById(linkId);
    if (!link) return;
    await portalLinkRepository.setExpiry(linkId, expiresAt);
    await auditLogService.append({
      actor,
      action: AuditAction.PORTAL_LINK_UPDATED,
      entityType: "Lead",
      entityId: link.leadId,
      details: { linkId, expiresAt: expiresAt.toISOString() },
    });
  }

  async requestDocuments(
    leadId: string,
    kinds: PortalDocumentKind[],
    actor: string,
  ): Promise<void> {
    await portalDocumentRepository.ensureChecklist(leadId);
    for (const kind of kinds) {
      await portalDocumentRepository.upsert(leadId, kind, {
        status: "REQUESTED",
        requestedAt: new Date(),
      });
    }
    await auditLogService.append({
      actor,
      action: AuditAction.DOCUMENT_REQUESTED,
      entityType: "Lead",
      entityId: leadId,
      details: { kinds },
    });
  }

  async reviewDocument(
    documentId: string,
    decision: "APPROVED" | "REJECTED",
    actor: string,
    reviewerNote?: string,
  ): Promise<void> {
    const doc = await portalDocumentRepository.findById(documentId);
    if (!doc) return;
    await portalDocumentRepository.setStatus(documentId, decision, {
      reviewedAt: new Date(),
      reviewerId: actor,
      reviewerNote: reviewerNote ?? null,
    });
    await auditLogService.append({
      actor,
      action:
        decision === "APPROVED"
          ? AuditAction.DOCUMENT_APPROVED
          : AuditAction.DOCUMENT_REJECTED,
      entityType: "Lead",
      entityId: doc.leadId,
      details: { kind: doc.kind, reviewerNote: reviewerNote ?? null },
    });
  }

  async setReviewerNote(
    documentId: string,
    note: string,
    actor: string,
  ): Promise<void> {
    const doc = await portalDocumentRepository.findById(documentId);
    if (!doc) return;
    await portalDocumentRepository.setStatus(documentId, doc.status, {
      reviewerNote: note,
      reviewerId: actor,
    });
  }

  // -------------------------------------------------------------------------
  // Public (token-scoped) operations.
  // -------------------------------------------------------------------------

  /** Resolve a minimal, applicant-safe view. Records the first open. */
  async resolveContext(token: string): Promise<PortalContext> {
    const link = await this.resolveLink(token);
    if (!link.ok) return link;

    const { entry, leadId } = link;

    if (!entry.openedAt) {
      await portalLinkRepository.markOpened(entry.id);
      await auditLogService.append({
        actor: "applicant",
        action: AuditAction.PORTAL_OPENED,
        entityType: "Lead",
        entityId: leadId,
        details: { linkId: entry.id },
      });
    }

    const lead = await leadRepository.findById(leadId);
    const docs = await portalDocumentRepository.list(leadId);
    const isDemo = await this.isDemoLead(leadId);

    return {
      ok: true,
      displayStatus: entry.displayStatus,
      isDemo,
      companyName: "Lokführer.de",
      form: {
        firstName: lead?.firstName ?? "",
        lastName: lead?.lastName ?? "",
        phone: lead?.phone ?? "",
        email: lead?.email ?? "",
        city: lead?.city ?? "",
        availability: lead?.availability ?? "",
        currentEmploymentStatus: lead?.employmentStatus ?? "",
        agencyStatus: lead?.agencyStatus ?? "",
        hasEducationVoucher: lead?.hasEducationVoucher ?? undefined,
        hasDrivingLicense: lead?.hasDrivingLicense ?? undefined,
        notes: entry.formData?.notes ?? "",
        ...(entry.formData ?? {}),
      },
      documents: PORTAL_DOCUMENT_ORDER.map((kind) => ({
        kind,
        label: PORTAL_DOCUMENT_LABEL[kind],
        status: docs.find((d) => d.kind === kind)?.status ?? "MISSING",
        required: PORTAL_REQUIRED_DOCUMENTS.includes(kind),
      })),
      completionPercent: computeCompletion(docs),
    };
  }

  async saveForm(token: string, values: unknown): Promise<{ ok: boolean }> {
    const link = await this.resolveLink(token);
    if (!link.ok) return { ok: false };
    const form = PortalFormSchema.parse(values);
    await this.persistForm(link.entry, link.leadId, form, false);
    return { ok: true };
  }

  async submitForm(
    token: string,
    values: unknown,
  ): Promise<{ ok: boolean; completionPercent: number }> {
    const link = await this.resolveLink(token);
    if (!link.ok) return { ok: false, completionPercent: 0 };
    const form = PortalFormSchema.parse(values);
    await this.persistForm(link.entry, link.leadId, form, true);

    await auditLogService.append({
      actor: "applicant",
      action: AuditAction.PORTAL_FORM_SUBMITTED,
      entityType: "Lead",
      entityId: link.leadId,
      details: {},
    });

    const completion = await this.maybeComplete(link.entry.id, link.leadId);
    return { ok: true, completionPercent: completion };
  }

  async simulateUpload(
    token: string,
    kind: PortalDocumentKind,
  ): Promise<{ ok: boolean; completionPercent: number }> {
    const link = await this.resolveLink(token);
    if (!link.ok) return { ok: false, completionPercent: 0 };

    await portalDocumentRepository.upsert(link.leadId, kind, {
      status: "UPLOADED",
      uploadedAt: new Date(),
      fileName: `${PORTAL_DOCUMENT_LABEL[kind].replace(/\s+/g, "_")}_Bewerber.pdf`,
    });

    await auditLogService.append({
      actor: "applicant",
      action: AuditAction.PORTAL_UPLOAD_ADDED,
      entityType: "Lead",
      entityId: link.leadId,
      details: { kind },
    });
    await auditLogService.append({
      actor: "applicant",
      action: AuditAction.DOCUMENT_UPLOADED,
      entityType: "Lead",
      entityId: link.leadId,
      details: { kind, simulated: true },
    });

    const completion = await this.maybeComplete(link.entry.id, link.leadId);
    return { ok: true, completionPercent: completion };
  }

  // -------------------------------------------------------------------------
  // Internal helpers.
  // -------------------------------------------------------------------------

  private async resolveLink(
    token: string,
  ): Promise<
    | { ok: false; reason: "INVALID" | "EXPIRED" | "DISABLED" }
    | {
        ok: true;
        entry: PortalLinkEntry & { formData: PortalFormValues | null };
        leadId: string;
      }
  > {
    if (!token || token.length < 16) return { ok: false, reason: "INVALID" };
    const row = await portalLinkRepository.findByHash(portalTokenService.hash(token));
    if (!row) return { ok: false, reason: "INVALID" };
    if (row.status === "DISABLED") return { ok: false, reason: "DISABLED" };
    if (row.displayStatus === "EXPIRED") return { ok: false, reason: "EXPIRED" };
    return { ok: true, entry: row, leadId: row.leadId };
  }

  private async persistForm(
    entry: PortalLinkEntry,
    leadId: string,
    form: PortalFormValues,
    submitted: boolean,
  ): Promise<void> {
    const firstStart = !entry.openedAt || !entry.submittedAt;

    const fields: Parameters<typeof leadRepository.update>[1] = {};
    if (form.firstName) fields.firstName = form.firstName;
    if (form.lastName) fields.lastName = form.lastName;
    if (form.email) fields.email = form.email;
    if (form.phone) fields.phone = form.phone;
    if (form.city !== undefined) fields.city = form.city || null;
    if (form.availability !== undefined)
      fields.availability = form.availability || null;
    if (form.agencyStatus !== undefined)
      fields.agencyStatus = form.agencyStatus || null;
    if (form.hasEducationVoucher !== undefined)
      fields.hasEducationVoucher = form.hasEducationVoucher;
    if (form.hasDrivingLicense !== undefined)
      fields.hasDrivingLicense = form.hasDrivingLicense;

    // currentEmploymentStatus maps onto the canonical Lead enum when valid.
    const emp = EmploymentStatusSchema.safeParse(form.currentEmploymentStatus);
    if (emp.success) fields.employmentStatus = emp.data;

    await leadRepository.update(leadId, fields);

    if (submitted) {
      await portalLinkRepository.markSubmitted(entry.id, form);
    } else {
      await portalLinkRepository.saveForm(entry.id, form);
    }

    if (firstStart && !submitted) {
      await auditLogService.append({
        actor: "applicant",
        action: AuditAction.PORTAL_FORM_STARTED,
        entityType: "Lead",
        entityId: leadId,
        details: {},
      });
    }
    if (!submitted) {
      await auditLogService.append({
        actor: "applicant",
        action: AuditAction.PORTAL_FORM_SAVED,
        entityType: "Lead",
        entityId: leadId,
        details: {},
      });
    }
  }

  /** Marks the link complete + advances the lead when everything is in. */
  private async maybeComplete(linkId: string, leadId: string): Promise<number> {
    const docs = await portalDocumentRepository.list(leadId);
    const completion = computeCompletion(docs);
    const link = await portalLinkRepository.findById(linkId);
    if (!link) return completion;

    if (completion >= 100 && link.submittedAt && link.status !== "COMPLETED") {
      await portalLinkRepository.markCompleted(linkId);
      await auditLogService.append({
        actor: "applicant",
        action: AuditAction.PORTAL_DOCS_COMPLETE,
        entityType: "Lead",
        entityId: leadId,
        details: { completionPercent: completion },
      });

      const lead = await leadRepository.findById(leadId);
      if (lead && PRE_DOC_READY.has(lead.status)) {
        await statusMachineService.transition({
          leadId,
          toStatus: "DOC_READY",
          actor: "applicant",
          reason: "Bewerberportal: Unterlagen vollständig",
          override: true,
        });
      }
    }
    return completion;
  }

  private async isDemoLead(leadId: string): Promise<boolean> {
    const { demoSeedRepository } = await import(
      "../repositories/DemoSeedRepository"
    );
    const ids = await demoSeedRepository.listByType("Lead");
    return ids.includes(leadId);
  }
}

export const portalService = new PortalService();
