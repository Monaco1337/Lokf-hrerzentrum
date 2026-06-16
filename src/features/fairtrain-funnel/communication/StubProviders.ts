/**
 * Stub providers for Meta Cloud API, 360Dialog and Twilio.
 *
 * These throw `ProviderNotConfiguredError` on every call so unconfigured
 * environments fail loudly. Real implementations replace these classes
 * without touching the factory or the CommunicationService.
 */
import { ProviderNotConfiguredError } from "@/server/errors";

import type {
  CommunicationProvider,
  SendResult,
} from "./CommunicationProvider";

function notConfigured(name: string): never {
  throw new ProviderNotConfiguredError(name);
}

export class MetaCloudProvider implements CommunicationProvider {
  readonly name = "meta";
  async sendWhatsapp(): Promise<SendResult> {
    return notConfigured("meta");
  }
  async sendEmail(): Promise<SendResult> {
    return notConfigured("meta");
  }
}

export class Dialog360Provider implements CommunicationProvider {
  readonly name = "dialog360";
  async sendWhatsapp(): Promise<SendResult> {
    return notConfigured("dialog360");
  }
  async sendEmail(): Promise<SendResult> {
    return notConfigured("dialog360");
  }
}

export class TwilioProvider implements CommunicationProvider {
  readonly name = "twilio";
  async sendWhatsapp(): Promise<SendResult> {
    return notConfigured("twilio");
  }
  async sendEmail(): Promise<SendResult> {
    return notConfigured("twilio");
  }
  async sendSms(): Promise<SendResult> {
    return notConfigured("twilio");
  }
}
