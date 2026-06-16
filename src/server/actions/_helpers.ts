/**
 * Shared helpers for Server Actions.
 *
 * - Request-context extraction (headers, ip, user agent, source/utm).
 * - Session enforcement WITH user lookup + RBAC.
 * - Uniform Result wrapping for typed UI consumption.
 *
 * RBAC contract:
 *   - `requireCrmActor()` returns the User.id string (legacy ergonomic).
 *   - `requireCrmUser()` returns the full active User row.
 *   - `requirePermission(perm)` returns the User and throws ForbiddenError
 *     if the user's role does not satisfy the permission.
 *
 * `requireCrmActor()` stays around for backward compatibility — every old
 * Server Action keeps working without modification, even before we add
 * explicit permission guards.
 */
import { cookies, headers } from "next/headers";

import {
  can,
  type Permission,
} from "@/features/fairtrain-funnel/auth/permissions";
import type { UserSummary } from "@/features/fairtrain-funnel/types";

import { ForbiddenError, type Result, toErrorResult } from "../errors";
import { userRepository } from "../repositories/UserRepository";
import { SESSION_COOKIE, authService } from "../services/AuthService";

export type { Result };

export async function getRequestContext(): Promise<{
  source: string | null;
  utm: string | null;
  ip: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  const referer = h.get("referer");
  const ua = h.get("user-agent");
  const xff = h.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0]?.trim() ?? null : null;
  return {
    source: referer ?? null,
    utm: null,
    ip,
    userAgent: ua,
  };
}

/**
 * Resolve the active user from the session cookie. Throws if no session, the
 * session is invalid, or the referenced user no longer exists / is inactive.
 */
export async function requireCrmUser(): Promise<UserSummary> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value ?? null;
  const session = await authService.verifySession(token);
  const user = await userRepository.findById(session.sub);
  if (!user || !user.isActive) {
    throw new ForbiddenError("Konto nicht mehr aktiv");
  }
  return user;
}

/**
 * Legacy ergonomic — most existing actions just want the actor id for audit.
 * Now backed by the real user lookup, so the same call site keeps working but
 * benefits from inactive-user rejection.
 */
export async function requireCrmActor(): Promise<string> {
  const user = await requireCrmUser();
  return user.id;
}

/**
 * Resolve the active user AND verify a specific permission. Throws
 * `ForbiddenError` if the permission is not satisfied — this becomes a
 * typed `Result.error` with code `FORBIDDEN` in the UI.
 */
export async function requirePermission(
  permission: Permission,
): Promise<UserSummary> {
  const user = await requireCrmUser();
  if (!can(user.role, permission)) {
    throw new ForbiddenError(`Fehlende Berechtigung: ${permission}`);
  }
  return user;
}

export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<Result<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    return toErrorResult(err);
  }
}
