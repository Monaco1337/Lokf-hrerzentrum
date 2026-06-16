import type { EmailProvider, EmailSendResult } from "./EmailProvider";

export class DisabledEmailProvider implements EmailProvider {
  readonly name = "disabled";

  isConfigured(): boolean {
    return false;
  }

  async send(): Promise<EmailSendResult> {
    throw new Error("Email provider is disabled");
  }
}
