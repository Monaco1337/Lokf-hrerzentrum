/**
 * AutomationTemplateRepository — mutable templates edited in CRM admin.
 */
import type {
  AutomationTemplateEntry,
  AutomationTrigger,
  CommunicationChannel,
  ConsentType,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import {
  parseAutomationTrigger,
  parseCommunicationChannel,
  parseConsentType,
} from "./types";

export interface UpsertAutomationTemplateInput {
  slug: string;
  trigger: AutomationTrigger;
  channel: CommunicationChannel;
  name: string;
  subject: string | null;
  body: string;
  enabled: boolean;
  requiresConsent: ConsentType | null;
}

function mapRow(row: {
  id: string;
  slug: string;
  trigger: string;
  channel: string;
  name: string;
  subject: string | null;
  body: string;
  enabled: boolean;
  requiresConsent: string | null;
  createdAt: Date;
  updatedAt: Date;
}): AutomationTemplateEntry {
  return {
    id: row.id,
    slug: row.slug,
    trigger: parseAutomationTrigger(row.trigger),
    channel: parseCommunicationChannel(row.channel),
    name: row.name,
    subject: row.subject,
    body: row.body,
    enabled: row.enabled,
    requiresConsent: row.requiresConsent
      ? parseConsentType(row.requiresConsent)
      : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class AutomationTemplateRepository {
  async list(): Promise<AutomationTemplateEntry[]> {
    const rows = await prisma.automationTemplate.findMany({
      orderBy: [{ trigger: "asc" }, { channel: "asc" }],
    });
    return rows.map(mapRow);
  }

  async findById(id: string): Promise<AutomationTemplateEntry | null> {
    const row = await prisma.automationTemplate.findUnique({ where: { id } });
    return row ? mapRow(row) : null;
  }

  async findBySlug(slug: string): Promise<AutomationTemplateEntry | null> {
    const row = await prisma.automationTemplate.findUnique({ where: { slug } });
    return row ? mapRow(row) : null;
  }

  async listEnabledForTrigger(
    trigger: AutomationTrigger,
  ): Promise<AutomationTemplateEntry[]> {
    const rows = await prisma.automationTemplate.findMany({
      where: { trigger, enabled: true },
      orderBy: { channel: "asc" },
    });
    return rows.map(mapRow);
  }

  async upsert(input: UpsertAutomationTemplateInput): Promise<AutomationTemplateEntry> {
    const row = await prisma.automationTemplate.upsert({
      where: { slug: input.slug },
      create: {
        slug: input.slug,
        trigger: input.trigger,
        channel: input.channel,
        name: input.name,
        subject: input.subject,
        body: input.body,
        enabled: input.enabled,
        requiresConsent: input.requiresConsent,
      },
      update: {
        trigger: input.trigger,
        channel: input.channel,
        name: input.name,
        subject: input.subject,
        body: input.body,
        enabled: input.enabled,
        requiresConsent: input.requiresConsent,
      },
    });
    return mapRow(row);
  }

  async update(
    id: string,
    patch: Partial<
      Pick<
        UpsertAutomationTemplateInput,
        "name" | "subject" | "body" | "enabled" | "requiresConsent"
      >
    >,
  ): Promise<AutomationTemplateEntry> {
    const row = await prisma.automationTemplate.update({
      where: { id },
      data: patch,
    });
    return mapRow(row);
  }
}

export const automationTemplateRepository = new AutomationTemplateRepository();
