/**
 * ContactInquiryRepository - the only place that touches the `ContactInquiry`
 * table via Prisma.
 *
 * Designed identically to the other repositories: strict enum validation on
 * read (status), enum union on write. No joins (the table is intentionally
 * standalone — these inquiries are NOT scored leads).
 */
import type { ContactInquiry as PrismaContactInquiry } from "@prisma/client";

import {
  type ContactInquiryStatus,
  ContactInquiryStatusSchema,
  type ContactInquirySummary,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";

export type ContactInquiryRow = ContactInquirySummary;

export interface CreateContactInquiryInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  message: string;
  source: string | null;
  utm: string | null;
  ipHash: string | null;
  userAgent: string | null;
}

function fromRow(row: PrismaContactInquiry): ContactInquiryRow {
  const status = ContactInquiryStatusSchema.parse(row.status);
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status,
    source: row.source,
    utm: row.utm,
    ipHash: row.ipHash,
    userAgent: row.userAgent,
    handledBy: row.handledBy,
    handledAt: row.handledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class ContactInquiryRepository {
  async create(input: CreateContactInquiryInput): Promise<ContactInquiryRow> {
    const row = await prisma.contactInquiry.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        message: input.message,
        source: input.source,
        utm: input.utm,
        ipHash: input.ipHash,
        userAgent: input.userAgent,
        status: "NEW",
      },
    });
    return fromRow(row);
  }

  async list(limit = 100): Promise<ContactInquiryRow[]> {
    const rows = await prisma.contactInquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(fromRow);
  }

  async findById(id: string): Promise<ContactInquiryRow | null> {
    const row = await prisma.contactInquiry.findUnique({ where: { id } });
    return row ? fromRow(row) : null;
  }

  async updateStatus(
    id: string,
    status: ContactInquiryStatus,
    handledBy: string,
  ): Promise<ContactInquiryRow> {
    const row = await prisma.contactInquiry.update({
      where: { id },
      data: {
        status,
        handledBy,
        handledAt: new Date(),
      },
    });
    return fromRow(row);
  }

  async countNew(): Promise<number> {
    return prisma.contactInquiry.count({ where: { status: "NEW" } });
  }

  async delete(id: string): Promise<void> {
    await prisma.contactInquiry.delete({ where: { id } });
  }

  async recentByEmail(email: string, windowMinutes = 5): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    return prisma.contactInquiry.count({
      where: {
        email,
        createdAt: { gte: since },
      },
    });
  }

  async recentByIpHash(ipHash: string, windowMinutes = 5): Promise<number> {
    const since = new Date(Date.now() - windowMinutes * 60_000);
    return prisma.contactInquiry.count({
      where: {
        ipHash,
        createdAt: { gte: since },
      },
    });
  }
}

export const contactInquiryRepository = new ContactInquiryRepository();
