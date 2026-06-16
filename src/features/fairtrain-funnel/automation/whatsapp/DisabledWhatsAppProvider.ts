import type { WhatsAppProvider, WhatsAppSendResult } from "./WhatsAppProvider";

export class DisabledWhatsAppProvider implements WhatsAppProvider {
  readonly name = "disabled";

  isConfigured(): boolean {
    return false;
  }

  async send(): Promise<WhatsAppSendResult> {
    throw new Error("WhatsApp provider is disabled");
  }
}
