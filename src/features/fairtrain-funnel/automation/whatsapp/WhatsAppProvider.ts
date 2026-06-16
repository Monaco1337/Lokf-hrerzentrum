export interface WhatsAppSendResult {
  providerMessageId: string | null;
  rawPayload: string;
}

export interface WhatsAppProvider {
  readonly name: string;
  isConfigured(): boolean;
  send(to: string, message: string): Promise<WhatsAppSendResult>;
}
