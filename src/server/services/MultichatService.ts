/**
 * MultichatService — aggregates the WhatsApp message ledger into per-lead
 * conversations across ALL business numbers, for the unified inbox.
 *
 * Server-only (Prisma + repositories). Returns UI-ready, serialisable shapes
 * defined in the UI-safe messaging types module.
 */
import type {
  EmploymentBucket,
  MultichatConversation,
  MultichatData,
  MultichatMessage,
} from "@/features/fairtrain-funnel/messaging/types";
import { parseContactState } from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { whatsAppNumberRepository } from "../repositories/WhatsAppNumberRepository";
import { parseWhatsappStatus } from "../repositories/types";

interface Row {
  id: string;
  leadId: string;
  direction: string;
  payload: string;
  status: string;
  isDemo: boolean;
  businessPhoneNumberId: string | null;
  createdAt: Date;
}

interface LeadMeta {
  firstName: string;
  lastName: string;
  phone: string;
  assignedToId: string | null;
  assignedToUser: { name: string } | null;
  leadScore: number;
  whatsappStatus: string;
  source: string | null;
  lastWhatsappReplyAt: Date | null;
  optOut: boolean;
  contactState: string;
  automationPaused: boolean;
  lastManualContactAt: Date | null;
  tags: string[];
  employmentStatus: string;
}

const MESSAGES_PER_THREAD = 60;

/**
 * Hard safety cap on message rows loaded for the inbox. At current scale the
 * whole WhatsApp ledger is a few thousand rows, so this never truncates; it
 * only guards against a pathological future explosion. Even if it ever bit,
 * the conversation LIST stays complete (it is built from a groupBy, not from
 * these rows), so no chat silently disappears — only a very old thread's
 * message bodies would be lazy-loaded on open instead.
 */
const MAX_MESSAGE_ROWS = 20000;

/** V2 Beschäftigten-Situation tags that are all "employed" variants. */
const EMPLOYED_SITUATION_TAGS: ReadonlySet<string> = new Set([
  "befristung_kuendigung",
  "kurzarbeit_betriebskrise",
  "gesundheitliche_gruende",
  "arbeitsplatz_sicher",
]);

/**
 * One conversation → exactly one employment bucket. Classifier tags are the
 * authoritative signal (set the moment the lead answers the Statusabfrage);
 * we fall back to the stored employmentStatus, and finally to "other" so a
 * conversation is never dropped from the buckets.
 */
export function deriveEmploymentBucket(
  tags: readonly string[],
  employmentStatus: string,
): EmploymentBucket {
  if (tags.includes("arbeitssuchend")) return "job_seeking";
  if (tags.includes("beschaeftigt")) return "employed";
  if (tags.some((t) => EMPLOYED_SITUATION_TAGS.has(t))) return "employed";
  if (tags.includes("sonstige_situation")) return "other";
  switch (employmentStatus) {
    case "UNEMPLOYED":
      return "job_seeking";
    case "EMPLOYED_FULL":
    case "EMPLOYED_PART":
    case "MARGINAL":
      return "employed";
    default:
      return "other";
  }
}

const LEAD_META_SELECT = {
  firstName: true,
  lastName: true,
  phone: true,
  assignedToId: true,
  assignedToUser: { select: { name: true } },
  leadScore: true,
  whatsappStatus: true,
  source: true,
  lastWhatsappReplyAt: true,
  optOut: true,
  contactState: true,
  automationPaused: true,
  lastManualContactAt: true,
  tags: true,
  employmentStatus: true,
} as const;

