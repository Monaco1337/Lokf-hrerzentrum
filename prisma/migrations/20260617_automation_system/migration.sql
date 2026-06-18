-- Automation & template system.
-- Written idempotently (IF NOT EXISTS) so it is safe to apply regardless of
-- how the production database was originally provisioned (migrate deploy or
-- db push). No data is dropped or rewritten.

-- AutomationTemplate: configurable message-template metadata.
ALTER TABLE "AutomationTemplate" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'welcome';
ALTER TABLE "AutomationTemplate" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "AutomationTemplate" ADD COLUMN IF NOT EXISTS "language" TEXT NOT NULL DEFAULT 'de';
ALTER TABLE "AutomationTemplate" ADD COLUMN IF NOT EXISTS "metaTemplateName" TEXT;
ALTER TABLE "AutomationTemplate" ADD COLUMN IF NOT EXISTS "metaApprovalStatus" TEXT;
ALTER TABLE "AutomationTemplate" ADD COLUMN IF NOT EXISTS "usageCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AutomationTemplate" ADD COLUMN IF NOT EXISTS "lastUsedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "AutomationTemplate_category_status_idx" ON "AutomationTemplate"("category", "status");

-- AutomationRule.
CREATE TABLE IF NOT EXISTS "AutomationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" TEXT NOT NULL,
    "conditions" TEXT NOT NULL DEFAULT '[]',
    "actions" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "runMode" TEXT NOT NULL DEFAULT 'demo',
    "lastRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AutomationRule_trigger_status_idx" ON "AutomationRule"("trigger", "status");
CREATE INDEX IF NOT EXISTS "AutomationRule_status_idx" ON "AutomationRule"("status");

-- AutomationRunLog.
CREATE TABLE IF NOT EXISTS "AutomationRunLog" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "leadId" TEXT,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '{}',
    "isTest" BOOLEAN NOT NULL DEFAULT true,
    "triggeredBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationRunLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AutomationRunLog_ruleId_createdAt_idx" ON "AutomationRunLog"("ruleId", "createdAt");
CREATE INDEX IF NOT EXISTS "AutomationRunLog_leadId_idx" ON "AutomationRunLog"("leadId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'AutomationRunLog_ruleId_fkey'
  ) THEN
    ALTER TABLE "AutomationRunLog"
      ADD CONSTRAINT "AutomationRunLog_ruleId_fkey"
      FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
