/**
 * CommunicationRepository — the message ledger.
 *
 * Historically append-only; it now also supports status transitions for the
 * delivery lifecycle (queued → sent → delivered → read | failed). The row is
 * the single source of truth for every WhatsApp / e-mail / internal message.
 */
import type { Prisma } from "@prisma/client";

import {
  type CommunicationChannel,
  type CommunicationDirection,
  type CommunicationEntry,
  type MessageSentByT,
  MessageSentBySchema,
  type MessageStatusChange,
  MessageStatusChangeSchema,
  type MessageStatusT,
  MessageStatusSchema,
  type MessageTypeT,
  MessageTypeSchema,
} from "@/features/fairtrain-funnel/types";
import { z } from "zod";

import { prisma } from "../db/prisma";
import {
  parseCommunicationChannel,
  parseCommunicationDirection,
} from "./types";

const StatusHistorySchema = z.array(MessageStatusChangeSchema);

function parseStatusHistory(raw: string): MessageStatusChange[] {
  try {
    return StatusHistorySchema.parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

function parseVariables(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

interface CommRow {
  id: string;
  leadId: string;
  channel: string;
  direction: string;
  payload: string;
  providerMessageId: string | null;
  errorCode: string | null;
  type: string;
  templateId: string | null;
  templateName: string | null;
  variablesResolved: string | null;
  status: string;
  statusHistory: string;
  sentBy: string;
  actorId: string | null;
  isDemo: boolean;
  sentAt: Date | null;
  deliveredAt: Date | null;
  readAt: Date | null;
  failedAt: Date | null;
  failedReason: string | null;
  businessPhoneNumberId: string | null;
  repliedAt: Date | null;
  rawWebhookPayload: string | null;
  createdAt: Date;
}

function mapRow(r: CommRow): CommunicationEntry {
  return {
    id: r.id,
    leadId: r.leadId,
    channel: parseCommunicationChannel(r.channel),
    direction: parseCommunicationDirection(r.direction),
    payload: r.payload,
    providerMessageId: r.providerMessageId,
    errorCode: r.errorCode,
    type: MessageTypeSchema.parse(r.type) as MessageTypeT,
    templateId: r.templateId,
    templateName: r.templateName,
    variablesResolved: parseVariables(r.variablesResolved),
    status: MessageStatusSchema.parse(r.status) as MessageStatusT,
    statusHistory: parseStatusHistory(r.statusHistory),
    sentBy: MessageSentBySchema.parse(r.sentBy) as MessageSentByT,
    actorId: r.actorId,
    isDemo: r.isDemo,
    sentAt: r.sentAt,
    deliveredAt: r.deliveredAt,
    readAt: r.readAt,
    failedAt: r.failedAt,
    failedReason: r.failedReason,
    businessPhoneNumberId: r.businessPhoneNumberId ?? null,
    repliedAt: r.repliedAt ?? null,
    rawWebhookPayload: r.rawWebhookPayload ?? null,
    createdAt: r.createdAt,
  };
}

export interface AppendCommunicationInput {
  leadId: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  payload: string;
  providerMessageId: string | null;
  errorCode: string | null;
  // Optional ledger metadata — defaults keep legacy call sites working.
  type?: MessageTypeT;
  templateId?: string | null;
  templateName?: string | null;
  variablesResolved?: Record<string, string> | null;
  status?: MessageStatusT;
  statusHistory?: MessageStatusChange[];
  sentBy?: MessageSentByT;
  actorId?: string | null;
  isDemo?: boolean;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  failedAt?: Date | null;
  failedReason?: string | null;
  businessPhoneNumberId?: string | null;
  rawWebhookPayload?: string | null;
}

export class CommunicationRepository {
  /** Append a message. Returns the created entry. */
  async appendEntry(
    input: AppendCommunicationInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CommunicationEntry> {
    const client = tx ?? prisma;
    const now = new Date();
    const status = input.status ?? "SENT";
    const row = await client.communicationEvent.create({
      data: {
        leadId: input.leadId,
        channel: input.channel,
        direction: input.direction,
        payload: input.payload,
        providerMessageId: input.providerMessageId,
        errorCode: input.errorCode,
        type: input.type ?? "TEXT",
        templateId: input.templateId ?? null,
        templateName: input.templateName ?? null,
        variablesResolved: input.variablesResolved
          ? JSON.stringify(input.variablesResolved)
          : null,
        status,
        statusHistory: JSON.stringify(
          input.statusHistory ?? [{ status, at: now.toISOString() }],
        ),
        sentBy: input.sentBy ?? "SYSTEM",
        actorId: input.actorId ?? null,
        isDemo: input.isDemo ?? true,
        sentAt: input.sentAt ?? null,
        deliveredAt: input.deliveredAt ?? null,
        readAt: input.readAt ?? null,
        failedAt: input.failedAt ?? null,
        failedReason: input.failedReason ?? null,
        businessPhoneNumberId: input.businessPhoneNumberId ?? null,
        rawWebhookPayload: input.rawWebhookPayload ?? null,
      },
    });
    return mapRow(row as CommRow);
  }

  /** Back-compat: legacy callers that only need fire-and-forget append. */
  async append(
    input: AppendCommunicationInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await this.appendEntry(input, tx);
  }

  async findById(id: string): Promise<CommunicationEntry | null> {
    const row = await prisma.communicationEvent.findUnique({ where: { id } });
    return row ? mapRow(row as CommRow) : null;
  }

  /** Look up a message by the provider's message id (for webhook correlation). */
  async findByProviderMessageId(
    providerMessageId: string,
  ): Promise<CommunicationEntry | null> {
    const row = await prisma.communicationEvent.findFirst({
      where: { providerMessageId },
      orderBy: { createdAt: "desc" },
    });
    return row ? mapRow(row as CommRow) : null;
  }

  /** Apply a status transition addressed by provider message id. */
  async setStatusByProviderId(
    providerMessageId: string,
    status: MessageStatusT,
    opts: {
      at?: Date;
      failedReason?: string;
      errorCode?: string;
      rawWebhookPayload?: string;
    } = {},
  ): Promise<CommunicationEntry | null> {
    const existing = await this.findByProviderMessageId(providerMessageId);
    if (!existing) return null;
    return this.setStatus(existing.id, status, opts);
  }

  async list(leadId: string): Promise<CommunicationEntry[]> {
    const rows = await prisma.communicationEvent.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => mapRow(r as CommRow));
  }

  /** Global recent messages across all leads — drives the hub. */
  async listRecent(limit = 300): Promise<CommunicationEntry[]> {
    const rows = await prisma.communicationEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => mapRow(r as CommRow));
  }

  /** Persist a new status + append to the history trail. */
  async setStatus(
    id: string,
    status: MessageStatusT,
    opts: {
      at?: Date;
      failedReason?: string;
      errorCode?: string;
      rawWebhookPayload?: string;
    } = {},
  ): Promise<CommunicationEntry | null> {
    const existing = await prisma.communicationEvent.findUnique({
      where: { id },
    });
    if (!existing) return null;
    const at = opts.at ?? new Date();
    const history = parseStatusHistory(existing.statusHistory);
    history.push({ status, at: at.toISOString() });

    const data: Prisma.CommunicationEventUpdateInput = {
      status,
      statusHistory: JSON.stringify(history),
    };
    if (status === "SENT") data.sentAt = at;
    if (status === "DELIVERED") data.deliveredAt = at;
    if (status === "READ") data.readAt = at;
    if (status === "FAILED") {
      data.failedAt = at;
      data.failedReason = opts.failedReason ?? "Zustellung fehlgeschlagen";
      // Real provider error code only — no simulated placeholder.
      if (opts.errorCode) data.errorCode = opts.errorCode;
    }
    if (opts.rawWebhookPayload !== undefined) {
      data.rawWebhookPayload = opts.rawWebhookPayload;
    }
    const row = await prisma.communicationEvent.update({ where: { id }, data });
    return mapRow(row as CommRow);
  }

  /**
   * Mark the lead's most recent OUTBOUND WhatsApp message as replied-to. Used
   * when an inbound message arrives so the thread shows which message earned the
   * reply. No-op if there is no outbound message yet.
   */
  async markLatestOutboundReplied(
    leadId: string,
    at: Date,
  ): Promise<void> {
    const row = await prisma.communicationEvent.findFirst({
      where: { leadId, channel: "WHATSAPP", direction: "OUT" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (!row) return;
    await prisma.communicationEvent.update({
      where: { id: row.id },
      data: { repliedAt: at },
    });
  }

  /**
   * The business number (`phone_number_id`) most recently used in this lead's
   * WhatsApp thread — inbound or outbound. Drives "reply from the same number".
   * Returns null if the thread has no number attribution yet.
   */
  async latestBusinessNumberForLead(leadId: string): Promise<string | null> {
    const row = await prisma.communicationEvent.findFirst({
      where: {
        leadId,
        channel: "WHATSAPP",
        businessPhoneNumberId: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: { businessPhoneNumberId: true },
    });
    return row?.businessPhoneNumberId ?? null;
  }

  async lastOutboundPerLead(
    leadIds: ReadonlyArray<string>,
  ): Promise<Map<string, Date>> {
    if (leadIds.length === 0) return new Map();
    const rows = await prisma.communicationEvent.groupBy({
      by: ["leadId"],
      where: {
        leadId: { in: [...leadIds] },
        direction: "OUT",
      },
      _max: { createdAt: true },
    });
    const result = new Map<string, Date>();
    for (const row of rows) {
      if (row._max.createdAt) {
        result.set(row.leadId, row._max.createdAt);
      }
    }
    return result;
  }
}

export const communicationRepository = new CommunicationRepository();