export async function loadMultichat(whatsappLive: boolean): Promise<MultichatData> {
  // The conversation list is built from a groupBy — this is the single source
  // of truth for "which chats exist": exactly one entry per lead (no dupes),
  // every lead that ever exchanged a WhatsApp message (nothing missing), with
  // an authoritative total message count that never depends on how many rows
  // we later load. This is what guarantees the numbered list is complete.
  const [groups, numberRecords] = await Promise.all([
    prisma.communicationEvent.groupBy({
      by: ["leadId"],
      where: { channel: "WHATSAPP" },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    whatsAppNumberRepository.listActive(),
  ]);

  const leadIds = groups.map((g) => g.leadId);
  if (leadIds.length === 0) {
    return {
      conversations: [],
      numbers: numberRecords.map((n) => ({
        phoneNumberId: n.phoneNumberId,
        label: n.label,
        displayPhone: n.displayPhone,
      })),
      whatsappLive,
      totalConversations: 0,
      bucketCounts: { job_seeking: 0, employed: 0, other: 0 },
    };
  }

  const totalCountByLead = new Map(
    groups.map((g) => [g.leadId, g._count._all]),
  );

  const [rows, leadRows] = await Promise.all([
    prisma.communicationEvent.findMany({
      where: { channel: "WHATSAPP", leadId: { in: leadIds } },
      orderBy: { createdAt: "desc" },
      take: MAX_MESSAGE_ROWS,
      select: {
        id: true,
        leadId: true,
        direction: true,
        payload: true,
        status: true,
        isDemo: true,
        businessPhoneNumberId: true,
        createdAt: true,
      },
    }),
    prisma.lead.findMany({
      where: { id: { in: leadIds }, deletedAt: null },
      select: { id: true, ...LEAD_META_SELECT },
    }),
  ]);

  const labelByPhoneId = new Map(
    numberRecords.map((n) => [n.phoneNumberId, n.label]),
  );
  const leadById = new Map(
    (leadRows as (LeadMeta & { id: string })[]).map((l) => [l.id, l]),
  );

  // Seed one conversation per lead FIRST (from the groupBy), so a chat is
  // present even if — in the safety-cap edge case — none of its messages made
  // it into the loaded window. Soft-deleted (DSGVO-erased) leads are skipped.
  const map = new Map<string, MultichatConversation>();
  for (const g of groups) {
    const lead = leadById.get(g.leadId);
    if (!lead) continue;
    const name = `${lead.firstName} ${lead.lastName}`.trim();
    map.set(g.leadId, {
      leadId: g.leadId,
      seq: 0,
      employmentBucket: deriveEmploymentBucket(lead.tags, lead.employmentStatus),
      leadName: name || lead.phone,
      phone: lead.phone,
      assignedUserId: lead.assignedToId,
      assignedName: lead.assignedToUser?.name ?? null,
      businessPhoneNumberId: null,
      numberLabel: null,
      leadScore: lead.leadScore,
      whatsappStatus: parseWhatsappStatus(lead.whatsappStatus),
      source: lead.source,
      hasNewReply: lead.lastWhatsappReplyAt !== null,
      optOut: lead.optOut,
      contactState: parseContactState(lead.contactState),
      automationPaused: lead.automationPaused,
      lastManualContactAt: lead.lastManualContactAt?.toISOString() ?? null,
      lastAt: g._max.createdAt?.toISOString() ?? new Date(0).toISOString(),
      preview: "",
      unread: 0,
      total: totalCountByLead.get(g.leadId) ?? 0,
      messages: [],
    });
  }

  // Attach messages (rows are newest-first). Per-thread body cap only — the
  // authoritative `total` already came from the groupBy above.
  for (const r of rows as Row[]) {
    const convo = map.get(r.leadId);
    if (!convo) continue;
    if (convo.messages.length < MESSAGES_PER_THREAD) {
      convo.messages.push({
        id: r.id,
        direction: r.direction === "IN" ? "IN" : "OUT",
        body: r.payload,
        status: r.status,
        isDemo: r.isDemo,
        businessPhoneNumberId: r.businessPhoneNumberId,
        createdAt: r.createdAt.toISOString(),
      });
    }
    if (!convo.businessPhoneNumberId && r.businessPhoneNumberId) {
      convo.businessPhoneNumberId = r.businessPhoneNumberId;
      convo.numberLabel = labelByPhoneId.get(r.businessPhoneNumberId) ?? null;
    }
  }

  // Finalise: chronological messages + preview + unread (inbound after last OUT).
  const conversations: MultichatConversation[] = [];
  for (const convo of map.values()) {
    convo.messages.reverse();
    const last = convo.messages[convo.messages.length - 1];
    convo.preview = last
      ? previewOf(last.direction, last.body)
      : `${convo.total} Nachricht(en)`;
    const lastOutAt = [...convo.messages]
      .reverse()
      .find((m) => m.direction === "OUT")?.createdAt;
    convo.unread = convo.messages.filter(
      (m) => m.direction === "IN" && (!lastOutAt || m.createdAt > lastOutAt),
    ).length;
    conversations.push(convo);
  }

  conversations.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));

  // Stable running number over the COMPLETE list (#1 = newest … #N = oldest).
  const bucketCounts: Record<EmploymentBucket, number> = {
    job_seeking: 0,
    employed: 0,
    other: 0,
  };
  conversations.forEach((c, i) => {
    c.seq = i + 1;
    bucketCounts[c.employmentBucket] += 1;
  });

  return {
    conversations,
    numbers: numberRecords.map((n) => ({
      phoneNumberId: n.phoneNumberId,
      label: n.label,
      displayPhone: n.displayPhone,
    })),
    whatsappLive,
    totalConversations: conversations.length,
    bucketCounts,
  };
}

