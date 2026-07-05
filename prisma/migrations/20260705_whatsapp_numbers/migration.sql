-- Multi-number WhatsApp ("Multichat"): one row per WhatsApp Business Cloud API
-- sender number, plus a column on the message ledger recording which of our
-- numbers handled each message. Idempotent (IF NOT EXISTS) so it applies safely
-- regardless of how the production database was provisioned.

-- 1) Message ledger: which business number handled the message.
ALTER TABLE "CommunicationEvent" ADD COLUMN IF NOT EXISTS "businessPhoneNumberId" TEXT;
CREATE INDEX IF NOT EXISTS "CommunicationEvent_businessPhoneNumberId_idx" ON "CommunicationEvent"("businessPhoneNumberId");

-- 2) The WhatsApp sender numbers.
CREATE TABLE IF NOT EXISTS "WhatsAppNumber" (
  "id" TEXT NOT NULL,
  "phoneNumberId" TEXT NOT NULL,
  "displayPhone" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "assignedUserId" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppNumber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WhatsAppNumber_phoneNumberId_key" ON "WhatsAppNumber"("phoneNumberId");
CREATE INDEX IF NOT EXISTS "WhatsAppNumber_active_idx" ON "WhatsAppNumber"("active");
CREATE INDEX IF NOT EXISTS "WhatsAppNumber_assignedUserId_idx" ON "WhatsAppNumber"("assignedUserId");

-- FK to User (SET NULL on delete). Guarded so a re-run does not error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WhatsAppNumber_assignedUserId_fkey'
  ) THEN
    ALTER TABLE "WhatsAppNumber"
      ADD CONSTRAINT "WhatsAppNumber_assignedUserId_fkey"
      FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
