/**
 * DashboardLoader — server-side data for the operative Dashboard (Operations
 * Center). Successor of the Leitstand loader.
 *
 * SCOPE RULE (hard): the Dashboard shows ONLY leads from the real application
 * process — `leadType = "neu"`. Reactivation leads, alt-leads, pure WhatsApp
 * conversations and marketing contacts (all `leadType = "alt_lead"` / campaign
 * leads) are excluded everywhere on this surface. No data is deleted — it is
 * simply not surfaced here.
 *
 * Everything below is a real DB query — no demo math, no estimates. If the DB
 * is empty, the UI shows zero.
 */
/* eslint-disable no-restricted-imports -- server-only data loader (no client code); direct DB/service access is intentional and never bundled to the client. */
import type { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/prisma";
import { auditLogRepository } from "@/server/repositories/AuditLogRepository";
import { portalDocumentRepository } from "@/server/repositories/PortalDocumentRepository";
import { statusHistoryRepository } from "@/server/repositories/StatusHistoryRepository";
import {
  aggregateWhatsAppKpis,
  type WhatsAppKpis,
} from "@/server/repositories/WhatsAppKpisQuery";

import {
  AuditAction,
  LeadStatus,
  PORTAL_DOCUMENT_LABEL,
  type PortalDocumentKind,
  type UserSummary,
} from "../../types";

/** Website application origin — the only lead type the Dashboard surfaces. */
const APPLICATION_LEAD_TYPE = "neu";

/** Non-terminal filter for "still in play" leads. */
const TERMINAL_STATUSES: ReadonlyArray<LeadStatus> = [
  LeadStatus.CLOSED,
  LeadStatus.LOST,
  LeadStatus.REJECTED,
];

/** Statuses that mean a lead has really entered the application process. */
const PROCESS_STATUSES: ReadonlyArray<LeadStatus> = [
  LeadStatus.FUNNEL_STARTED,
  LeadStatus.FUNNEL_COMPLETED,
  LeadStatus.QUALIFIED,
  LeadStatus.HOT,
  LeadStatus.BRIEFING_SENT,
  LeadStatus.DOC_PENDING,
  LeadStatus.DOC_REVIEW,
  LeadStatus.DOC_READY,
  LeadStatus.AA_APPOINTMENT_PENDING,
  LeadStatus.AA_APPOINTMENT_DONE,
  LeadStatus.GUTSCHEIN_PENDING,
  LeadStatus.GUTSCHEIN_APPROVED,
  LeadStatus.ENROLLED,
  LeadStatus.STARTED,
];

const NEW_FUNNEL_STATUSES: ReadonlyArray<LeadStatus> = [
  LeadStatus.FUNNEL_STARTED,
  LeadStatus.FUNNEL_COMPLETED,
];

const QUALIFIED_STATUSES: ReadonlyArray<LeadStatus> = [
  LeadStatus.QUALIFIED,
  LeadStatus.HOT,
];

export interface DashboardKpis {
  newFunnel: number;
  callbacksOpen: number;
  docsAwaiting: number;
  qualified: number;
}

export interface CallbackLead {
  id: string;
  name: string;
  phone: string;
  lastMessage: string | null;
  lastMessageAt: Date | null;
}

export interface DocumentUploadLead {
  leadId: string;
  leadName: string;
  pending: number;
  latestAt: Date | null;
  /** German document labels of the uploaded, not-yet-reviewed documents. */
  documents: string[];
}

export type BusinessEventTone =
  | "sky"
  | "blue"
  | "violet"
  | "amber"
  | "emerald";

export interface BusinessEvent {
  id: string;
  label: string;
  tone: BusinessEventTone;
  leadId: string | null;
  leadName: string | null;
  at: Date;
}

export interface DashboardData {
  user: UserSummary;
  hero: DashboardKpis;
  todo: {
    newFunnel: number;
    docsAwaiting: number;
    callbacks: number;
    needsHandling: number;
  };
  callbacks: ReadonlyArray<CallbackLead>;
  documents: { count: number; leads: ReadonlyArray<DocumentUploadLead> };
  /** Status distribution scoped to the real application process (leadType=neu). */
  byStatus: Record<LeadStatus, number>;
  newToday: number;
  whatsapp: WhatsAppKpis;
  timeline: ReadonlyArray<BusinessEvent>;
}

/** WhatsApp callback intent — the Rückruf-Center population. */
const CALLBACK_WHERE: Prisma.LeadWhereInput = {
  deletedAt: null,
  leadType: APPLICATION_LEAD_TYPE,
  status: { notIn: TERMINAL_STATUSES as string[] },
  OR: [{ replyIntent: "callback" }, { funnelPhase: "callback_required" }],
};

async function loadKpis(): Promise<{
  hero: DashboardKpis;
  needsHandling: number;
}> {
  const [newFunnel, callbacksOpen, docsAwaiting, qualified, needsHandling] =
    await Promise.all([
      prisma.lead.count({
        where: {
          deletedAt: null,
          leadType: APPLICATION_LEAD_TYPE,
          status: { in: NEW_FUNNEL_STATUSES as string[] },
        },
      }),
      prisma.lead.count({ where: CALLBACK_WHERE }),
      portalDocumentRepository.countAwaitingReview(),
      prisma.lead.count({
        where: {
          deletedAt: null,
          leadType: APPLICATION_LEAD_TYPE,
          status: { in: QUALIFIED_STATUSES as string[] },
        },
      }),
      prisma.lead.count({
        where: {
          deletedAt: null,
          leadType: APPLICATION_LEAD_TYPE,
          status: { in: PROCESS_STATUSES as string[] },
          OR: [{ assignedToId: null }, { needsManualReview: true }],
        },
      }),
    ]);

  return {
    hero: { newFunnel, callbacksOpen, docsAwaiting, qualified },
    needsHandling,
  };
}

async function loadCallbacks(): Promise<CallbackLead[]> {
  const rows = await prisma.lead.findMany({
    where: CALLBACK_WHERE,
    orderBy: [
      { lastInboundMessageAt: { sort: "desc", nulls: "last" } },
      { updatedAt: "desc" },
    ],
    take: 12,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      lastInboundMessage: true,
      lastInboundMessageAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: `${r.firstName} ${r.lastName}`.trim() || "Unbekannt",
    phone: r.phone,
    lastMessage: r.lastInboundMessage,
    lastMessageAt: r.lastInboundMessageAt,
  }));
}

