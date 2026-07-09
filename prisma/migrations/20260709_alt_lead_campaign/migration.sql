-- Alt-Lead reactivation campaign: additive Lead campaign fields, import batch +
-- row tables, and the campaign send-queue with a per-(lead,step,channel)
-- idempotency key. Idempotent (IF NOT EXISTS) — safe on any DB state.

-- 1) Lead: reactivation campaign layer (separate from the pipeline `status`).
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "leadType" TEXT NOT NULL DEFAULT 'neu';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "campaign" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "campaignStatus" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "campaignStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "communicationStarted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "firstContactSentAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "automationPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "campaignCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "employmentSnapshot" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "nextCampaignActionAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Lead_leadType_idx" ON "Lead"("leadType");
CREATE INDEX IF NOT EXISTS "Lead_campaign_idx" ON "Lead"("campaign");
CREATE INDEX IF NOT EXISTS "Lead_campaignStatus_idx" ON "Lead"("campaignStatus");
CREATE INDEX IF NOT EXISTS "Lead_nextCampaignActionAt_idx" ON "Lead"("nextCampaignActionAt");

-- 2) Import batch (overview counters + controlled release/rollback).
CREATE TABLE IF NOT EXISTS "LeadImportBatch" (
  "id" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "leadType" TEXT NOT NULL DEFAULT 'alt_lead',
  "campaign" TEXT NOT NULL DEFAULT 'reaktivierung_alt_leads',
  "status" TEXT NOT NULL DEFAULT 'imported',
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "imported" INTEGER NOT NULL DEFAULT 0,
  "duplicates" INTEGER NOT NULL DEFAULT 0,
  "invalid" INTEGER NOT NULL DEFAULT 0,
  "alreadyContacted" INTEGER NOT NULL DEFAULT 0,
  "whatsappAvailable" INTEGER NOT NULL DEFAULT 0,
  "emailAvailable" INTEGER NOT NULL DEFAULT 0,
  "releaseTier" TEXT,
  "releasedCount" INTEGER,
  "releasedAt" TIMESTAMP(3),
  "releasedById" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadImportBatch_campaign_createdAt_idx" ON "LeadImportBatch"("campaign", "createdAt");
CREATE INDEX IF NOT EXISTS "LeadImportBatch_status_idx" ON "LeadImportBatch"("status");

-- 3) Import rows (idempotency + error/duplicate display).
CREATE TABLE IF NOT EXISTS "LeadImportRow" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "rowIndex" INTEGER NOT NULL,
  "rawJson" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "leadId" TEXT,
  "errorReason" TEXT,
  "phoneNormalized" TEXT,
  "emailNormalized" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadImportRow_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LeadImportRow_batchId_status_idx" ON "LeadImportRow"("batchId", "status");
CREATE INDEX IF NOT EXISTS "LeadImportRow_phoneNormalized_idx" ON "LeadImportRow"("phoneNormalized");
CREATE INDEX IF NOT EXISTS "LeadImportRow_emailNormalized_idx" ON "LeadImportRow"("emailNormalized");

DO $$ BEGIN
  ALTER TABLE "LeadImportRow"
    ADD CONSTRAINT "LeadImportRow_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "LeadImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Campaign send queue (per-lead/step/channel idempotency).
CREATE TABLE IF NOT EXISTS "CampaignMessageJob" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "campaign" TEXT NOT NULL,
  "step" INTEGER NOT NULL,
  "channel" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "sentAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignMessageJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CampaignMessageJob_leadId_step_channel_key"
  ON "CampaignMessageJob"("leadId", "step", "channel");
CREATE INDEX IF NOT EXISTS "CampaignMessageJob_status_scheduledFor_idx"
  ON "CampaignMessageJob"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "CampaignMessageJob_campaign_step_idx"
  ON "CampaignMessageJob"("campaign", "step");

DO $$ BEGIN
  ALTER TABLE "CampaignMessageJob"
    ADD CONSTRAINT "CampaignMessageJob_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
