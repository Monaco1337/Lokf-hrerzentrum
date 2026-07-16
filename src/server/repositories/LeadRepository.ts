/**
 * LeadRepository - the only place that touches the `Lead` table via Prisma.
 *
 * Services must not import the Prisma client directly. All queries flow through
 * this repository, which validates enum-shaped strings via zod on read and
 * accepts strongly-typed enum unions on write.
 *
 * Sensitive data lives in `SensitiveAnswersRepository` and is never joined here.
 */
import type { Lead as PrismaLead, Prisma } from "@prisma/client";

import {
  CONTACT_BLOCKING_STATES,
  type ContactState,
  type EmploymentStatus,
  type FunnelPath,
  type FunnelPhase,
  parseFunnelPhase,
  type LeadDetail,
  type LeadFilters,
  type LeadKpis,
  type LeadPriority,
  type LeadQualityStatus,
  LeadStatus,
  type LeadSummary,
  parseContactState,
  type PreferredLocation,
  type WhatsappReachability,
  type WhatsappTrackingStatus,
} from "@/features/fairtrain-funnel/types";

import type { ReactivationCohortRow } from "@/features/fairtrain-funnel/campaign/reactivationLeadList";

import { prisma } from "../db/prisma";
import { aggregateLeadKpis } from "./LeadKpisQuery";
import {
  parseEmploymentStatus,
  parseFunnelPath,
  parseLeadPriority,
  parseLeadQuality,
  parseLeadStatus,
  parsePreferredLocation,
  parseWhatsappReachability,
  parseWhatsappStatus,
} from "./types";
import { rowToUserRef } from "./UserRepository";

/** Prisma row enriched with the optional assignee join. */
type LeadRowWithAssignee = PrismaLead & {
  assignedToUser?: {
    id: string;
    name: string;
    role: string;
    avatar: string | null;
  } | null;
};

const ASSIGNEE_INCLUDE = {
  assignedToUser: {
    select: { id: true, name: true, role: true, avatar: true },
  },
} as const satisfies Prisma.LeadInclude;

export interface CreateLeadInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string | null;
  funnelPath: FunnelPath;
  employmentStatus: EmploymentStatus;
  preferredLocation: PreferredLocation;
  acceptsShiftWork: boolean;
  motivationText: string | null;
  score: number;
  priority: LeadPriority;
  status: LeadStatus;
  source: string | null;
  utm: string | null;
  assignedTo: string | null;
  // extended person data
  birthDate?: Date | null;
  birthPlace?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  addressCity?: string | null;
  nationality?: string | null;
  // agency
  agencyCity?: string | null;
  agencyCustomerNumber?: string | null;
  agencyCaseWorker?: string | null;
  // cv / interview
  unemployedSince?: string | null;
  careerHistory?: string | null;
  schoolEducation?: string | null;
  graduationYear?: string | null;
  languages?: string | null;
  computerSkills?: string | null;
  interests?: string | null;
  // K.O. snapshot
  acceptsTravelHotel?: boolean | null;
  acceptsPsychLoad?: boolean | null;
  hasNoKbaDrugEntries?: boolean | null;
  // Reactivation campaign layer (additive).
  leadType?: string | undefined;
  campaign?: string | null | undefined;
  campaignStatus?: string | null | undefined;
  campaignStep?: number | undefined;
  communicationStarted?: boolean | undefined;
  firstContactSentAt?: Date | null | undefined;
  automationPaused?: boolean | undefined;
  campaignCompleted?: boolean | undefined;
  employmentSnapshot?: string | null | undefined;
  nextCampaignActionAt?: Date | null | undefined;
  /** Process step (separate from `status`) — set at creation when known. */
  funnelPhase?: FunnelPhase | undefined;
}

