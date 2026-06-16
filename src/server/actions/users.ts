"use server";
/**
 * User-management Server Actions — create / update / deactivate / delete.
 *
 * All gated by `canManageUsers` + additional permission checks for delete and
 * role assignment. The UserService internally enforces the
 * "last super-admin" guards and role-rank rules.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  RoleSchema,
  type UserSummary,
} from "@/features/fairtrain-funnel/types";

import { ValidationError } from "../errors";
import { userService } from "../services/UserService";
import { requirePermission, runAction, type Result } from "./_helpers";

const CreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  role: RoleSchema,
  password: z
    .string()
    .min(8, "Mindestens 8 Zeichen")
    .max(200)
    .optional()
    .or(z.literal("")),
});

const UpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: RoleSchema.optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(200).optional().or(z.literal("")),
});

const IdSchema = z.object({ id: z.string().min(1) });

export async function createUser(
  raw: unknown,
): Promise<Result<UserSummary>> {
  return runAction(async () => {
    const parsed = CreateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Benutzerdaten", {
        issues: parsed.error.issues,
      });
    }
    const actor = await requirePermission("canCreateUsers");
    const created = await userService.create(actor, {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      password:
        parsed.data.password && parsed.data.password !== ""
          ? parsed.data.password
          : null,
    });
    revalidatePath("/crm/users");
    return created;
  });
}

export async function updateUser(
  raw: unknown,
): Promise<Result<UserSummary>> {
  return runAction(async () => {
    const parsed = UpdateSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Benutzerdaten", {
        issues: parsed.error.issues,
      });
    }
    const actor = await requirePermission("canManageUsers");
    const cmd: Parameters<typeof userService.update>[2] = {};
    if (parsed.data.name !== undefined) cmd.name = parsed.data.name;
    if (parsed.data.email !== undefined) cmd.email = parsed.data.email;
    if (parsed.data.role !== undefined) cmd.role = parsed.data.role;
    if (parsed.data.isActive !== undefined) cmd.isActive = parsed.data.isActive;
    if (parsed.data.password && parsed.data.password !== "") {
      cmd.password = parsed.data.password;
    }
    const updated = await userService.update(actor, parsed.data.id, cmd);
    revalidatePath("/crm/users");
    return updated;
  });
}

export async function deleteUser(
  raw: unknown,
): Promise<Result<{ id: string }>> {
  return runAction(async () => {
    const parsed = IdSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Ungültige Eingabe", {
        issues: parsed.error.issues,
      });
    }
    const actor = await requirePermission("canDeleteUsers");
    await userService.softDelete(actor, parsed.data.id);
    revalidatePath("/crm/users");
    return { id: parsed.data.id };
  });
}
