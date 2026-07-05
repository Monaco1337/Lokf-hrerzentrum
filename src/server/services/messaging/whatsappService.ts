/**
 * whatsappService — adapter selection for the message ledger.
 *
 * The CRM always imports `whatsappService` from here; the concrete adapter is
 * chosen once at module load from the environment:
 *
 *   WHATSAPP_PROVIDER=meta + META_WABA_TOKEN + META_PHONE_NUMBER_ID present
 *     → MetaWhatsAppAdapter (real, server-side, sends real messages)
 *   otherwise
 *     → DemoWhatsAppAdapter (simulation, never sends)
 *
 * No secrets are ever exported; `getWhatsAppConfigStatus()` returns booleans
 * only so the settings UI can show configuration health without leaking creds.
 */
import type {
  WhatsAppConfigInfo,
  WhatsAppConfigStatus,
} from "@/features/fairtrain-funnel/messaging/types";

import { serverEnv } from "../../env";
import { DemoWhatsAppAdapter } from "./DemoWhatsAppAdapter";
import { MetaWhatsAppAdapter } from "./MetaWhatsAppAdapter";
import type { WhatsAppService } from "./whatsappPort";

export type { WhatsAppConfigInfo, WhatsAppConfigStatus };

// Real sending is gated on the WABA System-User token only. The per-number
// `phone_number_id` no longer has to live in the env — numbers are managed in
// the DB (WhatsAppNumber) and passed per send. A single token sends from every
// number under the WABA.
function metaSecretsPresent(): boolean {
  return Boolean(serverEnv.META_WABA_TOKEN);
}

/** Compute config health for the settings UI. Booleans only — no secrets. */
export function getWhatsAppConfigStatus(): WhatsAppConfigInfo {
  const provider = serverEnv.WHATSAPP_PROVIDER;
  const hasToken = Boolean(serverEnv.META_WABA_TOKEN);
  const hasPhoneNumberId = Boolean(serverEnv.META_PHONE_NUMBER_ID);
  const hasVerifyToken = Boolean(serverEnv.WHATSAPP_VERIFY_TOKEN);
  const hasAppSecret = Boolean(serverEnv.WHATSAPP_APP_SECRET);

  let status: WhatsAppConfigStatus;
  if (provider === "disabled") status = "disabled";
  else if (provider === "meta") status = metaSecretsPresent() ? "configured" : "missing_env";
  else status = "demo_only";

  const isLive = status === "configured";
  return {
    providerName: provider,
    status,
    isLive,
    adapter: isLive ? "meta-whatsapp" : "demo-whatsapp",
    hasToken,
    hasPhoneNumberId,
    hasVerifyToken,
    hasAppSecret,
  };
}

function createWhatsAppService(): WhatsAppService {
  if (serverEnv.WHATSAPP_PROVIDER === "meta" && metaSecretsPresent()) {
    // `META_PHONE_NUMBER_ID` is only a fallback default now; per-send
    // `fromPhoneNumberId` (from the WhatsAppNumber table) is authoritative.
    return new MetaWhatsAppAdapter(
      serverEnv.META_WABA_TOKEN,
      serverEnv.META_PHONE_NUMBER_ID,
    );
  }
  return new DemoWhatsAppAdapter();
}

export const whatsappService: WhatsAppService = createWhatsAppService();
