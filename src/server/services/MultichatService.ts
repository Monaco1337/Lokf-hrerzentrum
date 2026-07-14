/**
 * MultichatService — aggregates the WhatsApp message ledger into per-lead
 * conversations across ALL business numbers, for the unified inbox.
 *
 * Server-only (Prisma + repositories). Returns UI-ready, serialisable shapes
 * defined in the UI-safe messaging types module.
 */
import type {
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
  lead: {
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
  } | null;
}

const MESSAGES_PER_THREAD = 60;

export async function loadMultichat(whatsappLive: boolean): Promise<MultichatData> {
  const [rows, numberRecords] = await Promise.all([
    prisma.communicationEvent.findMany({
      where: { channel: "WHATSAPP" },
      orderBy: { createdAt: "desc" },
      take: 1200,
      select: {
        id: true,
        leadId: true,
        direction: true,
        payload: true,
        status: true,
        isDemo: true,
        businessPhoneNumberId: true,
        createdAt: true,
        lead: {
          select: {
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
          },
        },
      },
    }),
    whatsAppNumberRepository.listActive(),
  ]);

  const labelByPhoneId = new Map(
    numberRecords.map((n) => [n.phoneNumberId, n.label]),
  );

  // Group rows (already newest-first) into per-lead conversations.
  const map = new Map<string, MultichatConversation>();
  for (const r of rows as Row[]) {
    if (!r.lead) continue;
    const direction = r.direction === "IN" ? "IN" : "OUT";
    const msg: MultichatMessage = {
      id: r.id,
      direction,
      body: r.payload,
      status: r.status,
      isDemo: r.isDemo,
      businessPhoneNumberId: r.businessPhoneNumberId,
      createdAt: r.createdAt.toISOString(),
    };

    let convo = map.get(r.leadId);
    if (!convo) {
      const name = `${r.lead.firstName} ${r.lead.lastName}`.trim();
      convo = {
        leadId: r.leadId,
        leadName: name || r.lead.phone,
        phone: r.lead.phone,
        assignedUserId: r.lead.assignedToId,
        assignedName: r.lead.assignedToUser?.name ?? null,
        businessPhoneNumberId: r.businessPhoneNumberId,
        numberLabel: r.businessPhoneNumberId
          ? labelByPhoneId.get(r.businessPhoneNumberId) ?? null
          : null,
        leadScore: r.lead.leadScore,
        whatsappStatus: parseWhatsappStatus(r.lead.whatsappStatus),
        source: r.lead.source,
        hasNewReply: r.lead.lastWhatsappReplyAt !== null,
        optOut: r.lead.optOut,
        contactState: parseContactState(r.lead.contactState),
        automationPaused: r.lead.automationPaused,
        lastManualContactAt: r.lead.lastManualContactAt?.toISOString() ?? null,
        lastAt: msg.createdAt,
        preview: previewOf(direction, r.payload),
        unread: 0,
        total: 0,
        messages: [],
      };
      map.set(r.leadId, convo);
    }
    convo.total += 1;
    if (convo.messages.length < MESSAGES_PER_THREAD) {
      convo.messages.push(msg);
    }
    if (!convo.businessPhoneNumberId && r.businessPhoneNumberId) {
      convo.businessPhoneNumberId = r.businessPhoneNumberId;
      convo.numberLabel = labelByPhoneId.get(r.businessPhoneNumberId) ?? null;
    }
  }

  // Finalise: chronological messages + unread count (inbound after last OUT).
  const conversations: MultichatConversation[] = [];
  for (const convo of map.values()) {
    convo.messages.reverse();
    const lastOutAt = [...convo.messages]
      .reverse()
      .find((m) => m.direction === "OUT")?.createdAt;
    convo.unread = convo.messages.filter(
      (m) => m.direction === "IN" && (!lastOutAt || m.createdAt > lastOutAt),
    ).length;
    conversations.push(convo);
  }

  conversations.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));

  return {
    conversations,
    numbers: numberRecords.map((n) => ({
      phoneNumberId: n.phoneNumberId,
      label: n.label,
      displayPhone: n.displayPhone,
    })),
    whatsappLive,
  };
}

function previewOf(direction: "IN" | "OUT", body: string): string {
  const clean = body.replace(/\s+/g, " ").trim();
  const short = clean.length > 90 ? `${clean.slice(0, 90)}…` : clean;
  return direction === "OUT" ? `Du: ${short}` : short;
}
