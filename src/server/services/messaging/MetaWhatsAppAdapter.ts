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
import { createHmac, timingSafeEqual } from "node:crypto";

import { normalizePhoneForWhatsApp } from "@/features/fairtrain-funnel/automation/PhoneNormalizer";
import { extractVariables } from "@/features/fairtrain-funnel/automation/TemplateRenderer";
import {
  MessageStatus,
  type MessageStatusT,
} from "@/features/fairtrain-funnel/types";

import { serverEnv } from "../../env";
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
    /** Default sender number; per-send `fromPhoneNumberId` overrides it. May be
     *  empty when all numbers are managed in the DB. */
    private readonly defaultPhoneNumberId: string,
  ) {}

  private endpoint(fromPhoneNumberId?: string): string {
    const id = fromPhoneNumberId || this.defaultPhoneNumberId;
    return `https://graph.facebook.com/${GRAPH_VERSION}/${id}/messages`;
  }

  /**
   * Meta requires the recipient in international E.164 WITHOUT the leading "+".
   * Lead phones are often stored in German national format ("0176…"); sending
   * that verbatim strips to a country-code-less number and Meta reports the
   * message as "undeliverable". Normalise (defaults to +49) then drop the "+".
   */
  private recipient(to: string): string {
    return normalizePhoneForWhatsApp(to).replace(/^\+/, "");
  }

  private async post(
    body: Record<string, unknown>,
    fromPhoneNumberId?: string,
  ): Promise<ProviderSendResult> {
    if (!fromPhoneNumberId && !this.defaultPhoneNumberId) {
      return {
        providerMessageId: "",
        status: MessageStatus.FAILED,
        rawPayload: JSON.stringify({ ok: false, reason: "no_sender_number" }),
        failedReason:
          "Keine Absender-Nummer bestimmt (WhatsApp-Nummer nicht konfiguriert).",
      };
    }
    const res = await fetch(this.endpoint(fromPhoneNumberId), {
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
    // Meta named templates carry their own approved copy with NUMBERED
    // placeholders ({{1}}, {{2}}, …). When the template defines an explicit,
    // ordered body-parameter mapping we send exactly that (in order, incl. the
    // empty "static template" case). Otherwise we fall back to the resolved
    // variable values for backwards compatibility.
    const orderedValues =
      args.bodyParams !== undefined
        ? args.bodyParams
        : Object.values(args.variables);
    const params = orderedValues.map((text) => ({
      type: "text",
      text,
    }));
    const components: Array<Record<string, unknown>> = [];
    if (params.length > 0) {
      components.push({ type: "body", parameters: params });
    }
    // Dynamic button components. Each entry maps onto one approved button by its
    // `index`. Quick-reply carries a payload; URL carries the dynamic suffix.
    // Static buttons (fixed URL / call) are rendered by Meta automatically and
    // are intentionally never sent here.
    for (const btn of args.buttons ?? []) {
      components.push({
        type: "button",
        sub_type: btn.subType,
        index: String(btn.index),
        parameters: [
          btn.subType === "quick_reply"
            ? { type: "payload", payload: btn.value }
            : { type: "text", text: btn.value },
        ],
      });
    }
    const result = await this.post(
      {
        messaging_product: "whatsapp",
        to: this.recipient(args.to),
        type: "template",
        template: {
          name: args.templateName,
          language: { code: args.languageCode?.trim() || "de" },
          ...(components.length > 0 ? { components } : {}),
        },
      },
      args.fromPhoneNumberId,
    );
    // Meta error (#132000) "number of parameters does not match" is purely a
    // COUNT mismatch between the placeholders ({{1}}, {{2}} …) in the approved
    // template and the parameters we send. Turn Meta's terse message into an
    // actionable hint that tells the operator exactly what we sent + how to fix.
    if (
      result.status === MessageStatus.FAILED &&
      result.failedReason &&
      /132000/.test(result.failedReason)
    ) {
      return {
        ...result,
        failedReason:
          `${result.failedReason} — Wir haben ${params.length} Text-Variable(n) ` +
          `an die Meta-Vorlage "${args.templateName}" gesendet, aber die in Meta ` +
          `freigegebene Vorlage erwartet eine andere Anzahl. Öffne die Vorlage im ` +
          `CRM und trage unter „Meta-Variablen ({{1}}, {{2}} …)" GENAU so viele ` +
          `Positionen ein, wie im Meta-Text nummerierte Platzhalter stehen ` +
          `(z. B. {{1}} = Vorname).`,
      };
    }
    return result;
  }

  async sendText(args: SendTextArgs): Promise<ProviderSendResult> {
    return this.post(
      {
        messaging_product: "whatsapp",
        to: this.recipient(args.to),
        type: "text",
        text: { body: args.body },
      },
      args.fromPhoneNumberId,
    );
  }

  async handleWebhook(payload: unknown): Promise<WhatsAppWebhookEvent[]> {
    return parseMetaWebhook(payload, (s) => this.mapProviderStatus(s));
  }

  /** HMAC-SHA256 of the raw body against the app secret (`x-hub-signature-256`). */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    const secret = serverEnv.WHATSAPP_APP_SECRET;
    if (!secret || !signatureHeader) return false;
    const expected = `sha256=${createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex")}`;
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
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
