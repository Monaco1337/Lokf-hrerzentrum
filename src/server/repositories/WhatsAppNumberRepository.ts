/**
 * WhatsAppNumberRepository — the configured WhatsApp Cloud API sender numbers.
 *
 * One row per number (all under a single WABA + shared System-User token). No
 * secret is stored here; only the opaque Meta `phone_number_id`, a display
 * number, a label and the owning sales rep. Adding a number is a plain insert,
 * so the fleet scales to any size without a deploy.
 */
import type { WhatsAppNumberRecord } from "@/features/fairtrain-funnel/messaging/types";

import { prisma } from "../db/prisma";

interface NumberRow {
  id: string;
  phoneNumberId: string;
  displayPhone: string;
  label: string;
  assignedUserId: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  assignedUser: { name: string } | null;
}

const INCLUDE = { assignedUser: { select: { name: true } } } as const;

function mapRow(r: NumberRow): WhatsAppNumberRecord {
  return {
    id: r.id,
    phoneNumberId: r.phoneNumberId,
    displayPhone: r.displayPhone,
    label: r.label,
    assignedUserId: r.assignedUserId,
    assignedUserName: r.assignedUser?.name ?? null,
    active: r.active,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export interface CreateWhatsAppNumberInput {
  phoneNumberId: string;
  displayPhone: string;
  label: string;
  assignedUserId: string | null;
}

export interface UpdateWhatsAppNumberInput {
  displayPhone?: string | undefined;
  label?: string | undefined;
  assignedUserId?: string | null | undefined;
  active?: boolean | undefined;
}

export class WhatsAppNumberRepository {
  async list(): Promise<WhatsAppNumberRecord[]> {
    const rows = await prisma.whatsAppNumber.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
      include: INCLUDE,
    });
    return rows.map((r) => mapRow(r as NumberRow));
  }

  async listActive(): Promise<WhatsAppNumberRecord[]> {
    const rows = await prisma.whatsAppNumber.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
      include: INCLUDE,
    });
    return rows.map((r) => mapRow(r as NumberRow));
  }

  async findByPhoneNumberId(
    phoneNumberId: string,
  ): Promise<WhatsAppNumberRecord | null> {
    const row = await prisma.whatsAppNumber.findUnique({
      where: { phoneNumberId },
      include: INCLUDE,
    });
    return row ? mapRow(row as NumberRow) : null;
  }

  async findById(id: string): Promise<WhatsAppNumberRecord | null> {
    const row = await prisma.whatsAppNumber.findUnique({
      where: { id },
      include: INCLUDE,
    });
    return row ? mapRow(row as NumberRow) : null;
  }

  async create(input: CreateWhatsAppNumberInput): Promise<WhatsAppNumberRecord> {
    const row = await prisma.whatsAppNumber.create({
      data: {
        phoneNumberId: input.phoneNumberId,
        displayPhone: input.displayPhone,
        label: input.label,
        assignedUserId: input.assignedUserId,
      },
      include: INCLUDE,
    });
    return mapRow(row as NumberRow);
  }

  async update(
    id: string,
    input: UpdateWhatsAppNumberInput,
  ): Promise<WhatsAppNumberRecord> {
    const row = await prisma.whatsAppNumber.update({
      where: { id },
      data: {
        ...(input.displayPhone !== undefined ? { displayPhone: input.displayPhone } : {}),
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.assignedUserId !== undefined
          ? { assignedUserId: input.assignedUserId }
          : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
      include: INCLUDE,
    });
    return mapRow(row as NumberRow);
  }

  async delete(id: string): Promise<void> {
    await prisma.whatsAppNumber.delete({ where: { id } });
  }

  async countActive(): Promise<number> {
    return prisma.whatsAppNumber.count({ where: { active: true } });
  }
}

export const whatsAppNumberRepository = new WhatsAppNumberRepository();
