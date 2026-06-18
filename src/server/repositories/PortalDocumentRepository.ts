/**
 * PortalDocumentRepository — per-lead document checklist with review workflow.
 *
 * The checklist is a fixed set of `PortalDocumentKind` rows per lead. `isDemo`
 * is resolved through the DemoSeedEntry registry (no schema column).
 */
import {
  PORTAL_DOCUMENT_ORDER,
  type PortalDocumentEntry,
  type PortalDocumentKind,
  PortalDocumentKindSchema,
  type PortalDocumentStatus,
  PortalDocumentStatusSchema,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { demoSeedRepository } from "./DemoSeedRepository";

interface DocRow {
  id: string;
  leadId: string;
  kind: string;
  status: string;
  fileName: string | null;
  reviewerNote: string | null;
  uploadedAt: Date | null;
  reviewedAt: Date | null;
}

function mapRow(row: DocRow, demoIds: ReadonlySet<string>): PortalDocumentEntry {
  return {
    id: row.id,
    leadId: row.leadId,
    kind: PortalDocumentKindSchema.parse(row.kind),
    status: PortalDocumentStatusSchema.parse(row.status),
    fileName: row.fileName,
    reviewerNote: row.reviewerNote,
    uploadedAt: row.uploadedAt,
    reviewedAt: row.reviewedAt,
    isDemo: demoIds.has(row.id),
  };
}

export class PortalDocumentRepository {
  private async demoIds(): Promise<Set<string>> {
    return new Set(await demoSeedRepository.listByType("PortalDocument"));
  }

  /** Ensure all six checklist rows exist for a lead; returns the new row ids. */
  async ensureChecklist(leadId: string): Promise<string[]> {
    const existing = await prisma.portalDocument.findMany({
      where: { leadId },
      select: { kind: true },
    });
    const present = new Set(existing.map((e) => e.kind));
    const created: string[] = [];
    for (const kind of PORTAL_DOCUMENT_ORDER) {
      if (present.has(kind)) continue;
      const row = await prisma.portalDocument.create({
        data: { leadId, kind, status: "MISSING" },
      });
      created.push(row.id);
    }
    return created;
  }

  async list(leadId: string): Promise<PortalDocumentEntry[]> {
    const [rows, demoIds] = await Promise.all([
      prisma.portalDocument.findMany({ where: { leadId } }),
      this.demoIds(),
    ]);
    const byKind = new Map(rows.map((r) => [r.kind, r]));
    // Always return the full ordered checklist, even before ensureChecklist ran.
    return PORTAL_DOCUMENT_ORDER.map((kind) => {
      const row = byKind.get(kind);
      if (row) return mapRow(row, demoIds);
      return {
        id: `${leadId}:${kind}`,
        leadId,
        kind,
        status: "MISSING" as PortalDocumentStatus,
        fileName: null,
        reviewerNote: null,
        uploadedAt: null,
        reviewedAt: null,
        isDemo: false,
      } satisfies PortalDocumentEntry;
    });
  }

  async listForLeads(
    leadIds: string[],
  ): Promise<Map<string, PortalDocumentEntry[]>> {
    if (leadIds.length === 0) return new Map();
    const [rows, demoIds] = await Promise.all([
      prisma.portalDocument.findMany({ where: { leadId: { in: leadIds } } }),
      this.demoIds(),
    ]);
    const out = new Map<string, PortalDocumentEntry[]>();
    for (const row of rows) {
      const list = out.get(row.leadId) ?? [];
      list.push(mapRow(row, demoIds));
      out.set(row.leadId, list);
    }
    return out;
  }

  async findById(id: string): Promise<PortalDocumentEntry | null> {
    const [row, demoIds] = await Promise.all([
      prisma.portalDocument.findUnique({ where: { id } }),
      this.demoIds(),
    ]);
    return row ? mapRow(row, demoIds) : null;
  }

  /** Upsert a single kind for a lead (used by demo seeding + portal uploads). */
  async upsert(
    leadId: string,
    kind: PortalDocumentKind,
    data: {
      status: PortalDocumentStatus;
      fileName?: string | null;
      reviewerNote?: string | null;
      reviewerId?: string | null;
      requestedAt?: Date | null;
      uploadedAt?: Date | null;
      reviewedAt?: Date | null;
    },
  ): Promise<PortalDocumentEntry> {
    const row = await prisma.portalDocument.upsert({
      where: { leadId_kind: { leadId, kind } },
      create: { leadId, kind, ...data },
      update: { ...data },
    });
    return mapRow(row, await this.demoIds());
  }

  async setStatus(
    id: string,
    status: PortalDocumentStatus,
    extra: {
      reviewerNote?: string | null;
      reviewerId?: string | null;
      reviewedAt?: Date | null;
      uploadedAt?: Date | null;
      requestedAt?: Date | null;
      fileName?: string | null;
    } = {},
  ): Promise<PortalDocumentEntry> {
    const row = await prisma.portalDocument.update({
      where: { id },
      data: { status, ...extra },
    });
    return mapRow(row, await this.demoIds());
  }
}

export const portalDocumentRepository = new PortalDocumentRepository();