async function loadByStatus(): Promise<{
  byStatus: Record<LeadStatus, number>;
  newToday: number;
}> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [grouped, newToday] = await Promise.all([
    prisma.lead.groupBy({
      by: ["status"],
      where: { deletedAt: null, leadType: APPLICATION_LEAD_TYPE },
      _count: { _all: true },
    }),
    prisma.lead.count({
      where: {
        deletedAt: null,
        leadType: APPLICATION_LEAD_TYPE,
        createdAt: { gte: startOfToday },
      },
    }),
  ]);
  const byStatus = {} as Record<LeadStatus, number>;
  for (const s of Object.values(LeadStatus)) byStatus[s] = 0;
  for (const g of grouped) {
    byStatus[g.status as LeadStatus] = g._count._all;
  }
  return { byStatus, newToday };
}

/** AuditLog business events → friendly labels (no technical logs surface). */
const AUDIT_EVENT_MAP: Partial<
  Record<AuditAction, { label: string; tone: BusinessEventTone }>
> = {
  [AuditAction.DOCUMENT_UPLOADED]: {
    label: "Unterlagen hochgeladen",
    tone: "violet",
  },
  [AuditAction.PORTAL_UPLOAD_ADDED]: {
    label: "Unterlagen hochgeladen",
    tone: "violet",
  },
  [AuditAction.FOLLOW_UP_SCHEDULED]: {
    label: "Rückruf angefordert",
    tone: "amber",
  },
  [AuditAction.DOCUMENT_APPROVED]: {
    label: "Dokument freigegeben",
    tone: "emerald",
  },
};

