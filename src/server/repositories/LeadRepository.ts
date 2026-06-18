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
  type EmploymentStatus,
  type FunnelPath,
  type LeadDetail,
  type LeadFilters,
  type LeadKpis,
  type LeadPriority,
  LeadStatus,
  type LeadSummary,
  type PreferredLocation,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { aggregateLeadKpis } from "./LeadKpisQuery";
import {
  parseEmploymentStatus,
  parseFunnelPath,
  parseLeadPriority,
  parseLeadStatus,
  parsePreferredLocation,
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
}

export const leadRepository = new LeadRepository();
