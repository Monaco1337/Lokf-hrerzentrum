import type { WhatsAppProvider, WhatsAppSendResult } from "./WhatsAppProvider";

export class TwilioWhatsAppProvider implements WhatsAppProvider {
  readonly name = "twilio";

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly from: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.accountSid && this.authToken && this.from);
  }

  async send(to: string, message: string): Promise<WhatsAppSendResult> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
      "base64",
    );
    const body = new URLSearchParams({
      From: this.from.startsWith("whatsapp:") ? this.from : `whatsapp:${this.from}`,
      To: to.startsWith("whatsapp:") ? to : `whatsapp:${to}`,
      Body: message,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const json = (await res.json()) as { sid?: string; message?: string };
    if (!res.ok) {
      throw new Error(json.message ?? `Twilio HTTP ${res.status}`);
    }

    return {
      providerMessageId: json.sid ?? null,
      rawPayload: JSON.stringify({ to, provider: "twilio", sid: json.sid }),
    };
  }
}
