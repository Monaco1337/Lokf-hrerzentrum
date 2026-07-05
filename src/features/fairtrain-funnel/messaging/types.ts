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
  /** How many active sender numbers are configured in the DB. */
  activeNumberCount?: number;
}

// ---------------------------------------------------------------------------
// WhatsApp sender numbers (multi-number Multichat). UI-safe: never a secret.
// ---------------------------------------------------------------------------

/** A configured WhatsApp Business Cloud API sender number. */
export interface WhatsAppNumberRecord {
  id: string;
  /** Meta Cloud API `phone_number_id` (opaque id, not the phone number). */
  phoneNumberId: string;
  /** Human-readable E.164 number for display, e.g. "+4915112345678". */
  displayPhone: string;
  /** Free-text label, e.g. "Vertrieb Danijel". */
  label: string;
  /** Owning sales rep id (auto-assignment target) or null. */
  assignedUserId: string | null;
  /** Owning sales rep display name, resolved for the UI, or null. */
  assignedUserName: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Multichat unified inbox — UI-ready, serialisable conversation shapes.
// ---------------------------------------------------------------------------

export interface MultichatMessage {
  id: string;
  direction: "IN" | "OUT";
  body: string;
  status: string;
  isDemo: boolean;
  businessPhoneNumberId: string | null;
  createdAt: string;
}

export interface MultichatConversation {
  leadId: string;
  leadName: string;
  phone: string;
  assignedUserId: string | null;
  assignedName: string | null;
  businessPhoneNumberId: string | null;
  numberLabel: string | null;
  lastAt: string;
  preview: string;
  unread: number;
  total: number;
  messages: MultichatMessage[];
}

export interface MultichatNumberOption {
  phoneNumberId: string;
  label: string;
  displayPhone: string;
}

export interface MultichatData {
  conversations: MultichatConversation[];
  numbers: MultichatNumberOption[];
  whatsappLive: boolean;
}
