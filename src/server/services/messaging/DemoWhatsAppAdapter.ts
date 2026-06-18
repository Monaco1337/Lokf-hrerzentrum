/**
 * DemoWhatsAppAdapter — the simulation adapter (default).
 *
 * Generates fake provider ids and acknowledges sends as QUEUED. Never performs
 * a network call and requires no credentials. Every message it produces is
 * flagged demo by the caller. `handleWebhook` understands a minimal Meta-shaped
 * payload so it shares the exact contract of the real adapter.
 */
import { randomBytes } from "node:crypto";

import { extractVariables } from "@/features/fairtrain-funnel/automation/TemplateRenderer";
import {
  MessageStatus,
  type MessageStatusT,
} from "@/features/fairtrain-funnel/types";

import { parseMetaWebhook } from "./metaWebhookParser";
import type {
  ProviderSendResult,
  SendTemplateArgs,
  SendTextArgs,
  TemplateValidationResult,
  WhatsAppService,
  WhatsAppWebhookEvent,
} from "./whatsappPort";

function simId(): string {
  return `sim_${randomBytes(10).toString("hex")}`;
}

export class DemoWhatsAppAdapter implements WhatsAppService {
  readonly name = "demo-whatsapp";
  readonly isSimulated = true;

  async sendTemplate(args: SendTemplateArgs): Promise<ProviderSendResult> {
    return {
      providerMessageId: simId(),
      status: MessageStatus.QUEUED,
      rawPayload: JSON.stringify({
        simulated: true,
        to: args.to,
        template: args.templateName,
        body: args.body,
      }),
    };
  }

  async sendText(args: SendTextArgs): Promise<ProviderSendResult> {
    return {
      providerMessageId: simId(),
      status: MessageStatus.QUEUED,
      rawPayload: JSON.stringify({ simulated: true, to: args.to, body: args.body }),
    };
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

/** Meta WhatsApp Cloud API status strings → internal lifecycle. */
const META_STATUS_MAP: Record<string, MessageStatusT> = {
  accepted: MessageStatus.QUEUED,
  queued: MessageStatus.QUEUED,
  sent: MessageStatus.SENT,
  delivered: MessageStatus.DELIVERED,
  read: MessageStatus.READ,
  failed: MessageStatus.FAILED,
};

export function mapMetaStatus(providerStatus: string): MessageStatusT {
  return META_STATUS_MAP[providerStatus.toLowerCase()] ?? MessageStatus.SENT;
}
