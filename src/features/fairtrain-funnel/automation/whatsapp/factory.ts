import { serverEnv } from "@/server/env";

import { DisabledWhatsAppProvider } from "./DisabledWhatsAppProvider";
import { MetaWhatsAppProvider } from "./MetaWhatsAppProvider";
import { MockWhatsAppProvider } from "./MockWhatsAppProvider";
import { TwilioWhatsAppProvider } from "./TwilioWhatsAppProvider";
import type { WhatsAppProvider } from "./WhatsAppProvider";

export type WhatsAppProviderName = "disabled" | "mock" | "meta" | "twilio";

export function createWhatsAppProvider(
  name: WhatsAppProviderName = serverEnv.WHATSAPP_PROVIDER,
): WhatsAppProvider {
  switch (name) {
    case "mock":
      return new MockWhatsAppProvider();
    case "meta":
      return new MetaWhatsAppProvider(
        serverEnv.META_WABA_TOKEN,
        serverEnv.META_PHONE_NUMBER_ID,
      );
    case "twilio":
      return new TwilioWhatsAppProvider(
        serverEnv.TWILIO_ACCOUNT_SID,
        serverEnv.TWILIO_AUTH_TOKEN,
        serverEnv.TWILIO_WHATSAPP_FROM,
      );
    case "disabled":
    default:
      return new DisabledWhatsAppProvider();
  }
}
