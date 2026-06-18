/**
 * PortalLinkRepository — persistence for applicant self-service portal links.
 *
 * The plaintext token is never stored; only `tokenHash`. The lead id never
 * appears in the URL, so a portal cannot be reached by guessing a lead id.
 */
import {
  type PortalFormValues,
  type PortalLinkDisplayStatus,
  type PortalLinkEntry,
  type PortalLinkStatus,
  PortalLinkStatusSchema,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";

interface LinkRow {
  id: string;
  leadId: string;
  status: string;
  expiresAt: Date;
  openedAt: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  formData: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function deriveDisplayStatus(
  status: PortalLinkStatus,
  expiresAt: Date,
): PortalLinkDisplayStatus {
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "DISABLED") return "DISABLED";
  if (expiresAt.getTime() < Date.now()) return "EXPIRED";
  return status; // ACTIVE | OPENED
}

function mapRow(row: LinkRow): PortalLinkEntry {
  const status = PortalLinkStatusSchema.parse(row.status);
  return {
    id: row.id,
    leadId: row.leadId,
    status,
    displayStatus: deriveDisplayStatus(status, row.expiresAt),
    expiresAt: row.expiresAt,
    openedAt: row.openedAt,
    submittedAt: row.submittedAt,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface InsertPortalLinkInput {
  tokenHash: string;
  leadId: string;
  expiresAt: Date;
}

export class PortalLinkRepository {
  async insert(input: InsertPortalLinkInput): Promise<PortalLinkEntry> {
    const row = await prisma.portalLink.create({
      data: {
        tokenHash: input.tokenHash,
        leadId: input.leadId,
        expiresAt: input.expiresAt,
        status: "ACTIVE",
      },
    });
    return mapRow(row);
  }

  /** Raw row by token hash — includes leadId/formData for server-side use. */
  async findByHash(
    tokenHash: string,
  ): Promise<(PortalLinkEntry & { formData: PortalFormValues | null }) | null> {
    const row = await prisma.portalLink.findUnique({ where: { tokenHash } });
    if (!row) return null;
    return {
      ...mapRow(row),
      formData: parseFormData(row.formData),
    };
  }

  async findById(id: string): Promise<PortalLinkEntry | null> {
    const row = await prisma.portalLink.findUnique({ where: { id } });
    return row ? mapRow(row) : null;
  }

  /** Most recent link for a lead (the one the admin manages). */
  async findLatestForLead(leadId: string): Promise<PortalLinkEntry | null> {
    const row = await prisma.portalLink.findFirst({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
    return row ? mapRow(row) : null;
  }

  async listForLeads(leadIds: string[]): Promise<Map<string, PortalLinkEntry>> {
    if (leadIds.length === 0) return new Map();
    const rows = await prisma.portalLink.findMany({
      where: { leadId: { in: leadIds } },
      orderBy: { createdAt: "desc" },
    });
    const out = new Map<string, PortalLinkEntry>();
    for (const row of rows) {
      if (!out.has(row.leadId)) out.set(row.leadId, mapRow(row));
    }
    return out;
  }

  async list(): Promise<PortalLinkEntry[]> {
    const rows = await prisma.portalLink.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapRow);
  }

  async setStatus(id: string, status: PortalLinkStatus): Promise<void> {
    await prisma.portalLink.update({ where: { id }, data: { status } });
  }

  async setExpiry(id: string, expiresAt: Date): Promise<void> {
    await prisma.portalLink.update({ where: { id }, data: { expiresAt } });
  }

  async markOpened(id: string): Promise<void> {
    await prisma.portalLink.update({
      where: { id },
      data: { openedAt: new Date(), status: "OPENED" },
    });
  }

  async saveForm(id: string, form: PortalFormValues): Promise<void> {
    await prisma.portalLink.update({
      where: { id },
      data: { formData: JSON.stringify(form) },
    });
  }

  async markSubmitted(id: string, form: PortalFormValues): Promise<void> {
    await prisma.portalLink.update({
      where: { id },
      data: { submittedAt: new Date(), formData: JSON.stringify(form) },
    });
  }

  async markCompleted(id: string): Promise<void> {
    await prisma.portalLink.update({
      where: { id },
      data: { completedAt: new Date(), status: "COMPLETED" },
    });
  }
}

function parseFormData(raw: string | null): PortalFormValues | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PortalFormValues;
  } catch {
    return null;
  }
}

export const portalLinkRepository = new PortalLinkRepository();