export interface UpdateLeadFields {
  status?: LeadStatus;
  priority?: LeadPriority;
  score?: number;
  assignedTo?: string | null;
  assignedToId?: string | null;
  assignedById?: string | null;
  assignedAt?: Date | null;
  slaBreachedAt?: Date | null;
  nextFollowUpAt?: Date | null;
  // Editable core contact fields (CRM operator edits via the lead edit modal).
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string | null;
  source?: string | null;
  employmentStatus?: EmploymentStatus;
  // Applicant self-service portal fields.
  availability?: string | null;
  agencyStatus?: string | null;
  hasEducationVoucher?: boolean | null;
  hasDrivingLicense?: boolean | null;
  /** Soft archive: hides the lead from active lists without deleting data. */
  deletedAt?: Date | null;
  // WhatsApp status tracking (written by the classifier / webhook pipeline).
  whatsappStatus?: WhatsappTrackingStatus;
  whatsappReachability?: WhatsappReachability;
  leadQualityStatus?: LeadQualityStatus;
  leadScore?: number;
  lastWhatsappMessageAt?: Date | null;
  lastWhatsappDeliveredAt?: Date | null;
  lastWhatsappReadAt?: Date | null;
  lastWhatsappReplyAt?: Date | null;
  lastWhatsappErrorAt?: Date | null;
  lastWhatsappErrorReason?: string | null;
  lastInboundMessage?: string | null;
  lastInboundMessageAt?: Date | null;
  // WhatsApp opt-out.
  optOut?: boolean;
  optOutAt?: Date | null;
  whatsappMarketing?: boolean;
  tags?: string[];
  // Contact protection (handling lifecycle).
  contactState?: ContactState;
  reactivationExcluded?: boolean;
  lastManualContactAt?: Date | null;
  lastManualContactBy?: string | null;
  lastManualContactChannel?: string | null;
  // Funnel-Phase (process step; separate from `status`).
  funnelPhase?: FunnelPhase;
  // AI reply analysis.
  replyInterest?: string | null;
  replyIntent?: string | null;
  replyConfidence?: number | null;
  needsManualReview?: boolean;
  // Reactivation campaign layer (additive).
  leadType?: string;
  campaign?: string | null;
  campaignStatus?: string | null;
  campaignStep?: number;
  communicationStarted?: boolean;
  firstContactSentAt?: Date | null;
  automationPaused?: boolean;
  campaignCompleted?: boolean;
  employmentSnapshot?: string | null;
  nextCampaignActionAt?: Date | null;
  // Alt-Lead callback requests (see CallbackRequestService).
  callbackRequestedAt?: Date | null;
  callbackHandledAt?: Date | null;
  // Funnel submission fields — writable so an Alt-Lead that completes the
  // public Eignungscheck can be converted IN PLACE (see LeadService.submit)
  // instead of creating a duplicate lead.
  funnelPath?: FunnelPath;
  preferredLocation?: PreferredLocation;
  acceptsShiftWork?: boolean;
  motivationText?: string | null;
  birthDate?: Date | null;
  birthPlace?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  addressCity?: string | null;
  nationality?: string | null;
  agencyCity?: string | null;
  agencyCustomerNumber?: string | null;
  agencyCaseWorker?: string | null;
  unemployedSince?: string | null;
  careerHistory?: string | null;
  schoolEducation?: string | null;
  graduationYear?: string | null;
  languages?: string | null;
  computerSkills?: string | null;
  interests?: string | null;
  acceptsTravelHotel?: boolean | null;
  acceptsPsychLoad?: boolean | null;
  hasNoKbaDrugEntries?: boolean | null;
  utm?: string | null;
}

