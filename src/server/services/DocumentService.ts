/**
 * DocumentService.
 *
 * - `computeReadiness` is the deterministic feeder (pure function in
 *   features/documents/readiness.ts).
 * - `syncReadiness` writes/updates Document rows to match the readiness.
 * - `generate` and `assembleMasterBundle` are interface stubs; PDF engine is
 *   future work. Storage goes through StorageAdapter (no hard-coded paths).
 */
import {
  computeReadiness,
  type Readiness,
} from "@/features/fairtrain-funnel/documents/readiness";
import {
  DOCUMENT_TEMPLATES,
  NON_BUNDLE_TYPES,
  getTemplate,
} from "@/features/fairtrain-funnel/documents/documentTypes";
import {
  type DocumentEntry,
  DocumentStatus,
  DocumentType,
} from "@/features/fairtrain-funnel/types";

import { NotFoundError } from "../errors";
import { documentRepository } from "../repositories/DocumentRepository";
import { leadRepository } from "../repositories/LeadRepository";
import { sensitiveAnswersRepository } from "../repositories/SensitiveAnswersRepository";
import type { StorageAdapter } from "../storage/StorageAdapter";
import { localStorageAdapter } from "../storage/LocalStorageAdapter";

export interface RenderedDocument {
  type: DocumentType;
  contentMarkdown: string;
  storageKey: string | null;
}

export class DocumentService {
  constructor(private readonly storage: StorageAdapter = localStorageAdapter) {}

  async computeForLead(leadId: string): Promise<Readiness> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);
    const sensitive = await sensitiveAnswersRepository.getForLead(leadId);
    return computeReadiness(lead, sensitive);
  }

  /**
   * Reconcile Document rows for a lead against current readiness. Existing
   * GENERATED/SENT/UPDATED rows are not regressed.
   */
  async syncReadiness(leadId: string): Promise<DocumentEntry[]> {
    const readiness = await this.computeForLead(leadId);
    const existing = await documentRepository.list(leadId);
    const existingByType = new Map(existing.map((d) => [d.type, d]));

    const result: DocumentEntry[] = [];
    for (const template of DOCUMENT_TEMPLATES) {
      const desired = readiness[template.type];
      const current = existingByType.get(template.type);
      const target =
        current &&
        (current.status === DocumentStatus.GENERATED ||
          current.status === DocumentStatus.SENT ||
          current.status === DocumentStatus.UPDATED)
          ? current.status
          : desired;
      const upserted = await documentRepository.upsert({
        leadId,
        type: template.type,
        status: target,
      });
      result.push(upserted);
    }
    return result;
  }

  /**
   * Stub: render a Markdown preview for a single document type.
   * Real PDF generation happens when this method is later replaced by a
   * pdfkit/puppeteer renderer that writes via `this.storage`.
   */
  async generate(
    leadId: string,
    type: DocumentType,
  ): Promise<RenderedDocument> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);
    const template = getTemplate(type);
    if (!template) throw new NotFoundError("DocumentTemplate", type);

    if (type === DocumentType.MASTER_BUNDLE) {
      return this.assembleMasterBundle(leadId);
    }

    const content = [
      `# ${template.title}`,
      "",
      `**Bewerber:** ${lead.firstName} ${lead.lastName}`,
      `**Standort:** ${lead.preferredLocation}`,
      `**Funnel:** ${lead.funnelPath}`,
      "",
      template.description,
      "",
      "_Dieses Dokument wurde als Vorschau erzeugt. Die finale PDF-Generierung erfolgt durch die produktive Renderer-Integration._",
    ].join("\n");

    const storageKey = await this.storage.put(
      `leads/${leadId}/${type}.md`,
      Buffer.from(content, "utf8"),
    );

    await documentRepository.upsert({
      leadId,
      type,
      status: DocumentStatus.GENERATED,
      storageKey,
      generatedAt: new Date(),
    });

    return { type, contentMarkdown: content, storageKey };
  }

  /**
   * Assemble the master bundle by aggregating non-bundle docs.
   * MVP returns concatenated markdown; real PDF merging is future work.
   */
  async assembleMasterBundle(leadId: string): Promise<RenderedDocument> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) throw new NotFoundError("Lead", leadId);

    const sections: string[] = [];
    for (const type of NON_BUNDLE_TYPES) {
      const rendered = await this.generate(leadId, type);
      sections.push(rendered.contentMarkdown);
    }

    const content = [
      `# Master-Dokument: ${lead.firstName} ${lead.lastName}`,
      "",
      ...sections.flatMap((s) => [s, "\n---\n"]),
    ].join("\n");

    const storageKey = await this.storage.put(
      `leads/${leadId}/MASTER_BUNDLE.md`,
      Buffer.from(content, "utf8"),
    );

    await documentRepository.upsert({
      leadId,
      type: DocumentType.MASTER_BUNDLE,
      status: DocumentStatus.GENERATED,
      storageKey,
      generatedAt: new Date(),
    });

    return {
      type: DocumentType.MASTER_BUNDLE,
      contentMarkdown: content,
      storageKey,
    };
  }
}

export const documentService = new DocumentService();
