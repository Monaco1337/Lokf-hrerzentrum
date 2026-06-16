export interface EmailSendResult {
  providerMessageId: string | null;
  rawPayload: string;
}

export interface EmailProvider {
  readonly name: string;
  /** True when the provider is wired and credentials are present. */
  isConfigured(): boolean;
  send(to: string, subject: string, html: string): Promise<EmailSendResult>;
}
