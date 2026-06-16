/**
 * MockProvider - dev/test only. Does not send anywhere. All "sends" succeed
 * and produce a deterministic providerMessageId for traceability.
 */
import { randomBytes } from "node:crypto";

import type {
  CommunicationProvider,
  SendResult,
} from "./CommunicationProvider";

function fakeId(): string {
  return `mock_${randomBytes(8).toString("hex")}`;
}

export class MockProvider implements CommunicationProvider {
  readonly name = "mock";

  async sendWhatsapp(
    to: string,
    message: string,
    opts?: { templateId?: string },
  ): Promise<SendResult> {
    // eslint-disable-next-line no-console
    console.info("[mock-whatsapp]", { to, message, opts });
    return {
      providerMessageId: fakeId(),
      rawPayload: JSON.stringify({ to, message, template: opts?.templateId }),
    };
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<SendResult> {
    // eslint-disable-next-line no-console
    console.info("[mock-email]", { to, subject, htmlLength: html.length });
    return {
      providerMessageId: fakeId(),
      rawPayload: JSON.stringify({ to, subject, htmlLength: html.length }),
    };
  }

  async sendSms(to: string, message: string): Promise<SendResult> {
    // eslint-disable-next-line no-console
    console.info("[mock-sms]", { to, message });
    return {
      providerMessageId: fakeId(),
      rawPayload: JSON.stringify({ to, message }),
    };
  }
}
