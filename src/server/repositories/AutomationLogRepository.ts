/**
 * AutomationLogRepository — APPEND-ONLY audit trail for automated sends.
 */
import type {
  AutomationLogEntry,
  AutomationLogStatus,
  AutomationTrigger,
  CommunicationChannel,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import {
  parseAutomationLogStatus,
  parseAutomationTrigger,
  parseCommunicationChannel,
} from "./types";

export interface AppendAutomationLogInput {
  leadId: string;
  templateId: string | null;
  trigger: AutomationTrigger;
  channel: CommunicationChannel;
  status: AutomationLogStatus;
  renderedSubject: string | null;
  renderedBody: string;
  providerMessageId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  isTest?: boolean;
  triggeredBy?: string;
}

function mapRow(row: {
  id: string;
  leadId: string;
  templateId: string | null;
  trigger: string;
  channel: string;
  status: string;
  renderedSubject: string | null;
  renderedBody: string;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  isTest: boolean;
  triggeredBy: string;
  createdAt: Date;
  template: { slug: string } | null;
}): AutomationLogEntry {
  return {
    id: row.id,
    leadId: row.leadId,
    templateId: row.templateId,
    templateSlug: row.template?.slug ?? null,
    trigger: parseAutomationTrigger(row.trigger),
    channel: parseCommunicationChannel(row.channel) as
      | "EMAIL"
      | "WHATSAPP"
      | "SMS",
    status: parseAutomationLogStatus(row.status),
    renderedSubject: row.renderedSubject,
    renderedBody: row.renderedBody,
    providerMessageId: row.providerMessageId,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    isTest: row.isTest,
    triggeredBy: row.triggeredBy,
    createdAt: row.createdAt,
  };
}

export class AutomationLogRepository {
  async append(input: AppendAutomationLogInput): Promise<AutomationLogEntry> {
    const row = await prisma.automationLog.create({
      data: {
        leadId: input.leadId,
        templateId: input.templateId,
        trigger: input.trigger,
        channel: input.channel,
        status: input.status,
        renderedSubject: input.renderedSubject,
        renderedBody: input.renderedBody,
        providerMessageId: input.providerMessageId ?? null,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null,
        isTest: input.isTest ?? false,
        triggeredBy: input.triggeredBy ?? "system",
      },
      include: { template: { select: { slug: true } } },
    });
    return mapRow(row);
  }

  async listForLead(leadId: string): Promise<AutomationLogEntry[]> {
    const rows = await prisma.automationLog.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      include: { template: { select: { slug: true } } },
    });
    return rows.map(mapRow);
  }

  async listRecent(limit = 50): Promise<AutomationLogEntry[]> {
    const rows = await prisma.automationLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { template: { select: { slug: true } } },
    });
    return rows.map(mapRow);
  }

  async countByStatus(): Promise<Record<AutomationLogStatus, number>> {
    const groups = await prisma.automationLog.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const base: Record<AutomationLogStatus, number> = {
      SENT: 0,
      FAILED: 0,
      SKIPPED: 0,
      SKIPPED_MISSING_PROVIDER_CONFIG: 0,
      SKIPPED_NO_CONSENT: 0,
    };
    for (const g of groups) {
      const status = parseAutomationLogStatus(g.status);
      base[status] = g._count._all;
    }
    return base;
  }
}

export const automationLogRepository = new AutomationLogRepository();
