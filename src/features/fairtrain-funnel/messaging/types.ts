/**
 * Messaging / communication ledger domain types.
 *
 * The CommunicationEvent row IS the message ledger. These enums describe the
 * lifecycle and provenance of every message so the UI can render rich status
 * chips, delivery history and provenance without knowing whether a message was
 * simulated or sent through a future real WhatsApp Cloud API adapter.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Message type.
// ---------------------------------------------------------------------------
export const MessageType = {
  TEMPLATE: "TEMPLATE",
  TEXT: "TEXT",
  SYSTEM: "SYSTEM",
  MEDIA: "MEDIA",
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];
export const MessageTypeSchema = z.enum(["TEMPLATE", "TEXT", "SYSTEM", "MEDIA"]);
export const MESSAGE_TYPE_LABEL: Record<MessageType, string> = {
  TEMPLATE: "Vorlage",
  TEXT: "Freitext",
  SYSTEM: "System",
  MEDIA: "Medien",
};

// ---------------------------------------------------------------------------
// Message status lifecycle.
// ---------------------------------------------------------------------------
export const MessageStatus = {
  DRAFT: "DRAFT",
  QUEUED: "QUEUED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  READ: "READ",
  FAILED: "FAILED",
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];
export const MessageStatusSchema = z.enum([
  "DRAFT",
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
  "FAILED",
]);
export const MESSAGE_STATUS_LABEL: Record<MessageStatus, string> = {
  DRAFT: "Entwurf",
  QUEUED: "In Warteschlange",
  SENT: "Gesendet",
  DELIVERED: "Zugestellt",
  READ: "Gelesen",
  FAILED: "Fehlgeschlagen",
};

/** Forward order of the outbound delivery lifecycle (excluding terminal FAILED). */
export const MESSAGE_STATUS_FLOW: ReadonlyArray<MessageStatus> = [
  "QUEUED",
  "SENT",
  "DELIVERED",
  "READ",
];

// ---------------------------------------------------------------------------
// Who sent the message.
// ---------------------------------------------------------------------------
export const MessageSentBy = {
  AUTOMATION: "AUTOMATION",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
} as const;
export type MessageSentBy = (typeof MessageSentBy)[keyof typeof MessageSentBy];
export const MessageSentBySchema = z.enum(["AUTOMATION", "ADMIN", "SYSTEM"]);
export const MESSAGE_SENT_BY_LABEL: Record<MessageSentBy, string> = {
  AUTOMATION: "Automation",
  ADMIN: "Mitarbeiter",
  SYSTEM: "System",
};

// ---------------------------------------------------------------------------
// Status history entry.
// ---------------------------------------------------------------------------
export interface MessageStatusChange {
  status: MessageStatus;
  at: string; // ISO timestamp
}
export const MessageStatusChangeSchema = z.object({
  status: MessageStatusSchema,
  at: z.string(),
});

// ---------------------------------------------------------------------------
// WhatsApp adapter configuration health (UI-safe; booleans only, no secrets).
// ---------------------------------------------------------------------------
export type WhatsAppConfigStatus =
  | "configured" // meta selected + all required secrets present → live
  | "missing_env" // meta selected but secrets incomplete → falls back to demo
  | "disabled" // explicitly turned off
  | "demo_only"; // simulation adapter (default)

export interface WhatsAppConfigInfo {
  providerName: string;
  status: WhatsAppConfigStatus;
  isLive: boolean;
  adapter: string;
  hasToken: boolean;
  hasPhoneNumberId: boolean;
  hasVerifyToken: boolean;
  hasAppSecret: boolean;
}
