"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CrmLoginSchema } from "@/features/fairtrain-funnel/forms/schemas";
import { AuditAction } from "@/features/fairtrain-funnel/types";

import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  authService,
} from "../services/AuthService";
import { auditLogService } from "../services/AuditLogService";
import { userService } from "../services/UserService";

/**
 * CRM login action.
 *
 * Two-mode form: either Email + Password (canonical) or just Password
 * (legacy single-password gate). Always sets a cookie session whose `sub`
 * is the real User.id so downstream actions can authorise + audit.
 */
export async function crmLogin(formData: FormData): Promise<void> {
  await userService.ensureBootstrapAdmins();

  const password = formData.get("password");
  const email = formData.get("email");
  const parsed = CrmLoginSchema.safeParse({
    password,
    email: typeof email === "string" ? email : undefined,
  });
  if (!parsed.success) {
    redirect("/crm/login?error=invalid");
  }

  let userId: string | null = null;
  try {
    if (parsed.data.email) {
      const { user } = await authService.verifyCredentials(
        parsed.data.email,
        parsed.data.password,
      );
      userId = user.id;
    } else {
      const fallback = await authService.verifyLegacyPassword(
        parsed.data.password,
      );
      if (fallback) userId = fallback.id;
    }
  } catch {
    redirect("/crm/login?error=credentials");
  }

  if (!userId) {
    await auditLogService.append({
      actor: parsed.data.email?.toLowerCase() ?? "unknown",
      action: AuditAction.LOGIN_FAIL,
      entityType: "Auth",
      entityId: parsed.data.email?.toLowerCase() ?? "unknown",
    });
    redirect("/crm/login?error=credentials");
  }

  const token = await authService.issueSession(userId);
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect("/crm");
}

export async function crmLogout(): Promise<void> {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
  redirect("/crm/login");
}
