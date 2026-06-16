import { randomBytes } from "node:crypto";

import type { WhatsAppProvider, WhatsAppSendResult } from "./WhatsAppProvider";

function fakeId(): string {
  return `mock_wa_${randomBytes(8).toString("hex")}`;
}

export class MockWhatsAppProvider implements WhatsAppProvider {
  readonly name = "mock";

  isConfigured(): boolean {
    return true;
  }

  async send(to: string, message: string): Promise<WhatsAppSendResult> {
    // eslint-disable-next-line no-console
    console.info("[mock-whatsapp]", { to, messageLength: message.length });
    return {
      providerMessageId: fakeId(),
      rawPayload: JSON.stringify({ to, messageLength: message.length }),
    };
  }
}
