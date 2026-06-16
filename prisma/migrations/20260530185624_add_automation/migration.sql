-- CreateTable
CREATE TABLE "AutomationTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "requiresConsent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AutomationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "templateId" TEXT,
    "trigger" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "renderedSubject" TEXT,
    "renderedBody" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "triggeredBy" TEXT NOT NULL DEFAULT 'system',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomationLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AutomationLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AutomationTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationTemplate_slug_key" ON "AutomationTemplate"("slug");

-- CreateIndex
CREATE INDEX "AutomationTemplate_trigger_channel_idx" ON "AutomationTemplate"("trigger", "channel");

-- CreateIndex
CREATE INDEX "AutomationTemplate_enabled_idx" ON "AutomationTemplate"("enabled");

-- CreateIndex
CREATE INDEX "AutomationLog_leadId_createdAt_idx" ON "AutomationLog"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationLog_status_createdAt_idx" ON "AutomationLog"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AutomationLog_trigger_createdAt_idx" ON "AutomationLog"("trigger", "createdAt");