const STATUS_EVENT_MAP: Partial<
  Record<LeadStatus, { label: string; tone: BusinessEventTone }>
> = {
  [LeadStatus.FUNNEL_STARTED]: { label: "Funnel gestartet", tone: "sky" },
  [LeadStatus.FUNNEL_COMPLETED]: {
    label: "Funnel abgeschlossen",
    tone: "blue",
  },
  [LeadStatus.GUTSCHEIN_APPROVED]: {
    label: "Gutschein genehmigt",
    tone: "emerald",
  },
};

async function loadTimeline(): Promise<BusinessEvent[]> {
  const [auditEvents, transitions] = await Promise.all([
    auditLogRepository.listRecentByActions(
      Object.keys(AUDIT_EVENT_MAP) as AuditAction[],
      40,
    ),
    statusHistoryRepository.listRecentTransitionsTo(
      Object.keys(STATUS_EVENT_MAP) as LeadStatus[],
      40,
    ),
  ]);

  const raw: Array<{
    id: string;
    label: string;
    tone: BusinessEventTone;
    leadId: string | null;
    at: Date;
  }> = [];

  for (const e of auditEvents) {
    const meta = AUDIT_EVENT_MAP[e.action];
    if (!meta) continue;
    raw.push({
      id: `a:${e.id}`,
      label: meta.label,
      tone: meta.tone,
      leadId: e.entityType === "Lead" ? e.entityId : null,
      at: e.createdAt,
    });
  }
  for (const t of transitions) {
    const meta = STATUS_EVENT_MAP[t.toStatus];
    if (!meta) continue;
    raw.push({
      id: `s:${t.id}`,
      label: meta.label,
      tone: meta.tone,
      leadId: t.leadId,
      at: t.createdAt,
    });
  }

  raw.sort((a, b) => b.at.getTime() - a.at.getTime());
  const top = raw.slice(0, 14);

  // Resolve lead names in a single batch.
  const ids = Array.from(
    new Set(top.map((e) => e.leadId).filter((v): v is string => Boolean(v))),
  );
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const leads = await prisma.lead.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
    for (const l of leads) {
      names.set(l.id, `${l.firstName} ${l.lastName}`.trim() || "Unbekannt");
    }
  }

  return top.map((e) => ({
    id: e.id,
    label: e.label,
    tone: e.tone,
    leadId: e.leadId,
    leadName: e.leadId ? names.get(e.leadId) ?? null : null,
    at: e.at,
  }));
}

export async function loadDashboard(user: UserSummary): Promise<DashboardData> {
  const [{ hero, needsHandling }, callbacks, docs, statusData, whatsapp, timeline] =
    await Promise.all([
      loadKpis(),
      loadCallbacks(),
      portalDocumentRepository.listAwaitingReview(8),
      loadByStatus(),
      aggregateWhatsAppKpis(),
      loadTimeline(),
    ]);

  const documents = {
    count: hero.docsAwaiting,
    leads: docs.map((d) => ({
      leadId: d.leadId,
      leadName: d.leadName,
      pending: d.pending,
      latestAt: d.latestAt,
      documents: d.kinds.map(
        (k: PortalDocumentKind) => PORTAL_DOCUMENT_LABEL[k],
      ),
    })),
  };

  return {
    user,
    hero,
    todo: {
      newFunnel: hero.newFunnel,
      docsAwaiting: hero.docsAwaiting,
      callbacks: hero.callbacksOpen,
      needsHandling,
    },
    callbacks,
    documents,
    byStatus: statusData.byStatus,
    newToday: statusData.newToday,
    whatsapp,
    timeline,
  };
}
