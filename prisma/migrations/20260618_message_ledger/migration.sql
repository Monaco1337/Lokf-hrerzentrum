-- Message ledger: extend CommunicationEvent into the full WhatsApp/communication
-- message ledger. Idempotent (IF NOT EXISTS) so it applies safely regardless of
-- how the production database was provisioned. No data is dropped or rewritten.

ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'TEXT';
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "templateName" TEXT;
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "variablesResolved" TEXT;
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SENT';
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "statusHistory" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "sentBy" TEXT NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "actorId" TEXT;
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "failedAt" TIMESTAMP(3);
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "failedReason" TEXT;

CREATE INDEX IF NOT EXISTS "CommunicationEvent_channel_direction_idx" ON "CommunicationEvent"("channel", "direction");
CREATE INDEX IF NOT EXISTS "CommunicationEvent_status_idx" ON "CommunicationEvent"("status");
