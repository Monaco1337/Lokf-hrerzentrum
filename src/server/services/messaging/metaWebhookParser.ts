/**
 * Shared parser for Meta WhatsApp Cloud API webhook payloads.
 *
 * Both the demo and the real adapter understand the exact same envelope so the
 * webhook contract never changes when the adapter is swapped. We support two
 * shapes:
 *  - the full Meta envelope: entry[].changes[].value.{messages,statuses}
 *  - a flattened test shape: { messages:[], statuses:[] }
 */
import type { MessageStatusT } from "@/features/fairtrain-funnel/types";

import type { WhatsAppWebhookEvent } from "./whatsappPort";

type StatusMapper = (providerStatus: string) => MessageStatusT;

function asArray(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : [];
}

function tsToDate(ts: unknown): Date {
  if (typeof ts === "string" && /^\d+$/.test(ts)) return new Date(Number(ts) * 1000);
  if (typeof ts === "number") return new Date(ts * 1000);
  return new Date();
}

/** Read the receiving business number from a change's `metadata` block. */
function readMetadata(value: Record<string, unknown>): {
  phoneNumberId?: string;
  displayPhone?: string;
} {
  const meta = value.metadata;
  if (!meta || typeof meta !== "object") return {};
  const m = meta as Record<string, unknown>;
  const out: { phoneNumberId?: string; displayPhone?: string } = {};
  if (typeof m.phone_number_id === "string") out.phoneNumberId = m.phone_number_id;
  if (typeof m.display_phone_number === "string") {
    out.displayPhone = m.display_phone_number;
  }
  return out;
}

function parseValue(
  value: Record<string, unknown>,
  mapStatus: StatusMapper,
  out: WhatsAppWebhookEvent[],
): void {
  const { phoneNumberId, displayPhone } = readMetadata(value);

  for (const s of asArray(value.statuses)) {
    const id = typeof s.id === "string" ? s.id : null;
    const status = typeof s.status === "string" ? s.status : null;
    if (!id || !status) continue;
    const errors = asArray(s.errors)[0];
    const event: WhatsAppWebhookEvent = {
      kind: "status",
      providerMessageId: id,
      status: mapStatus(status),
      at: tsToDate(s.timestamp),
    };
    if (phoneNumberId) event.businessPhoneNumberId = phoneNumberId;
    if (errors) {
      if (errors.code !== undefined) event.errorCode = String(errors.code);
      if (typeof errors.title === "string") event.reason = errors.title;
    }
    out.push(event);
  }

  for (const m of asArray(value.messages)) {
    const id = typeof m.id === "string" ? m.id : null;
    const from = typeof m.from === "string" ? m.from : null;
    if (!id || !from) continue;
    const text = m.text as { body?: unknown } | undefined;
    const body =
      text && typeof text.body === "string"
        ? text.body
        : typeof m.type === "string"
          ? `[${m.type}]`
          : "[Nachricht]";
    const event: WhatsAppWebhookEvent = {
      kind: "inbound",
      from,
      providerMessageId: id,
      body,
      at: tsToDate(m.timestamp),
    };
    if (phoneNumberId) event.businessPhoneNumberId = phoneNumberId;
    if (displayPhone) event.businessPhone = displayPhone;
    out.push(event);
  }
}

export function parseMetaWebhook(
  payload: unknown,
  mapStatus: StatusMapper,
): WhatsAppWebhookEvent[] {
  const out: WhatsAppWebhookEvent[] = [];
  if (!payload || typeof payload !== "object") return out;
  const p = payload as Record<string, unknown>;

  // Full Meta envelope.
  for (const entry of asArray(p.entry)) {
    for (const change of asArray(entry.changes)) {
      const value = change.value;
      if (value && typeof value === "object") {
        parseValue(value as Record<string, unknown>, mapStatus, out);
      }
    }
  }
  // Flattened test shape.
  if ("messages" in p || "statuses" in p) {
    parseValue(p, mapStatus, out);
  }
  return out;
}
