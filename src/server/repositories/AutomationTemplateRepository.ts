/**
 * AutomationTemplateRepository — mutable, admin-managed message templates.
 *
 * `isDemo` is resolved through the DemoSeedEntry registry (no dedicated column)
 * so demo templates stay cleanly separable from production data.
 */
import {
  type AutomationTemplateEntry,
  type AutomationTrigger,
  type MetaApprovalStatus,
  MetaApprovalStatusSchema,
  type TemplateCategory,
  TemplateCategorySchema,
  type TemplateChannel,
  TemplateChannelSchema,
  type TemplateStatus,
  TemplateStatusSchema,
  type ConsentType,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { demoSeedRepository } from "./DemoSeedRepository";
import { parseAutomationTrigger, parseConsentType } from "./types";

export interface UpsertAutomationTemplateInput {
  slug: string;
  trigger: AutomationTrigger;
  channel: TemplateChannel;
  category: TemplateCategory;
  status: TemplateStatus;
  language: string;
  name: string;
  subject: string | null;
  body: string;
  requiresConsent: ConsentType | null;
  metaTemplateName: string | null;
  metaApprovalStatus: MetaApprovalStatus | null;
  senderPhoneNumberId?: string | null;
  metaBodyParams?: string[];
}

function parseMetaBodyParams(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    /* ignore malformed JSON → empty */
  }
  return [];
}

interface TemplateRow {
  id: string;
  slug: string;
  trigger: string;
  channel: string;
  category: string;
  status: string;
  language: string;
  name: string;
  subject: string | null;
  body: string;
  enabled: boolean;
  requiresConsent: string | null;
  metaTemplateName: string | null;
  metaApprovalStatus: string | null;
  senderPhoneNumberId: string | null;
  metaBodyParams: string | null;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function mapRow(row: TemplateRow, demoIds: ReadonlySet<string>): AutomationTemplateEntry {
  return {
    id: row.id,
    slug: row.slug,
    trigger: parseAutomationTrigger(row.trigger),
    channel: TemplateChannelSchema.parse(row.channel),
    category: TemplateCategorySchema.parse(row.category),
    status: TemplateStatusSchema.parse(row.status),
    language: row.language,
    name: row.name,
    subject: row.subject,
    body: row.body,
    enabled: row.enabled,
    requiresConsent: row.requiresConsent
      ? parseConsentType(row.requiresConsent)
      : null,
    metaTemplateName: row.metaTemplateName,
    metaApprovalStatus: row.metaApprovalStatus
      ? MetaApprovalStatusSchema.parse(row.metaApprovalStatus)
      : null,
    senderPhoneNumberId: row.senderPhoneNumberId,
    metaBodyParams: parseMetaBodyParams(row.metaBodyParams),
    usageCount: row.usageCount,
    lastUsedAt: row.lastUsedAt,
    isDemo: demoIds.has(row.id),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class AutomationTemplateRepository {
  private async demoIds(): Promise<Set<string>> {
    return new Set(await demoSeedRepository.listByType("AutomationTemplate"));
  }

  async list(): Promise<AutomationTemplateEntry[]> {
    const [rows, demoIds] = await Promise.all([
      prisma.automationTemplate.findMany({
        orderBy: [{ category: "asc" }, { channel: "asc" }, { name: "asc" }],
      }),
      this.demoIds(),
    ]);
    return rows.map((r) => mapRow(r, demoIds));
  }

  async findById(id: string): Promise<AutomationTemplateEntry | null> {
    const [row, demoIds] = await Promise.all([
      prisma.automationTemplate.findUnique({ where: { id } }),
      this.demoIds(),
    ]);
    return row ? mapRow(row, demoIds) : null;
  }

  async findBySlug(slug: string): Promise<AutomationTemplateEntry | null> {
    const [row, demoIds] = await Promise.all([
      prisma.automationTemplate.findUnique({ where: { slug } }),
      this.demoIds(),
    ]);
    return row ? mapRow(row, demoIds) : null;
  }

  /** Legacy auto-send path: only ACTIVE templates with the matching trigger. */
  async listEnabledForTrigger(
    trigger: AutomationTrigger,
  ): Promise<AutomationTemplateEntry[]> {
    const [rows, demoIds] = await Promise.all([
      prisma.automationTemplate.findMany({
        where: { trigger, enabled: true, status: "active" },
        orderBy: { channel: "asc" },
      }),
      this.demoIds(),
    ]);
    return rows.map((r) => mapRow(r, demoIds));
  }

  async create(input: UpsertAutomationTemplateInput): Promise<AutomationTemplateEntry> {
    const row = await prisma.automationTemplate.create({
      data: {
        slug: input.slug,
        trigger: input.trigger,
        channel: input.channel,
        category: input.category,
        status: input.status,
        language: input.language,
        name: input.name,
        subject: input.subject,
        body: input.body,
        enabled: input.status === "active",
        requiresConsent: input.requiresConsent,
        metaTemplateName: input.metaTemplateName,
        metaApprovalStatus: input.metaApprovalStatus,
        senderPhoneNumberId: input.senderPhoneNumberId ?? null,
        metaBodyParams: JSON.stringify(input.metaBodyParams ?? []),
      },
    });
    return mapRow(row, await this.demoIds());
  }

  async upsert(input: UpsertAutomationTemplateInput): Promise<AutomationTemplateEntry> {
    const data = {
      trigger: input.trigger,
      channel: input.channel,
      category: input.category,
      status: input.status,
      language: input.language,
      name: input.name,
      subject: input.subject,
      body: input.body,
      enabled: input.status === "active",
      requiresConsent: input.requiresConsent,
      metaTemplateName: input.metaTemplateName,
      metaApprovalStatus: input.metaApprovalStatus,
      senderPhoneNumberId: input.senderPhoneNumberId ?? null,
      metaBodyParams: JSON.stringify(input.metaBodyParams ?? []),
    };
    const row = await prisma.automationTemplate.upsert({
      where: { slug: input.slug },
      create: { slug: input.slug, ...data },
      update: data,
    });
    return mapRow(row, await this.demoIds());
  }

  async update(
    id: string,
    patch: {
      name?: string;
      subject?: string | null;
      body?: string;
      category?: TemplateCategory;
      status?: TemplateStatus;
      requiresConsent?: ConsentType | null;
      metaTemplateName?: string | null;
      metaApprovalStatus?: MetaApprovalStatus | null;
      senderPhoneNumberId?: string | null;
      metaBodyParams?: string[];
      language?: string;
    },
  ): Promise<AutomationTemplateEntry> {
    const { metaBodyParams, ...rest } = patch;
    const data: Record<string, unknown> = { ...rest };
    if (patch.status !== undefined) data.enabled = patch.status === "active";
    if (metaBodyParams !== undefined) data.metaBodyParams = JSON.stringify(metaBodyParams);
    const row = await prisma.automationTemplate.update({ where: { id }, data });
    return mapRow(row, await this.demoIds());
  }

  async delete(id: string): Promise<void> {
    await prisma.automationTemplate.delete({ where: { id } });
  }

  async recordUsage(id: string): Promise<void> {
    await prisma.automationTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
    });
  }
}

export const automationTemplateRepository = new AutomationTemplateRepository();
