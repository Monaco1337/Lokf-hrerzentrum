import type { EmailProvider, EmailSendResult } from "./EmailProvider";

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.from);
  }

  async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<EmailSendResult> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: this.from, to: [to], subject, html }),
    });

    const body = (await res.json()) as { id?: string; message?: string };
    if (!res.ok) {
      throw new Error(body.message ?? `Resend HTTP ${res.status}`);
    }

    return {
      providerMessageId: body.id ?? null,
      rawPayload: JSON.stringify({ to, subject, provider: "resend", id: body.id }),
    };
  }
}
