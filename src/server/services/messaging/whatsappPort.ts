/**
 * WhatsAppService port — the provider abstraction boundary.
 *
 * This is the seam where the real Meta WhatsApp Business Cloud API adapter
 * plugs in. The CRM only ever talks to this interface, so swapping the demo
 * adapter for the real one requires NO changes to the UI, the message ledger
 * schema, or MessageLedgerService.
 *
 * (File name avoids a case-insensitive collision with `whatsappService.ts`.)
 */
import type { MessageStatusT } from "@/features/fairtrain-funnel/types";

export interface ProviderSendResult {
  /** Opaque provider-side id (simulated: `sim_...`, empty on failure). */
  providerMessageId: string;
  /** Provider-acknowledged initial status (QUEUED/SENT, or FAILED). */
  status: MessageStatusT;
  /** Raw provider response payload, persisted for debugging. */
  rawPayload: string;
  /** Human-readable failure reason when status is FAILED. */
  failedReason?: string;
}

export interface WebhookStatusEvent {
  kind: "status";
  providerMessageId: string;
  status: MessageStatusT;
  at: Date;
  errorCode?: string;
  reason?: string;
  /** Our business number (Meta `phone_number_id`) this event belongs to. */
  businessPhoneNumberId?: string;
}

export interface WebhookInboundEvent {
  kind: "inbound";
  /** Sender phone in E.164-ish form as provided by the provider. */
  from: string;
  providerMessageId: string;
  body: string;
  at: Date;
  /** Our business number (Meta `phone_number_id`) that received the message. */
  businessPhoneNumberId?: string;
  /** Our business display phone (E.164) that received the message. */
  businessPhone?: string;
}

export type WhatsAppWebhookEvent = WebhookStatusEvent | WebhookInboundEvent;

export interface TemplateValidationResult {
  ok: boolean;
  /** Variable placeholders still present after substitution. */
  unresolvedVariables: string[];
  errors: string[];
}

export interface SendTemplateArgs {
  to: string;
  templateName: string;
  body: string;
  variables: Record<string, string>;
  /** Send FROM this business number (Meta `phone_number_id`). Falls back to
   *  the env default number when omitted. */
  fromPhoneNumberId?: string;
}

export interface SendTextArgs {
  to: string;
  body: string;
  /** Send FROM this business number (Meta `phone_number_id`). Falls back to
   *  the env default number when omitted. */
  fromPhoneNumberId?: string;
}

export interface WhatsAppService {
  readonly name: string;
  /** True while no real provider is wired — every message is simulated. */
  readonly isSimulated: boolean;

  sendTemplate(args: SendTemplateArgs): Promise<ProviderSendResult>;
  sendText(args: SendTextArgs): Promise<ProviderSendResult>;

  /** Translate inbound provider webhook payloads into ledger events. */
  handleWebhook(payload: unknown): Promise<WhatsAppWebhookEvent[]>;

  /** Map a provider-specific status string onto the internal lifecycle. */
  mapProviderStatus(providerStatus: string): MessageStatusT;

  /** Pre-flight check that a rendered template has no unresolved variables. */
  validateTemplate(args: {
    body: string;
    variables: Record<string, string>;
  }): TemplateValidationResult;
}
