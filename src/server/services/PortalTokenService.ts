/**
 * PortalTokenService — opaque token generation/hashing for portal links.
 *
 * - 32-byte random tokens, base64url-encoded.
 * - Only `sha256(token + TOKEN_PEPPER)` is stored.
 * - Token URLs contain no PII or lead identifiers (token ≠ lead id).
 */
import { createHash, randomBytes } from "node:crypto";

import { getTokenPepper, serverEnv } from "../env";

export class PortalTokenService {
  generate(): string {
    return randomBytes(32).toString("base64url");
  }

  hash(token: string): string {
    return createHash("sha256")
      .update(`${token}:${getTokenPepper()}`)
      .digest("hex");
  }

  buildUrl(token: string): string {
    const baseUrl = serverEnv.APP_BASE_URL.replace(/\/$/, "");
    return `${baseUrl}/bewerbung/${token}`;
  }
}

export const portalTokenService = new PortalTokenService();
