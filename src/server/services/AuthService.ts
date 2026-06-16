/**
 * AuthService — credential verification + session issue/verify.
 *
 * Two supported login paths, both gated by the same session machinery:
 *
 *   1. Email + Password (PRIMARY)
 *      Looks up the User row, compares bcrypt(password, passwordHash) and
 *      issues a session with the User.id as the subject.
 *
 *   2. Single-Password fallback (LEGACY)
 *      `CRM_PASSWORD_HASH` env: when an email is not provided, an admin can
 *      still log in by typing only a password. The session is issued for
 *      the seeded `Admin` super-admin so all per-user audit + scoping still
 *      works. This keeps every existing operator alive across the rollout.
 *
 * Sessions: HS256-signed JWT, `sub` is the User.id (UUID/CUID string).
 */
import { compare } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

import { AuditAction } from "@/features/fairtrain-funnel/types";

import { getCrmPasswordHash, getSessionSecret, serverEnv } from "../env";
import { ForbiddenError, UnauthorizedError } from "../errors";
import {
  userRepository,
  type UserAuthRow,
} from "../repositories/UserRepository";
import { auditLogService } from "./AuditLogService";

const SESSION_TTL_SECONDS = 60 * 60 * 8;

/** The well-known email of the seeded Admin (case-insensitive). */
export const FALLBACK_ADMIN_EMAIL = "admin@fairtrain.local";

export interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

export interface VerifyCredentialsResult {
  user: UserAuthRow;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getSessionSecret());
}

export class AuthService {
  /**
   * Email-based credential check. Returns the user row (without the hash) on
   * success, throws UnauthorizedError on failure. Always records an audit
   * entry (success or fail) under the email or "unknown" actor.
   */
  async verifyCredentials(
    emailRaw: string,
    password: string,
  ): Promise<VerifyCredentialsResult> {
    const email = emailRaw.trim().toLowerCase();
    const user = await userRepository.findActiveByEmail(email);
    if (!user || !user.passwordHash) {
      await auditLogService.append({
        actor: email || "unknown",
        action: AuditAction.LOGIN_FAIL,
        entityType: "Auth",
        entityId: email || "unknown",
        details: { reason: user ? "no_password" : "no_user" },
      });
      throw new UnauthorizedError("Invalid credentials");
    }
    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      await auditLogService.append({
        actor: user.id,
        action: AuditAction.LOGIN_FAIL,
        entityType: "Auth",
        entityId: user.id,
        details: { email },
      });
      throw new UnauthorizedError("Invalid credentials");
    }
    if (!user.isActive) {
      await auditLogService.append({
        actor: user.id,
        action: AuditAction.LOGIN_FAIL,
        entityType: "Auth",
        entityId: user.id,
        details: { reason: "inactive" },
      });
      throw new ForbiddenError("Konto deaktiviert");
    }
    await userRepository.markLoginNow(user.id);
    await auditLogService.append({
      actor: user.id,
      action: AuditAction.LOGIN_SUCCESS,
      entityType: "Auth",
      entityId: user.id,
    });
    return { user };
  }

  /**
   * Legacy single-password path. Compares against `CRM_PASSWORD_HASH` and on
   * success looks up the seeded fallback Admin. Only used when the email
   * field is omitted by the operator (`crmLogin` action).
   */
  async verifyLegacyPassword(password: string): Promise<UserAuthRow | null> {
    const hash = getCrmPasswordHash();
    if (!hash) {
      // Dev convenience: if no hash configured AND env is dev, allow `dev`.
      if (serverEnv.NODE_ENV !== "production" && password === "dev") {
        const fallback = await userRepository.findActiveByEmail(
          FALLBACK_ADMIN_EMAIL,
        );
        if (fallback) {
          await userRepository.markLoginNow(fallback.id);
          await auditLogService.append({
            actor: fallback.id,
            action: AuditAction.LOGIN_SUCCESS,
            entityType: "Auth",
            entityId: fallback.id,
            details: { legacy: true, devFallback: true },
          });
          return fallback;
        }
      }
      return null;
    }
    const ok = await compare(password, hash);
    if (!ok) return null;
    const fallback = await userRepository.findActiveByEmail(
      FALLBACK_ADMIN_EMAIL,
    );
    if (fallback) {
      await userRepository.markLoginNow(fallback.id);
      await auditLogService.append({
        actor: fallback.id,
        action: AuditAction.LOGIN_SUCCESS,
        entityType: "Auth",
        entityId: fallback.id,
        details: { legacy: true },
      });
    }
    return fallback;
  }

  async issueSession(userId: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuedAt(now)
      .setExpirationTime(now + SESSION_TTL_SECONDS)
      .sign(secretKey());
  }

  async verifySession(token: string | undefined | null): Promise<SessionPayload> {
    if (!token) throw new UnauthorizedError("No session");
    try {
      const { payload } = await jwtVerify(token, secretKey(), {
        algorithms: ["HS256"],
      });
      if (
        typeof payload.sub !== "string" ||
        typeof payload.iat !== "number" ||
        typeof payload.exp !== "number"
      ) {
        throw new UnauthorizedError("Malformed session");
      }
      return { sub: payload.sub, iat: payload.iat, exp: payload.exp };
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError("Invalid session");
    }
  }
}

export const authService = new AuthService();
export const SESSION_COOKIE = "crm_session";
export { SESSION_TTL_SECONDS };
