import { serverEnv } from "@/server/env";

import { DisabledEmailProvider } from "./DisabledEmailProvider";
import type { EmailProvider } from "./EmailProvider";
import { MockEmailProvider } from "./MockEmailProvider";
import { ResendEmailProvider } from "./ResendEmailProvider";
import { SmtpEmailProvider } from "./SmtpEmailProvider";

export type EmailProviderName = "disabled" | "mock" | "resend" | "smtp";

export function createEmailProvider(
  name: EmailProviderName = serverEnv.EMAIL_PROVIDER,
): EmailProvider {
  switch (name) {
    case "mock":
      return new MockEmailProvider();
    case "resend":
      return new ResendEmailProvider(
        serverEnv.RESEND_API_KEY,
        serverEnv.EMAIL_FROM,
      );
    case "smtp":
      return new SmtpEmailProvider({
        host: serverEnv.SMTP_HOST,
        port: serverEnv.SMTP_PORT,
        user: serverEnv.SMTP_USER,
        pass: serverEnv.SMTP_PASS,
        from: serverEnv.EMAIL_FROM,
      });
    case "disabled":
    default:
      return new DisabledEmailProvider();
  }
}