/**
 * Single-lead variant used to embed the WhatsApp thread directly in the Lead
 * Command Center (Kommunikation tab). Same shape as a conversation from
 * `loadMultichat`, but scoped to one lead and always returned (even with zero
 * messages, so the reply box is available for a first outbound).
 */
export async function loadMultichatConversationForLead(
  leadId: string,
  whatsappLive: boolean,
): Promise<{ conversation: MultichatConversation | null; whatsappLive: boolean }> {
  const [lead, rows, numberRecords] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: leadId },
      select: LEAD_META_SELECT,
    }),
    prisma.communicationEvent.findMany({
      where: { leadId, channel: "WHATSAPP" },
      orderBy: { createdAt: "desc" },
      take: MESSAGES_PER_THREAD,
      select: {
        id: true,
        direction: true,
        payload: true,
        status: true,
        isDemo: true,
        businessPhoneNumberId: true,
        createdAt: true,
      },
    }),
    whatsAppNumberRepository.listActive(),
  ]);

  if (!lead) return { conversation: null, whatsappLive };

  const labelByPhoneId = new Map(
    numberRecords.map((n) => [n.phoneNumberId, n.label]),
  );

  // rows are newest-first → reverse to chronological (oldest first) for the UI.
  const messages: MultichatMessage[] = rows
    .map((r) => ({
      id: r.id,
      direction: (r.direction === "IN" ? "IN" : "OUT") as "IN" | "OUT",
      body: r.payload,
      status: r.status,
      isDemo: r.isDemo,
      businessPhoneNumberId: r.businessPhoneNumberId,
      createdAt: r.createdAt.toISOString(),
    }))
    .reverse();

  const businessPhoneNumberId =
    rows.find((r) => r.businessPhoneNumberId)?.businessPhoneNumberId ?? null;
  const lastOutAt = [...messages]
    .reverse()
    .find((m) => m.direction === "OUT")?.createdAt;
  const unread = messages.filter(
    (m) => m.direction === "IN" && (!lastOutAt || m.createdAt > lastOutAt),
  ).length;
  const last = messages[messages.length - 1];
  const name = `${lead.firstName} ${lead.lastName}`.trim();

  const conversation: MultichatConversation = {
    leadId,
    seq: 1,
    employmentBucket: deriveEmploymentBucket(lead.tags, lead.employmentStatus),
    leadName: name || lead.phone,
    phone: lead.phone,
    assignedUserId: lead.assignedToId,
    assignedName: lead.assignedToUser?.name ?? null,
    businessPhoneNumberId,
    numberLabel: businessPhoneNumberId
      ? labelByPhoneId.get(businessPhoneNumberId) ?? null
      : null,
    leadScore: lead.leadScore,
    whatsappStatus: parseWhatsappStatus(lead.whatsappStatus),
    source: lead.source,
    hasNewReply: lead.lastWhatsappReplyAt !== null,
    optOut: lead.optOut,
    contactState: parseContactState(lead.contactState),
    automationPaused: lead.automationPaused,
    lastManualContactAt: lead.lastManualContactAt?.toISOString() ?? null,
    lastAt: last?.createdAt ?? new Date(0).toISOString(),
    preview: last ? previewOf(last.direction, last.body) : "",
    unread,
    total: messages.length,
    messages,
  };

  return { conversation, whatsappLive };
}

function previewOf(direction: "IN" | "OUT", body: string): string {
  const clean = body.replace(/\s+/g, " ").trim();
  const short = clean.length > 90 ? `${clean.slice(0, 90)}…` : clean;
  return direction === "OUT" ? `Du: ${short}` : short;
}
