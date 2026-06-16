/**
 * SMTP email provider — prepared for production wiring.
 * Requires SMTP_HOST + SMTP_FROM; authenticates when SMTP_USER is set.
 */
import type { EmailProvider, EmailSendResult } from "./EmailProvider";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";

  constructor(private readonly config: SmtpConfig) {}

  isConfigured(): boolean {
    return Boolean(this.config.host && this.config.from);
  }

  async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<EmailSendResult> {
    // SMTP transport is intentionally deferred — credentials are validated so
    // ops can flip EMAIL_PROVIDER=smtp once nodemailer (or similar) is wired.
    void to;
    void subject;
    void html;
    throw new Error(
      "SMTP provider credentials present but transport not yet wired. Set EMAIL_PROVIDER=resend or mock.",
    );
  }
}
