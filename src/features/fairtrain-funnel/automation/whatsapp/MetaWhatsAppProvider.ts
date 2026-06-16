import type { WhatsAppProvider, WhatsAppSendResult } from "./WhatsAppProvider";

export class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = "meta";

  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.token && this.phoneNumberId);
  }

  async send(to: string, message: string): Promise<WhatsAppSendResult> {
    const url = `https://graph.facebook.com/v21.0/${this.phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to.replace(/^\+/, ""),
        type: "text",
        text: { body: message },
      }),
    });

    const body = (await res.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message: string; code?: number };
    };

    if (!res.ok) {
      throw new Error(body.error?.message ?? `Meta WhatsApp HTTP ${res.status}`);
    }

    const id = body.messages?.[0]?.id ?? null;
    return {
      providerMessageId: id,
      rawPayload: JSON.stringify({ to, provider: "meta", id }),
    };
  }
}
