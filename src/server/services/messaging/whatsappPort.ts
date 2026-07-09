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

/**
 * Disambiguated failure reason for a FAILED status, derived from the provider's
 * error code. We only ever set the specific kinds when the provider is explicit
 * — otherwise we stay conservative with "generic"/"unreachable" and never
 * invent an "invalid number" / "not registered" verdict.
 */
export type WhatsappFailureKind =
  | "generic" // -> fehlgeschlagen
  | "invalid_number" // -> nummer_ungueltig
  | "not_registered" // -> nicht_registriert
  | "unreachable"; // -> nicht_erreichbar

export interface WebhookStatusEvent {
  kind: "status";
  providerMessageId: string;
  status: MessageStatusT;
  at: Date;
  errorCode?: string;
  reason?: string;
  /** Set only when status is FAILED — classified from the provider error code. */
  failure?: WhatsappFailureKind;
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
  /** Message type: text | button | interactive | list | image | ... */
  messageType?: string;
  /**
   * Quick-reply / interactive button payload id, when the inbound message is a
   * button/list reply (Meta `button.payload`, `interactive.button_reply.id`,
   * `interactive.list_reply.id`).
   */
  buttonId?: string;
  /** Human-readable button/list title the user tapped. */
  buttonTitle?: string;
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

  /**
   * Verify a webhook request's signature against the provider secret. Returns
   * false when no secret is configured or the signature does not match, so the
   * caller can reject unverified traffic. Providers without a signature scheme
   * return false (the route then refuses to process).
   */
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;

  /** Map a provider-specific status string onto the internal lifecycle. */
  mapProviderStatus(providerStatus: string): MessageStatusT;

  /** Pre-flight check that a rendered template has no unresolved variables. */
  validateTemplate(args: {
    body: string;
    variables: Record<string, string>;
  }): TemplateValidationResult;
}
