/**
 * MetaWhatsAppAdapter — real WhatsApp Business Cloud API adapter.
 *
 * Only constructed by the factory when WHATSAPP_PROVIDER=meta AND the required
 * secrets are present (see whatsappService.ts). Secrets are read server-side
 * from `serverEnv` and never leave this module. Sends go to the Graph API:
 *   - sendTemplate → type:"template" (named approved template)
 *   - sendText     → type:"text" (free-form, inside the 24h window)
 *
 * If a send fails, we surface a FAILED ProviderSendResult; the ledger persists
 * the failure. Inbound + status webhooks are parsed by the shared parser.
 */
import { extractVariables } from "@/features/fairtrain-funnel/automation/TemplateRenderer";
import {
  MessageStatus,
  type MessageStatusT,
} from "@/features/fairtrain-funnel/types";

import { mapMetaStatus } from "./DemoWhatsAppAdapter";
import { parseMetaWebhook } from "./metaWebhookParser";
import type {
  ProviderSendResult,
  SendTemplateArgs,
  SendTextArgs,
  TemplateValidationResult,
  WhatsAppService,
  WhatsAppWebhookEvent,
} from "./whatsappPort";

const GRAPH_VERSION = "v21.0";

export class MetaWhatsAppAdapter implements WhatsAppService {
  readonly name = "meta-whatsapp";
  readonly isSimulated = false;

  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
  ) {}

  private get endpoint(): string {
    return `https://graph.facebook.com/${GRAPH_VERSION}/${this.phoneNumberId}/messages`;
  }

  private async post(body: Record<string, unknown>): Promise<ProviderSendResult> {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const raw = await res.text();
    if (!res.ok) {
      // Do not throw — let the ledger record a FAILED message with the reason.
      let reason = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(raw) as { error?: { message?: string } };
        if (parsed.error?.message) reason = parsed.error.message;
      } catch {
        /* keep HTTP status */
      }
      return {
        providerMessageId: "",
        status: MessageStatus.FAILED,
        rawPayload: JSON.stringify({ ok: false, reason, raw: raw.slice(0, 2000) }),
        failedReason: reason,
      };
    }
    let providerMessageId = "";
    try {
      const parsed = JSON.parse(raw) as {
        messages?: Array<{ id?: string }>;
      };
      providerMessageId = parsed.messages?.[0]?.id ?? "";
    } catch {
      /* leave empty */
    }
    return {
      providerMessageId,
      status: MessageStatus.SENT,
      rawPayload: raw.slice(0, 4000),
    };
  }

  async sendTemplate(args: SendTemplateArgs): Promise<ProviderSendResult> {
    // Meta named templates carry their own approved copy; we still send the
    // resolved variables as body parameters in order.
    const params = Object.values(args.variables).map((text) => ({
      type: "text",
      text,
    }));
    const components =
      params.length > 0
        ? [{ type: "body", parameters: params }]
        : undefined;
    return this.post({
      messaging_product: "whatsapp",
      to: args.to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: args.templateName,
        language: { code: "de" },
        ...(components ? { components } : {}),
      },
    });
  }

  async sendText(args: SendTextArgs): Promise<ProviderSendResult> {
    return this.post({
      messaging_product: "whatsapp",
      to: args.to.replace(/^\+/, ""),
      type: "text",
      text: { body: args.body },
    });
  }

  async handleWebhook(payload: unknown): Promise<WhatsAppWebhookEvent[]> {
    return parseMetaWebhook(payload, (s) => this.mapProviderStatus(s));
  }

  mapProviderStatus(providerStatus: string): MessageStatusT {
    return mapMetaStatus(providerStatus);
  }

  validateTemplate(args: {
    body: string;
    variables: Record<string, string>;
  }): TemplateValidationResult {
    const unresolved = extractVariables(args.body).filter(
      (key) => !(key in args.variables) || args.variables[key] === undefined,
    );
    return {
      ok: unresolved.length === 0,
      unresolvedVariables: unresolved,
      errors: [],
    };
  }
}
