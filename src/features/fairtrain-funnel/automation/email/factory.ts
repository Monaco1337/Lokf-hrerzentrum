import { serverEnv } from "@/server/env";

import { DisabledEmailProvider } from "./DisabledEmailProvider";
import type { EmailProvider } from "./EmailProvider";
import { MockEmailProvider } from "./MockEmailProvider";
import { ResendEmailProvider } from "./ResendEmailProvider";
import { SmtpEmailProvider } from "./SmtpEmailProvider";

export type EmailProviderName = "disabled" | "mock" | "resend" | "smtp";

/**
 * Canonical public contact mailbox on the brand's own domain. Transactional
 * email is ALWAYS sent from / replies routed to this address — never a personal
 * provider inbox (e.g. a legacy `@t-mobile.de` account).
 */
export const CONTACT_EMAIL = "info@weissleder-immobilien.de";

/**
 * Guard the sender/reply-to address: accept a configured value only if it is on
 * the brand domain (with or without a `Name <…>` display part); otherwise fall
 * back to {@link CONTACT_EMAIL}. This makes it impossible for a wrong address
 * (unset env, or a stale `EMAIL_FROM`/`EMAIL_REPLY_TO` set in the host to a
 * personal mailbox) to leak into an outgoing mail header.
 */
function brandAddress(configured: string): string {
  const v = configured.trim();
  return /weissleder-immobilien\.de/i.test(v) ? v : CONTACT_EMAIL;
}

export function createEmailProvider(
  name: EmailProviderName = serverEnv.EMAIL_PROVIDER,
): EmailProvider {
  const from = brandAddress(serverEnv.EMAIL_FROM);
  const replyTo = brandAddress(serverEnv.EMAIL_REPLY_TO);
  switch (name) {
    case "mock":
      return new MockEmailProvider();
    case "resend":
      return new ResendEmailProvider(serverEnv.RESEND_API_KEY, from, replyTo);
    case "smtp":
      return new SmtpEmailProvider({
        host: serverEnv.SMTP_HOST,
        port: serverEnv.SMTP_PORT,
        user: serverEnv.SMTP_USER,
        pass: serverEnv.SMTP_PASS,
        from,
      });
    case "disabled":
    default:
      return new DisabledEmailProvider();
  }
}
