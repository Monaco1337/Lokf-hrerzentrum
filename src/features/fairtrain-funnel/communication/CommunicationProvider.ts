/**
 * Communication provider interface.
 *
 * The MVP ships a MockProvider. Real Meta Cloud API, 360Dialog and Twilio
 * adapters can be swapped in via the factory. The interface is intentionally
 * narrow so providers stay interchangeable.
 *
 * Callers must NEVER invoke a provider from React components. Use
 * `CommunicationService` on the server side - it persists a
 * CommunicationEvent for every send (success or failure).
 */

export interface SendResult {
  /** Provider-specific message id, when available. */
  providerMessageId: string | null;
  /** Free-form provider payload (already stringified) for the audit trail. */
  rawPayload: string;
}

export interface CommunicationProvider {
  readonly name: string;
  sendWhatsapp(
    to: string,
    message: string,
    opts?: { templateId?: string },
  ): Promise<SendResult>;
  sendEmail(to: string, subject: string, html: string): Promise<SendResult>;
  sendSms?(to: string, message: string): Promise<SendResult>;
}
