/**
 * CommunicationService - the only allowed call site for providers.
 *
 * Every send produces a CommunicationEvent row, including failures. Provider
 * configuration errors are caught, logged as events, and re-thrown.
 */
import {
  CommunicationChannel,
  CommunicationDirection,
} from "@/features/fairtrain-funnel/types";
import {
  type CommunicationProvider,
  type SendResult,
} from "@/features/fairtrain-funnel/communication/CommunicationProvider";
import { createProvider } from "@/features/fairtrain-funnel/communication/factory";

import { serverEnv } from "../env";
import { DomainError } from "../errors";
import { communicationRepository } from "../repositories/CommunicationRepository";

export interface SendWhatsappArgs {
  leadId: string;
  to: string;
  message: string;
  templateId?: string;
}

export interface SendEmailArgs {
  leadId: string;
  to: string;
  subject: string;
  html: string;
}

export class CommunicationService {
  constructor(
    private readonly provider: CommunicationProvider = createProvider(
      serverEnv.COMMUNICATION_PROVIDER,
    ),
  ) {}

  async sendWhatsapp(args: SendWhatsappArgs): Promise<SendResult> {
    return this.recordedSend(
      args.leadId,
      CommunicationChannel.WHATSAPP,
      () =>
        this.provider.sendWhatsapp(
          args.to,
          args.message,
          args.templateId ? { templateId: args.templateId } : undefined,
        ),
    );
  }

  async sendEmail(args: SendEmailArgs): Promise<SendResult> {
    return this.recordedSend(args.leadId, CommunicationChannel.EMAIL, () =>
      this.provider.sendEmail(args.to, args.subject, args.html),
    );
  }

  private async recordedSend(
    leadId: string,
    channel: CommunicationChannel,
    fn: () => Promise<SendResult>,
  ): Promise<SendResult> {
    try {
      const result = await fn();
      await communicationRepository.append({
        leadId,
        channel,
        direction: CommunicationDirection.OUT,
        payload: result.rawPayload,
        providerMessageId: result.providerMessageId,
        errorCode: null,
      });
      return result;
    } catch (err) {
      const code =
        err instanceof DomainError ? err.code : "PROVIDER_UNAVAILABLE";
      const message = err instanceof Error ? err.message : "unknown";
      await communicationRepository.append({
        leadId,
        channel,
        direction: CommunicationDirection.OUT,
        payload: JSON.stringify({ error: message, provider: this.provider.name }),
        providerMessageId: null,
        errorCode: code,
      });
      throw err;
    }
  }
}

export const communicationService = new CommunicationService();
