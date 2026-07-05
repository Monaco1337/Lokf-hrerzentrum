"use server";
/**
 * WhatsApp number administration actions.
 *
 * Manage the fleet of WhatsApp Business Cloud API sender numbers (one WABA,
 * one shared token). Each number is just a `phone_number_id` + label + owning
 * rep — no secret is ever stored. Gated on `canManageSettings`.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { WhatsAppNumberRecord } from "@/features/fairtrain-funnel/messaging/types";

import { ValidationError } from "../errors";
import { whatsAppNumberRepository } from "../repositories/WhatsAppNumberRepository";
import { requirePermission, runAction, type Result } from "./_helpers";

function revalidateNumbers(): void {
  revalidatePath("/crm/settings/whatsapp-numbers");
  revalidatePath("/crm/multichat");
  revalidatePath("/crm/settings");
}

const nullableUser = z
  .string()
  .trim()
  .min(1)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

const CreateSchema = z.object({
  phoneNumberId: z.string().trim().min(3).max(64),
  displayPhone: z.string().trim().min(4).max(32),
  label: z.string().trim().min(1).max(80),
  assignedUserId: nullableUser,
});

export async function createWhatsAppNumber(
  raw: unknown,
): Promise<Result<WhatsAppNumberRecord>> {
  return runAction(async () => {
    const parsed = CreateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Nummern-Daten", {
        issues: parsed.error.issues,
      });
    }
    await requirePermission("canManageSettings");

    const existing = await whatsAppNumberRepository.findByPhoneNumberId(
      parsed.data.phoneNumberId,
    );
    if (existing) {
      throw new ValidationError(
        "Diese phone_number_id ist bereits angelegt.",
      );
    }

    const created = await whatsAppNumberRepository.create({
      phoneNumberId: parsed.data.phoneNumberId,
      displayPhone: parsed.data.displayPhone,
      label: parsed.data.label,
      assignedUserId: parsed.data.assignedUserId ?? null,
    });
    revalidateNumbers();
    return created;
  });
}

const UpdateSchema = z.object({
  id: z.string().min(1),
  displayPhone: z.string().trim().min(4).max(32).optional(),
  label: z.string().trim().min(1).max(80).optional(),
  assignedUserId: nullableUser,
  active: z.boolean().optional(),
});

export async function updateWhatsAppNumber(
  raw: unknown,
): Promise<Result<WhatsAppNumberRecord>> {
  return runAction(async () => {
    const parsed = UpdateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Nummern-Daten", {
        issues: parsed.error.issues,
      });
    }
    await requirePermission("canManageSettings");

    const { id, ...fields } = parsed.data;
    const updated = await whatsAppNumberRepository.update(id, fields);
    revalidateNumbers();
    return updated;
  });
}

const DeleteSchema = z.object({ id: z.string().min(1) });

export async function deleteWhatsAppNumber(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = DeleteSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Nummer");
    }
    await requirePermission("canManageSettings");
    await whatsAppNumberRepository.delete(parsed.data.id);
    revalidateNumbers();
    return { id: parsed.data.id };
  });
}