function rowToSummary(row: LeadRowWithAssignee): LeadSummary {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    city: row.city,
    funnelPath: parseFunnelPath(row.funnelPath),
    employmentStatus: parseEmploymentStatus(row.employmentStatus),
    preferredLocation: parsePreferredLocation(row.preferredLocation),
    acceptsShiftWork: row.acceptsShiftWork,
    score: row.score,
    priority: parseLeadPriority(row.priority),
    status: parseLeadStatus(row.status),
    slaBreachedAt: row.slaBreachedAt,
    nextFollowUpAt: row.nextFollowUpAt,
    assignedTo: row.assignedTo,
    assignedToId: row.assignedToId,
    assignedToUser: row.assignedToUser ? rowToUserRef(row.assignedToUser) : null,
    assignedAt: row.assignedAt,
    source: row.source,
    whatsappStatus: parseWhatsappStatus(row.whatsappStatus),
    whatsappReachability: parseWhatsappReachability(row.whatsappReachability),
    leadQualityStatus: parseLeadQuality(row.leadQualityStatus),
    leadScore: row.leadScore,
    lastWhatsappMessageAt: row.lastWhatsappMessageAt,
    lastWhatsappDeliveredAt: row.lastWhatsappDeliveredAt,
    lastWhatsappReadAt: row.lastWhatsappReadAt,
    lastWhatsappReplyAt: row.lastWhatsappReplyAt,
    lastWhatsappErrorAt: row.lastWhatsappErrorAt,
    lastWhatsappErrorReason: row.lastWhatsappErrorReason,
    lastInboundMessage: row.lastInboundMessage,
    lastInboundMessageAt: row.lastInboundMessageAt,
    optOut: row.optOut,
    optOutAt: row.optOutAt,
    whatsappMarketing: row.whatsappMarketing,
    tags: row.tags ?? [],
    contactState: parseContactState(row.contactState),
    reactivationExcluded: row.reactivationExcluded,
    lastManualContactAt: row.lastManualContactAt,
    lastManualContactBy: row.lastManualContactBy,
    lastManualContactChannel: row.lastManualContactChannel,
    funnelPhase: parseFunnelPhase(row.funnelPhase),
    replyInterest: row.replyInterest,
    replyIntent: row.replyIntent,
    replyConfidence: row.replyConfidence,
    needsManualReview: row.needsManualReview,
    leadType: row.leadType,
    campaign: row.campaign,
    campaignStatus: row.campaignStatus,
    campaignStep: row.campaignStep,
    communicationStarted: row.communicationStarted,
    firstContactSentAt: row.firstContactSentAt,
    automationPaused: row.automationPaused,
    campaignCompleted: row.campaignCompleted,
    employmentSnapshot: row.employmentSnapshot,
    nextCampaignActionAt: row.nextCampaignActionAt,
    callbackRequestedAt: row.callbackRequestedAt,
    callbackHandledAt: row.callbackHandledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToDetail(row: LeadRowWithAssignee): LeadDetail {
  return {
    ...rowToSummary(row),
    motivationText: row.motivationText,
    utm: row.utm,
    birthDate: row.birthDate,
    birthPlace: row.birthPlace,
    street: row.street,
    houseNumber: row.houseNumber,
    postalCode: row.postalCode,
    addressCity: row.addressCity,
    nationality: row.nationality,
    agencyCity: row.agencyCity,
    agencyCustomerNumber: row.agencyCustomerNumber,
    agencyCaseWorker: row.agencyCaseWorker,
    unemployedSince: row.unemployedSince,
    careerHistory: row.careerHistory,
    schoolEducation: row.schoolEducation,
    graduationYear: row.graduationYear,
    languages: row.languages,
    computerSkills: row.computerSkills,
    interests: row.interests,
    acceptsTravelHotel: row.acceptsTravelHotel,
    acceptsPsychLoad: row.acceptsPsychLoad,
    hasNoKbaDrugEntries: row.hasNoKbaDrugEntries,
    availability: row.availability,
    agencyStatus: row.agencyStatus,
    hasEducationVoucher: row.hasEducationVoucher,
    hasDrivingLicense: row.hasDrivingLicense,
  };
}

export class LeadRepository {
  async create(
    input: CreateLeadInput,
    tx?: Prisma.TransactionClient,
  ): Promise<LeadSummary> {
    const client = tx ?? prisma;
    const row = await client.lead.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        city: input.city,
        funnelPath: input.funnelPath,
        employmentStatus: input.employmentStatus,
        preferredLocation: input.preferredLocation,
        acceptsShiftWork: input.acceptsShiftWork,
        motivationText: input.motivationText,
        score: input.score,
        priority: input.priority,
        status: input.status,
        source: input.source,
        utm: input.utm,
        assignedTo: input.assignedTo,
        birthDate: input.birthDate ?? null,
        birthPlace: input.birthPlace ?? null,
        street: input.street ?? null,
        houseNumber: input.houseNumber ?? null,
        postalCode: input.postalCode ?? null,
        addressCity: input.addressCity ?? null,
        nationality: input.nationality ?? null,
        agencyCity: input.agencyCity ?? null,
        agencyCustomerNumber: input.agencyCustomerNumber ?? null,
        agencyCaseWorker: input.agencyCaseWorker ?? null,
        unemployedSince: input.unemployedSince ?? null,
        careerHistory: input.careerHistory ?? null,
        schoolEducation: input.schoolEducation ?? null,
        graduationYear: input.graduationYear ?? null,
        languages: input.languages ?? null,
        computerSkills: input.computerSkills ?? null,
        interests: input.interests ?? null,
        acceptsTravelHotel: input.acceptsTravelHotel ?? null,
        acceptsPsychLoad: input.acceptsPsychLoad ?? null,
        hasNoKbaDrugEntries: input.hasNoKbaDrugEntries ?? null,
        ...(input.leadType !== undefined ? { leadType: input.leadType } : {}),
        ...(input.campaign !== undefined ? { campaign: input.campaign } : {}),
        ...(input.campaignStatus !== undefined
          ? { campaignStatus: input.campaignStatus }
          : {}),
        ...(input.campaignStep !== undefined
          ? { campaignStep: input.campaignStep }
          : {}),
        ...(input.communicationStarted !== undefined
          ? { communicationStarted: input.communicationStarted }
          : {}),
        ...(input.firstContactSentAt !== undefined
          ? { firstContactSentAt: input.firstContactSentAt }
          : {}),
        ...(input.automationPaused !== undefined
          ? { automationPaused: input.automationPaused }
          : {}),
        ...(input.campaignCompleted !== undefined
          ? { campaignCompleted: input.campaignCompleted }
          : {}),
        ...(input.employmentSnapshot !== undefined
          ? { employmentSnapshot: input.employmentSnapshot }
          : {}),
        ...(input.nextCampaignActionAt !== undefined
          ? { nextCampaignActionAt: input.nextCampaignActionAt }
          : {}),
        ...(input.funnelPhase !== undefined
          ? { funnelPhase: input.funnelPhase }
          : {}),
      },
    });
    return rowToSummary(row);
  }

  async findById(id: string): Promise<LeadDetail | null> {
    const row = await prisma.lead.findFirst({
      where: { id, deletedAt: null },
      include: ASSIGNEE_INCLUDE,
    });
    return row ? rowToDetail(row as LeadRowWithAssignee) : null;
  }

  async findByEmail(email: string): Promise<LeadSummary | null> {
    const row = await prisma.lead.findFirst({
      where: { email, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: ASSIGNEE_INCLUDE,
    });
    return row ? rowToSummary(row as LeadRowWithAssignee) : null;
  }

  /**
   * Best-effort lookup by phone number for inbound WhatsApp webhooks. Stored
   * numbers may contain spaces / country-code formatting, so we compare on the
   * digit-only tail (last 8 digits) rather than an exact string match.
   */
  async findByPhone(phone: string): Promise<LeadSummary | null> {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) return null;
    const tail = digits.slice(-8);

    const candidates = await prisma.lead.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: ASSIGNEE_INCLUDE,
      take: 2000,
    });
    const match = candidates.find((c) =>
      (c.phone ?? "").replace(/\D/g, "").endsWith(tail),
    );
    return match ? rowToSummary(match as LeadRowWithAssignee) : null;
  }

  async update(
    id: string,
    fields: UpdateLeadFields,
    tx?: Prisma.TransactionClient,
  ): Promise<LeadSummary> {
    const client = tx ?? prisma;
    const data: Prisma.LeadUpdateInput = {};
    if (fields.status !== undefined) data.status = fields.status;
    if (fields.priority !== undefined) data.priority = fields.priority;
    if (fields.score !== undefined) data.score = fields.score;
    if (fields.assignedTo !== undefined) data.assignedTo = fields.assignedTo;
    if (fields.assignedToId !== undefined) {
      data.assignedToUser = fields.assignedToId
        ? { connect: { id: fields.assignedToId } }
        : { disconnect: true };
    }
    if (fields.assignedById !== undefined) data.assignedById = fields.assignedById;
    if (fields.assignedAt !== undefined) data.assignedAt = fields.assignedAt;
    if (fields.slaBreachedAt !== undefined)
      data.slaBreachedAt = fields.slaBreachedAt;
    if (fields.nextFollowUpAt !== undefined)
      data.nextFollowUpAt = fields.nextFollowUpAt;
    if (fields.firstName !== undefined) data.firstName = fields.firstName;
    if (fields.lastName !== undefined) data.lastName = fields.lastName;
    if (fields.email !== undefined) data.email = fields.email;
    if (fields.phone !== undefined) data.phone = fields.phone;
    if (fields.city !== undefined) data.city = fields.city;
    if (fields.source !== undefined) data.source = fields.source;
    if (fields.employmentStatus !== undefined)
      data.employmentStatus = fields.employmentStatus;
    if (fields.availability !== undefined) data.availability = fields.availability;
    if (fields.agencyStatus !== undefined) data.agencyStatus = fields.agencyStatus;
    if (fields.hasEducationVoucher !== undefined)
      data.hasEducationVoucher = fields.hasEducationVoucher;
    if (fields.hasDrivingLicense !== undefined)
      data.hasDrivingLicense = fields.hasDrivingLicense;
    if (fields.deletedAt !== undefined) data.deletedAt = fields.deletedAt;
    if (fields.whatsappStatus !== undefined)
      data.whatsappStatus = fields.whatsappStatus;
    if (fields.whatsappReachability !== undefined)
      data.whatsappReachability = fields.whatsappReachability;
    if (fields.leadQualityStatus !== undefined)
      data.leadQualityStatus = fields.leadQualityStatus;
    if (fields.leadScore !== undefined) data.leadScore = fields.leadScore;
    if (fields.lastWhatsappMessageAt !== undefined)
      data.lastWhatsappMessageAt = fields.lastWhatsappMessageAt;
    if (fields.lastWhatsappDeliveredAt !== undefined)
      data.lastWhatsappDeliveredAt = fields.lastWhatsappDeliveredAt;
    if (fields.lastWhatsappReadAt !== undefined)
      data.lastWhatsappReadAt = fields.lastWhatsappReadAt;
    if (fields.lastWhatsappReplyAt !== undefined)
      data.lastWhatsappReplyAt = fields.lastWhatsappReplyAt;
    if (fields.lastWhatsappErrorAt !== undefined)
      data.lastWhatsappErrorAt = fields.lastWhatsappErrorAt;
    if (fields.lastWhatsappErrorReason !== undefined)
      data.lastWhatsappErrorReason = fields.lastWhatsappErrorReason;
    if (fields.lastInboundMessage !== undefined)
      data.lastInboundMessage = fields.lastInboundMessage;
    if (fields.lastInboundMessageAt !== undefined)
      data.lastInboundMessageAt = fields.lastInboundMessageAt;
    if (fields.optOut !== undefined) data.optOut = fields.optOut;
    if (fields.optOutAt !== undefined) data.optOutAt = fields.optOutAt;
    if (fields.whatsappMarketing !== undefined)
      data.whatsappMarketing = fields.whatsappMarketing;
    if (fields.tags !== undefined) data.tags = { set: fields.tags };
    if (fields.contactState !== undefined)
      data.contactState = fields.contactState;
    if (fields.reactivationExcluded !== undefined)
      data.reactivationExcluded = fields.reactivationExcluded;
    if (fields.lastManualContactAt !== undefined)
      data.lastManualContactAt = fields.lastManualContactAt;
    if (fields.lastManualContactBy !== undefined)
      data.lastManualContactBy = fields.lastManualContactBy;
    if (fields.lastManualContactChannel !== undefined)
      data.lastManualContactChannel = fields.lastManualContactChannel;
    if (fields.funnelPhase !== undefined) data.funnelPhase = fields.funnelPhase;
    if (fields.replyInterest !== undefined)
      data.replyInterest = fields.replyInterest;
    if (fields.replyIntent !== undefined) data.replyIntent = fields.replyIntent;
    if (fields.replyConfidence !== undefined)
      data.replyConfidence = fields.replyConfidence;
    if (fields.needsManualReview !== undefined)
      data.needsManualReview = fields.needsManualReview;
    if (fields.leadType !== undefined) data.leadType = fields.leadType;
    if (fields.campaign !== undefined) data.campaign = fields.campaign;
    if (fields.campaignStatus !== undefined)
      data.campaignStatus = fields.campaignStatus;
    if (fields.campaignStep !== undefined)
      data.campaignStep = fields.campaignStep;
    if (fields.communicationStarted !== undefined)
      data.communicationStarted = fields.communicationStarted;
    if (fields.firstContactSentAt !== undefined)
      data.firstContactSentAt = fields.firstContactSentAt;
    if (fields.automationPaused !== undefined)
      data.automationPaused = fields.automationPaused;
    if (fields.campaignCompleted !== undefined)
      data.campaignCompleted = fields.campaignCompleted;
    if (fields.employmentSnapshot !== undefined)
      data.employmentSnapshot = fields.employmentSnapshot;
    if (fields.nextCampaignActionAt !== undefined)
      data.nextCampaignActionAt = fields.nextCampaignActionAt;
    if (fields.callbackRequestedAt !== undefined)
      data.callbackRequestedAt = fields.callbackRequestedAt;
    if (fields.callbackHandledAt !== undefined)
      data.callbackHandledAt = fields.callbackHandledAt;
    if (fields.funnelPath !== undefined) data.funnelPath = fields.funnelPath;
    if (fields.preferredLocation !== undefined)
      data.preferredLocation = fields.preferredLocation;
    if (fields.acceptsShiftWork !== undefined)
      data.acceptsShiftWork = fields.acceptsShiftWork;
    if (fields.motivationText !== undefined)
      data.motivationText = fields.motivationText;
    if (fields.birthDate !== undefined) data.birthDate = fields.birthDate;
    if (fields.birthPlace !== undefined) data.birthPlace = fields.birthPlace;
    if (fields.street !== undefined) data.street = fields.street;
    if (fields.houseNumber !== undefined) data.houseNumber = fields.houseNumber;
    if (fields.postalCode !== undefined) data.postalCode = fields.postalCode;
    if (fields.addressCity !== undefined) data.addressCity = fields.addressCity;
    if (fields.nationality !== undefined) data.nationality = fields.nationality;
    if (fields.agencyCity !== undefined) data.agencyCity = fields.agencyCity;
    if (fields.agencyCustomerNumber !== undefined)
      data.agencyCustomerNumber = fields.agencyCustomerNumber;
    if (fields.agencyCaseWorker !== undefined)
      data.agencyCaseWorker = fields.agencyCaseWorker;
    if (fields.unemployedSince !== undefined)
      data.unemployedSince = fields.unemployedSince;
    if (fields.careerHistory !== undefined)
      data.careerHistory = fields.careerHistory;
    if (fields.schoolEducation !== undefined)
      data.schoolEducation = fields.schoolEducation;
    if (fields.graduationYear !== undefined)
      data.graduationYear = fields.graduationYear;
    if (fields.languages !== undefined) data.languages = fields.languages;
    if (fields.computerSkills !== undefined)
      data.computerSkills = fields.computerSkills;
    if (fields.interests !== undefined) data.interests = fields.interests;
    if (fields.acceptsTravelHotel !== undefined)
      data.acceptsTravelHotel = fields.acceptsTravelHotel;
    if (fields.acceptsPsychLoad !== undefined)
      data.acceptsPsychLoad = fields.acceptsPsychLoad;
    if (fields.hasNoKbaDrugEntries !== undefined)
      data.hasNoKbaDrugEntries = fields.hasNoKbaDrugEntries;
    if (fields.utm !== undefined) data.utm = fields.utm;

    const row = await client.lead.update({
      where: { id },
      data,
      include: ASSIGNEE_INCLUDE,
    });
    return rowToSummary(row as LeadRowWithAssignee);
  }

  /**
   * Permanent, irreversible delete. All related rows (status history, notes,
   * consents, eligibility answers, documents, communications, automation logs,
   * uploaded-file rows) are removed via onDelete: Cascade in the schema.
   */
  async hardDelete(id: string): Promise<void> {
    await prisma.lead.delete({ where: { id } });
  }

  /**
   * IDs of leads that were provably contacted via WhatsApp (or that replied)
   * yet are still stuck in a pre-contact pipeline status. Used to reconcile
   * historical data so the Leitstand stops showing leads as "offen" after they
   * were actually messaged. Returns ids only — the caller advances each via the
   * status machine (which enforces legality + history).
   */
  async idsNeedingContactReconcile(limit = 5000): Promise<string[]> {
    const rows = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [
            LeadStatus.NEW,
            LeadStatus.QUALIFIED,
            LeadStatus.HOT,
            LeadStatus.CONTACT_PENDING,
          ] as string[],
        },
        OR: [
          { lastWhatsappMessageAt: { not: null } },
          { lastWhatsappReplyAt: { not: null } },
          { firstContactSentAt: { not: null } },
          { communicationStarted: true },
          {
            whatsappStatus: {
              in: ["gesendet", "zugestellt", "gelesen", "beantwortet"],
            },
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
      take: limit,
    });
    return rows.map((r) => r.id);
  }

  /**
   * IDs of leads that have replied on WhatsApp (reply timestamp, "beantwortet"
   * status, or a stored inbound message). Used by the retro/backfill run to
   * find every reply that may still need classification. Opted-out leads are
   * excluded — they are never re-engaged. Ordered newest-reply first.
   */
  async idsWithWhatsappReply(limit = 5000): Promise<string[]> {
    const rows = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        optOut: false,
        OR: [
          { lastWhatsappReplyAt: { not: null } },
          { whatsappStatus: "beantwortet" },
          { lastInboundMessage: { not: null } },
        ],
      },
      orderBy: { lastWhatsappReplyAt: "desc" },
      select: { id: true },
      take: limit,
    });
    return rows.map((r) => r.id);
  }

  /**
   * One-time reactivation reprocessing set: reactivation (alt-lead / campaign)
   * chats that ALREADY have a lead reply, EXCLUDING opted-out leads and every
   * chat a human already handled or that is completed (Kontaktschutz:
   * reactivationExcluded / campaignCompleted / manueller Kontakt / blockierender
   * contactState). Ordered newest-reply first.
   */
  async idsForReactivationReprocessing(limit = 5000): Promise<string[]> {
    const rows = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        optOut: false,
        reactivationExcluded: false,
        campaignCompleted: false,
        lastManualContactAt: null,
        contactState: { notIn: Array.from(CONTACT_BLOCKING_STATES) },
        AND: [
          { OR: [{ leadType: "alt_lead" }, { campaign: { not: null } }] },
          {
            OR: [
              { lastWhatsappReplyAt: { not: null } },
              { whatsappStatus: "beantwortet" },
              { lastInboundMessage: { not: null } },
            ],
          },
        ],
      },
      orderBy: { lastWhatsappReplyAt: "desc" },
      select: { id: true },
      take: limit,
    });
    return rows.map((r) => r.id);
  }

  async list(
    filters: LeadFilters,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<LeadSummary[]> {
    const where: Prisma.LeadWhereInput = { deletedAt: null };
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        where.status = { in: [...filters.status] as string[] };
      } else {
        where.status = filters.status as string;
      }
    }
    if (filters.priority) where.priority = filters.priority;
    if (filters.preferredLocation)
      where.preferredLocation = filters.preferredLocation;
    if (filters.funnelPath) where.funnelPath = filters.funnelPath;
    if (filters.source) where.source = filters.source;
    if (filters.slaBreachedOnly) where.slaBreachedAt = { not: null };
    if (filters.assignedToId) {
      where.OR = filters.includeUnassigned
        ? [{ assignedToId: filters.assignedToId }, { assignedToId: null }]
        : [{ assignedToId: filters.assignedToId }];
    }
    if (filters.createdFrom || filters.createdTo) {
      where.createdAt = {};
      if (filters.createdFrom) where.createdAt.gte = filters.createdFrom;
      if (filters.createdTo) where.createdAt.lte = filters.createdTo;
    }
    if (filters.whatsappStatus) where.whatsappStatus = filters.whatsappStatus;
    if (filters.leadQualityStatus)
      where.leadQualityStatus = filters.leadQualityStatus;
    if (filters.hasNewReply) {
      // "Neue Antworten": a reply arrived after (or without) our last outbound.
      where.lastWhatsappReplyAt = { not: null };
    }
    if (filters.leadType) where.leadType = filters.leadType;
    if (filters.campaign) where.campaign = filters.campaign;
    if (filters.campaignStatus) where.campaignStatus = filters.campaignStatus;

    if (filters.funnelOrJobseekerCallback) {
      // Web-Bewerber only (see LeadFilters doc). Alt-Leads NEVER show here by
      // default, even with a WhatsApp-Rückrufwunsch — those surface in the
      // dedicated "Rückrufe angefordert" queue instead (CallbackRequestService)
      // until they themselves start/complete the funnel and become "neu".
      where.leadType = "neu";
    }

    const rows = await prisma.lead.findMany({
      where,
      orderBy: [
        // HOT first, then SLA-breached, then newest
        { priority: "asc" }, // alphabetical: BLOCKED, COLD, HOT, WARM - we sort in JS below
        { createdAt: "desc" },
      ],
      include: ASSIGNEE_INCLUDE,
      take: opts.limit ?? 100,
      skip: opts.offset ?? 0,
    });

    const summaries = (rows as LeadRowWithAssignee[]).map(rowToSummary);

    // Stable sort: HOT first, then SLA-breached desc, then createdAt desc
    summaries.sort((a, b) => {
      if (a.priority !== b.priority) {
        const order: Record<LeadPriority, number> = {
          HOT: 0,
          WARM: 1,
          COLD: 2,
          BLOCKED: 3,
        };
        return order[a.priority] - order[b.priority];
      }
      const aBreach = a.slaBreachedAt?.getTime() ?? 0;
      const bBreach = b.slaBreachedAt?.getTime() ?? 0;
      if (aBreach !== bBreach) return bBreach - aBreach;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return summaries;
  }

  async aggregateKpis(): Promise<LeadKpis> {
    return aggregateLeadKpis();
  }

  /**
   * Leads that are released-ready for a campaign: imported, not yet contacted,
   * not completed. Ordered oldest-first for a stable "next N" selection.
   */
  async listReadyCampaignLeads(
    campaign: string,
    limit: number,
  ): Promise<LeadSummary[]> {
    const rows = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        campaign,
        leadType: "alt_lead",
        communicationStarted: false,
        campaignCompleted: false,
      },
      orderBy: { createdAt: "asc" },
      include: ASSIGNEE_INCLUDE,
      ...(Number.isFinite(limit) ? { take: limit } : {}),
    });
    return (rows as LeadRowWithAssignee[]).map(rowToSummary);
  }

  /**
   * The full imported campaign cohort as lightweight RAW rows for the
   * "alle Leads"-board. ONE query, only the columns the board needs, and NO
   * strict LeadSummary parsing — so a lead with a legacy/invalid enum value can
   * never crash the page. Filtering, per-state counting and pagination happen in
   * memory (see the page), which also keeps the DB connection pool unstressed.
   */
  async listReactivationCohort(
    campaign: string,
  ): Promise<ReactivationCohortRow[]> {
    const rows = await prisma.lead.findMany({
      where: { deletedAt: null, campaign },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        city: true,
        leadType: true,
        campaignCompleted: true,
        reactivationExcluded: true,
        communicationStarted: true,
        lastWhatsappReplyAt: true,
        whatsappStatus: true,
        firstContactSentAt: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      firstName: r.firstName ?? "",
      lastName: r.lastName ?? "",
      phone: r.phone ?? null,
      email: r.email ?? null,
      city: r.city ?? null,
      leadType: r.leadType ?? "alt_lead",
      campaignCompleted: r.campaignCompleted,
      reactivationExcluded: r.reactivationExcluded,
      communicationStarted: r.communicationStarted,
      lastWhatsappReplyAt: r.lastWhatsappReplyAt,
      whatsappStatus: r.whatsappStatus ?? "",
      firstContactSentAt: r.firstContactSentAt,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Find an active reactivation-campaign lead matching a phone tail or email —
   * used to detect that a freshly-submitted wizard lead is actually one of our
   * Alt-Leads completing the Eignungscheck (stop trigger). Excludes `excludeId`.
   */
  async findActiveCampaignLeadByContact(
    campaign: string,
    phone: string,
    email: string,
    excludeId: string,
  ): Promise<LeadSummary | null> {
    const emailNorm = email.trim().toLowerCase();
    const digits = phone.replace(/\D/g, "");
    const tail = digits.length >= 6 ? digits.slice(-8) : null;

    const candidates = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        campaign,
        leadType: "alt_lead",
        campaignCompleted: false,
        id: { not: excludeId },
      },
      include: ASSIGNEE_INCLUDE,
      take: 2000,
    });
    const match = (candidates as LeadRowWithAssignee[]).find((c) => {
      if (emailNorm && (c.email ?? "").trim().toLowerCase() === emailNorm) {
        return true;
      }
      if (tail) {
        return (c.phone ?? "").replace(/\D/g, "").endsWith(tail);
      }
      return false;
    });
    return match ? rowToSummary(match) : null;
  }

  /**
   * Find ANY Alt-Lead (reactivation) matching a phone tail or email —
   * regardless of campaign/active status. Used by `LeadService.submit` to
   * detect that a fresh public Eignungscheck submission is actually one of
   * our Alt-Leads starting/completing the funnel, so it can be converted IN
   * PLACE (leadType → "neu") instead of creating a duplicate lead. Broader
   * than `findActiveCampaignLeadByContact` on purpose: it must also catch an
   * Alt-Lead already flagged for a callback request (automation paused).
   */
  async findAltLeadByContact(
    phone: string,
    email: string,
  ): Promise<LeadSummary | null> {
    const emailNorm = email.trim().toLowerCase();
    const digits = phone.replace(/\D/g, "");
    const tail = digits.length >= 6 ? digits.slice(-8) : null;
    if (!emailNorm && !tail) return null;

    const candidates = await prisma.lead.findMany({
      where: { deletedAt: null, leadType: "alt_lead" },
      include: ASSIGNEE_INCLUDE,
      take: 2000,
    });
    const match = (candidates as LeadRowWithAssignee[]).find((c) => {
      if (emailNorm && (c.email ?? "").trim().toLowerCase() === emailNorm) {
        return true;
      }
      if (tail) {
        return (c.phone ?? "").replace(/\D/g, "").endsWith(tail);
      }
      return false;
    });
    return match ? rowToSummary(match) : null;
  }

  /**
   * Open Alt-Lead callback requests — the "Rückrufe angefordert" queue (see
   * CallbackRequestService). Oldest request first so nothing sits ignored.
   */
  async listCallbackRequests(): Promise<LeadSummary[]> {
    const rows = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        leadType: "alt_lead",
        callbackRequestedAt: { not: null },
        callbackHandledAt: null,
      },
      orderBy: { callbackRequestedAt: "asc" },
      include: ASSIGNEE_INCLUDE,
      take: 500,
    });
    return (rows as LeadRowWithAssignee[]).map(rowToSummary);
  }

  /** Lightweight count for the "Rückrufe angefordert" sidebar badge. */
  async countCallbackRequests(): Promise<number> {
    return prisma.lead.count({
      where: {
        deletedAt: null,
        leadType: "alt_lead",
        callbackRequestedAt: { not: null },
        callbackHandledAt: null,
      },
    });
  }

  async countReadyCampaignLeads(campaign: string): Promise<number> {
    return prisma.lead.count({
      where: {
        deletedAt: null,
        campaign,
        leadType: "alt_lead",
        communicationStarted: false,
        campaignCompleted: false,
      },
    });
  }

  /**
   * Campaign leads that have reached the final step and are past the grace
   * period without a reaction — candidates for the "inaktiv" finalizer.
   */
  async findCampaignLeadsToFinalize(
    campaign: string,
    firstContactBefore: Date,
    limit = 200,
  ): Promise<LeadSummary[]> {
    const rows = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        campaign,
        campaignCompleted: false,
        campaignStep: { gte: 3 },
        firstContactSentAt: { lte: firstContactBefore },
      },
      include: ASSIGNEE_INCLUDE,
      take: limit,
    });
    return (rows as LeadRowWithAssignee[]).map(rowToSummary);
  }

  /**
   * Load dedup keys for every active lead in one pass. Phones are reduced to
   * their last-8-digit tail (matching `findByPhone` semantics), emails are
   * lowercased. Used by the Alt-Lead import to detect duplicates against the
   * existing base in-memory (no per-row query).
   */
  async allContactKeys(): Promise<{
    phoneTails: Set<string>;
    emails: Set<string>;
  }> {
    const rows = await prisma.lead.findMany({
      where: { deletedAt: null },
      select: { phone: true, email: true },
    });
    const phoneTails = new Set<string>();
    const emails = new Set<string>();
    for (const row of rows) {
      const digits = (row.phone ?? "").replace(/\D/g, "");
      if (digits.length >= 6) phoneTails.add(digits.slice(-8));
      const email = (row.email ?? "").trim().toLowerCase();
      if (email) emails.add(email);
    }
    return { phoneTails, emails };
  }
}

export const leadRepository = new LeadRepository();
