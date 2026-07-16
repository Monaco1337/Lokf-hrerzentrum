/**
 * MultichatService — aggregates the WhatsApp message ledger into per-lead
 * conversations across ALL business numbers, for the unified inbox.
 *
 * Server-only (Prisma + repositories). Returns UI-ready, serialisable shapes
 * defined in the UI-safe messaging types module.
 */
import { REACTIVATION_CAMPAIGN_KEY } from "@/features/fairtrain-funnel/campaign/types";
import {
  ContactState,
  isWaitingContactState,
  parseContactState,
} from "@/features/fairtrain-funnel/contactState";
import {
  FUNNEL_PHASE_LABEL,
  FUNNEL_PHASE_RANK,
  FunnelPhase,
  parseFunnelPhase,
} from "@/features/fairtrain-funnel/funnelPhase";
import type {
  EmploymentBucket,
  MultichatConversation,
  MultichatData,
  MultichatMessage,
  MultichatTemplateOption,
  ReactivationStats,
  WorkStatus,
} from "@/features/fairtrain-funnel/messaging/types";

import { prisma } from "../db/prisma";
import { automationTemplateRepository } from "../repositories/AutomationTemplateRepository";
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
  email: string;
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
  lastInboundMessageAt: Date | null;
  tags: string[];
  employmentStatus: string;
  leadType: string;
  funnelPhase: string;
  nextFollowUpAt: Date | null;
  callbackRequestedAt: Date | null;
  callbackHandledAt: Date | null;
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
  email: true,
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
  lastInboundMessageAt: true,
  tags: true,
  employmentStatus: true,
  leadType: true,
  funnelPhase: true,
  nextFollowUpAt: true,
  callbackRequestedAt: true,
  callbackHandledAt: true,
} as const;

/**
 * Single "Bearbeitungsstatus" per chat, derived from real signals only.
 * Priority order (highest first): an unhandled inbound always wins because it
 * needs action; terminal states (kein Interesse / erledigt) next; then the
 * scheduled states.
 */
export function deriveWorkStatus(lead: {
  lastWhatsappReplyAt: Date | null;
  optOut: boolean;
  contactState: string;
  callbackRequestedAt: Date | null;
  callbackHandledAt: Date | null;
  nextFollowUpAt: Date | null;
}): WorkStatus {
  if (lead.lastWhatsappReplyAt) return "new_reply";
  const state = parseContactState(lead.contactState);
  if (lead.optOut || state === ContactState.NO_INTEREST) return "no_interest";
  if (state === ContactState.CONVERSATION_COMPLETED) return "done";
  if (
    (lead.callbackRequestedAt && !lead.callbackHandledAt) ||
    state === ContactState.MANUALLY_CONTACTED
  ) {
    return "callback";
  }
  if (lead.nextFollowUpAt) return "followup";
  if (isWaitingContactState(state)) return "waiting";
  return "open";
}

function emptyWorkStatusCounts(): Record<WorkStatus, number> {
  return {
    new_reply: 0,
    callback: 0,
    waiting: 0,
    followup: 0,
    no_interest: 0,
    done: 0,
    open: 0,
  };
}

