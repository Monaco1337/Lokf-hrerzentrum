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
import { redirect } from "next/navigation";

import {
  can,
  type Permission,
} from "@/features/fairtrain-funnel/auth/permissions";
import type { UserSummary } from "@/features/fairtrain-funnel/types";

import { DomainError, ForbiddenError, type Result, toErrorResult } from "../errors";
import { userRepository } from "../repositories/UserRepository";
import {
  SESSION_COOKIE,
  type SessionPayload,
  authService,
} from "../services/AuthService";

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
 * Resolve the active user from the session cookie for a PROTECTED page/layout.
 *
 * Behaviour (contract for CRM server components):
 *   - No / invalid / expired session  -> clean 307 redirect to /crm/login.
 *     This is an auth outcome, NEVER a 500. `redirect()` throws the internal
 *     `NEXT_REDIRECT` signal which Next.js turns into a real redirect.
 *   - Session references a deleted / deactivated account -> same clean redirect
 *     (the operator simply has to log in again).
 *   - Database / infrastructure errors -> intentionally propagate so the
 *     nearest error boundary (app/crm/error.tsx) renders a controlled state
 *     instead of a white "server-side exception" screen. No details leak.
 *
 * This function therefore NEVER returns a null/undefined user and callers can
 * safely dereference `.role`, `.id`, etc. without extra null checks.
 */
export async function requireCrmUser(): Promise<UserSummary> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value ?? null;

  let session: SessionPayload;
  try {
    session = await authService.verifySession(token);
  } catch {
    // Missing / malformed / expired session -> not authenticated.
    redirect("/crm/login");
  }

  // A DB failure here is an infrastructure problem, not an auth problem — let
  // it bubble to the error boundary rather than masquerading as "logged out".
  const user = await userRepository.findById(session.sub);
  if (!user || !user.isActive) {
    redirect("/crm/login");
  }
  return user;
}

/**
 * Non-throwing session probe for surfaces that must ALWAYS render (e.g. the
 * login page). Returns the active user or `null`. Auth failures map to `null`;
 * unexpected/DB errors are logged and also map to `null` so the caller degrades
 * gracefully instead of crashing.
 */
export async function getOptionalCrmUser(): Promise<UserSummary | null> {
  try {
    const c = await cookies();
    const token = c.get(SESSION_COOKIE)?.value ?? null;
    if (!token) return null;
    const session = await authService.verifySession(token);
    const user = await userRepository.findById(session.sub);
    if (!user || !user.isActive) return null;
    return user;
  } catch (err) {
    if (!(err instanceof DomainError)) {
      // eslint-disable-next-line no-console
      console.error("[getOptionalCrmUser] unexpected error", err);
    }
    return null;
  }
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

/**
 * Next.js uses thrown errors carrying a `digest` string as internal control
 * flow for `redirect()` and `notFound()`. These MUST bubble out of a Server
 * Action untouched — swallowing them into a `Result` would silently break the
 * navigation (e.g. the login redirect on an expired session).
 */
function isNextControlFlowError(err: unknown): boolean {
  if (typeof err !== "object" || err === null || !("digest" in err)) {
    return false;
  }
  const digest = (err as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")
  );
}

export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<Result<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    if (isNextControlFlowError(err)) throw err;
    return toErrorResult(err);
  }
}
