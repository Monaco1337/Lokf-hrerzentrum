-- WhatsApp status tracking: lead-level status/engagement fields, message-level
-- reply/raw-payload columns, and an append-only provider-event ledger with a
-- unique idempotency key. Idempotent (IF NOT EXISTS) — safe on any DB state.

-- 1) Lead: WhatsApp status + engagement fields (defaults => all existing and
--    imported leads start "offen / unbekannt / unbewertet / 0").
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "whatsappStatus" TEXT NOT NULL DEFAULT 'offen';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "whatsappReachability" TEXT NOT NULL DEFAULT 'unbekannt';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "leadQualityStatus" TEXT NOT NULL DEFAULT 'unbewertet';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "leadScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastWhatsappMessageAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastWhatsappDeliveredAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastWhatsappReadAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastWhatsappReplyAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastWhatsappErrorAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastWhatsappErrorReason" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastInboundMessage" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastInboundMessageAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Lead_whatsappStatus_idx" ON "Lead"("whatsappStatus");
CREATE INDEX IF NOT EXISTS "Lead_leadQualityStatus_idx" ON "Lead"("leadQualityStatus");

-- 2) CommunicationEvent: reply marker + raw payload for debugging.
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3);
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "rawWebhookPayload" TEXT;

-- 3) Provider-event ledger (idempotency + debugging).
CREATE TABLE IF NOT EXISTS "WhatsappMessageEvent" (
  "id" TEXT NOT NULL,
  "messageId" TEXT,
  "leadId" TEXT,
  "provider" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "providerMessageId" TEXT NOT NULL,
  "payload" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsappMessageEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappMessageEvent_providerMessageId_eventType_key"
  ON "WhatsappMessageEvent"("providerMessageId", "eventType");
CREATE INDEX IF NOT EXISTS "WhatsappMessageEvent_leadId_createdAt_idx"
  ON "WhatsappMessageEvent"("leadId", "createdAt");
CREATE INDEX IF NOT EXISTS "WhatsappMessageEvent_messageId_idx"
  ON "WhatsappMessageEvent"("messageId");
