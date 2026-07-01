"use server";
/**
 * changePassword — lets an authenticated user set a new password and clears
 * the `mustChangePassword` flag.  Called from /crm/change-password.
 */
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AuditAction } from "@/features/fairtrain-funnel/types";

import { auditLogService } from "../services/AuditLogService";
import { userRepository } from "../repositories/UserRepository";
import { requireCrmUser } from "./_helpers";

const PASSWORD_ROUNDS = 12;

const Schema = z
  .object({
    password: z.string().min(8, "Mindestens 8 Zeichen").max(200),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirm"],
  });

export async function changePassword(
  _prevState: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const user = await requireCrmUser();

  const parsed = Schema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe" };
  }

  const passwordHash = await hash(parsed.data.password, PASSWORD_ROUNDS);
  await userRepository.update(user.id, { passwordHash, mustChangePassword: false });
  await auditLogService.append({
    actor: user.id,
    action: AuditAction.USER_UPDATED,
    entityType: "User",
    entityId: user.id,
    details: { password: true, mustChangePassword: false },
  });

  redirect("/crm");
}