export async function loadMultichat(whatsappLive: boolean): Promise<MultichatData> {
  // The conversation list is built from a groupBy — this is the single source
  // of truth for "which chats exist": exactly one entry per lead (no dupes),
  // every lead that ever exchanged a WhatsApp message (nothing missing), with
  // an authoritative total message count that never depends on how many rows
  // we later load. This is what guarantees the numbered list is complete.
  const [groups, numberRecords, reactivationStats, templates] =
    await Promise.all([
      prisma.communicationEvent.groupBy({
        by: ["leadId"],
        where: { channel: "WHATSAPP" },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      whatsAppNumberRepository.listActive(),
      loadReactivationStats(),
      loadWhatsappTemplateOptions(),
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
      workStatusCounts: emptyWorkStatusCounts(),
      reactivationStats,
      templates,
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
      workStatus: deriveWorkStatus(lead),
      leadType: lead.leadType,
      funnelPhase: lead.funnelPhase,
      funnelPhaseLabel: FUNNEL_PHASE_LABEL[parseFunnelPhase(lead.funnelPhase)],
      callbackRequestedAt: lead.callbackRequestedAt?.toISOString() ?? null,
      followUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
      lastInboundAt: lead.lastInboundMessageAt?.toISOString() ?? null,
      email: lead.email,
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
  const workStatusCounts = emptyWorkStatusCounts();
  conversations.forEach((c, i) => {
    c.seq = i + 1;
    bucketCounts[c.employmentBucket] += 1;
    workStatusCounts[c.workStatus] += 1;
  });

  return {
    conversations,
    workStatusCounts,
    reactivationStats,
    templates,
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
    workStatus: deriveWorkStatus(lead),
    leadType: lead.leadType,
    funnelPhase: lead.funnelPhase,
    funnelPhaseLabel: FUNNEL_PHASE_LABEL[parseFunnelPhase(lead.funnelPhase)],
    callbackRequestedAt: lead.callbackRequestedAt?.toISOString() ?? null,
    followUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    lastInboundAt: lead.lastInboundMessageAt?.toISOString() ?? null,
    email: lead.email,
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

/** Funnel phases that count as "Eignungscheck gestartet" (linear progression). */
const ELIGIBILITY_STARTED_PHASES: FunnelPhase[] = [
  FunnelPhase.WAITING_ELIGIBILITY,
  FunnelPhase.ELIGIBILITY_STARTED,
  FunnelPhase.ELIGIBILITY_COMPLETED,
  FunnelPhase.WAITING_DOCUMENTS,
  FunnelPhase.DOCUMENTS_RECEIVED,
  FunnelPhase.WAITING_APPOINTMENT,
  FunnelPhase.APPOINTMENT_SCHEDULED,
  FunnelPhase.QUALIFIED,
  FunnelPhase.COMPLETED,
];

/** Funnel phases that count as a completed application (Eignungscheck done+). */
const APPLICATION_DONE_PHASES: FunnelPhase[] = ELIGIBILITY_STARTED_PHASES.filter(
  (p) => FUNNEL_PHASE_RANK[p] >= FUNNEL_PHASE_RANK[FunnelPhase.ELIGIBILITY_COMPLETED],
);

/**
 * Live reactivation funnel counters. The cohort is every lead that came from
 * the reactivation import — still `alt_lead` (source == REACTIVATION_CAMPAIGN_KEY)
 * OR already converted to a normal funnel lead (tag "reaktiviert", set on
 * conversion because the funnel submission overwrites `source`).
 */
export async function loadReactivationStats(): Promise<ReactivationStats> {
  const cohortOr = [
    { source: REACTIVATION_CAMPAIGN_KEY },
    { tags: { has: "reaktiviert" } },
  ];
  const cohort = (extra?: Record<string, unknown>) => ({
    deletedAt: null,
    ...(extra ? { AND: [{ OR: cohortOr }, extra] } : { OR: cohortOr }),
  });

  const [
    imported,
    contacted,
    replied,
    unread,
    waitingCallback,
    eligibilityStarted,
    applicationsCompleted,
  ] = await Promise.all([
    prisma.lead.count({ where: cohort() }),
    prisma.lead.count({
      where: cohort({
        OR: [
          { communicationStarted: true },
          { firstContactSentAt: { not: null } },
        ],
      }),
    }),
    prisma.lead.count({ where: cohort({ lastInboundMessageAt: { not: null } }) }),
    prisma.lead.count({ where: cohort({ lastWhatsappReplyAt: { not: null } }) }),
    prisma.lead.count({
      where: cohort({ callbackRequestedAt: { not: null }, callbackHandledAt: null }),
    }),
    prisma.lead.count({
      where: cohort({
        OR: [
          { leadType: "neu" },
          { funnelPhase: { in: ELIGIBILITY_STARTED_PHASES } },
        ],
      }),
    }),
    prisma.lead.count({
      where: cohort({ funnelPhase: { in: APPLICATION_DONE_PHASES } }),
    }),
  ]);

  return {
    imported,
    contacted,
    replied,
    unread,
    waitingCallback,
    eligibilityStarted,
    applicationsCompleted,
  };
}

/** Active WhatsApp templates for the inline template picker (id/name/category). */
export async function loadWhatsappTemplateOptions(): Promise<
  MultichatTemplateOption[]
> {
  const all = await automationTemplateRepository.list();
  return all
    .filter((t) => t.channel === "WHATSAPP" && t.status === "active")
    .map((t) => ({ id: t.id, name: t.name, category: t.category }));
}
