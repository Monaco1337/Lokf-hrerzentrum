import type { EmailProvider, EmailSendResult } from "./EmailProvider";

/**
 * Transactional email via the Resend HTTP API (native fetch — no SDK dependency).
 *
 * Server-only: the API key never leaves the server. Adds `reply_to` and a
 * plain-text fallback derived from the HTML so inbox clients without HTML
 * rendering still show the message.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly replyTo: string = "",
  ) {}

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.from);
  }

  async send(
    to: string,
    subject: string,
    html: string,
  ): Promise<EmailSendResult> {
    const payload: Record<string, unknown> = {
      from: this.from,
      to: [to],
      subject,
      html,
      text: htmlToText(html),
    };
    if (this.replyTo) {
      payload.reply_to = this.replyTo;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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

/** Minimal HTML → text fallback: strip tags, decode the few entities we emit. */
function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*p\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
