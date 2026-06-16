import { randomBytes } from "node:crypto";

import type { EmailProvider, EmailSendResult } from "./EmailProvider";

function fakeId(): string {
  return `mock_email_${randomBytes(8).toString("hex")}`;
}

export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";

  isConfigured(): boolean {
    return true;
  }

  async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<EmailSendResult> {
    // eslint-disable-next-line no-console
    console.info("[mock-email]", { to, subject, htmlLength: html.length });
    return {
      providerMessageId: fakeId(),
      rawPayload: JSON.stringify({ to, subject, htmlLength: html.length }),
    };
  }
}
