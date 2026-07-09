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

import type { WhatsAppWebhookEvent, WhatsappFailureKind } from "./whatsappPort";

type StatusMapper = (providerStatus: string) => MessageStatusT;

/**
 * Map a Meta Cloud API error code to a disambiguated failure kind. Conservative
 * by design: only codes where Meta is explicit about the recipient produce a
 * specific verdict; everything else stays "generic" so we never fabricate an
 * "invalid number" / "not registered" classification from an ambiguous signal.
 * Ref: Meta WhatsApp Cloud API error codes.
 */
function classifyMetaFailure(code: string | undefined): WhatsappFailureKind {
  switch (code) {
    // Recipient is not a valid WhatsApp user.
    case "1013":
      return "not_registered";
    // Message undeliverable — Meta does not confirm the exact reason.
    case "131026":
      return "unreachable";
    default:
      return "generic";
  }
}

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
    const mapped = mapStatus(status);
    const event: WhatsAppWebhookEvent = {
      kind: "status",
      providerMessageId: id,
      status: mapped,
      at: tsToDate(s.timestamp),
    };
    if (phoneNumberId) event.businessPhoneNumberId = phoneNumberId;
    let errorCode: string | undefined;
    if (errors) {
      if (errors.code !== undefined) {
        errorCode = String(errors.code);
        event.errorCode = errorCode;
      }
      if (typeof errors.title === "string") event.reason = errors.title;
    }
    if (mapped === "FAILED") event.failure = classifyMetaFailure(errorCode);
    out.push(event);
  }

  for (const m of asArray(value.messages)) {
    const id = typeof m.id === "string" ? m.id : null;
    const from = typeof m.from === "string" ? m.from : null;
    if (!id || !from) continue;
    const type = typeof m.type === "string" ? m.type : "text";
    const reply = readButtonReply(m);
    const text = m.text as { body?: unknown } | undefined;
    const body =
      reply?.title ??
      (text && typeof text.body === "string"
        ? text.body
        : typeof m.type === "string"
          ? `[${m.type}]`
          : "[Nachricht]");
    const event: WhatsAppWebhookEvent = {
      kind: "inbound",
      from,
      providerMessageId: id,
      body,
      at: tsToDate(m.timestamp),
      messageType: type,
    };
    if (phoneNumberId) event.businessPhoneNumberId = phoneNumberId;
    if (displayPhone) event.businessPhone = displayPhone;
    if (reply) {
      if (reply.id) event.buttonId = reply.id;
      if (reply.title) event.buttonTitle = reply.title;
    }
    out.push(event);
  }
}

/**
 * Extract a quick-reply / interactive / list reply payload from a Meta inbound
 * message. Supports the three shapes Meta emits:
 *  - template quick-reply:  message.button.{payload,text}
 *  - interactive button:     message.interactive.button_reply.{id,title}
 *  - interactive list:       message.interactive.list_reply.{id,title}
 */
function readButtonReply(
  m: Record<string, unknown>,
): { id?: string; title?: string } | null {
  const button = m.button as { payload?: unknown; text?: unknown } | undefined;
  if (button && typeof button === "object") {
    const out: { id?: string; title?: string } = {};
    if (typeof button.payload === "string") out.id = button.payload;
    if (typeof button.text === "string") out.title = button.text;
    if (out.id || out.title) return out;
  }
  const interactive = m.interactive as
    | {
        button_reply?: { id?: unknown; title?: unknown };
        list_reply?: { id?: unknown; title?: unknown };
      }
    | undefined;
  if (interactive && typeof interactive === "object") {
    const r = interactive.button_reply ?? interactive.list_reply;
    if (r && typeof r === "object") {
      const out: { id?: string; title?: string } = {};
      if (typeof r.id === "string") out.id = r.id;
      if (typeof r.title === "string") out.title = r.title;
      if (out.id || out.title) return out;
    }
  }
  return null;
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
