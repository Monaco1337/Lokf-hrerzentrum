-- Unified Workflow Engine (2026-07-15).
--
-- Additive only: three new tables that power the single visual branching
-- automation (WorkflowDefinition = graph, WorkflowRun = per-lead cursor,
-- WorkflowRunStep = idempotent per-node ledger). NOTHING existing is touched —
-- AutomationRule and CampaignMessageJob stay exactly as they are, so no data is
-- lost and rollback is instant.
--
-- Idempotent (IF NOT EXISTS) so it applies safely regardless of how the
-- production database was provisioned.

CREATE TABLE IF NOT EXISTS "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "processKey" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "graph" TEXT NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WorkflowDefinition_processKey_status_idx" ON "WorkflowDefinition"("processKey", "status");
CREATE INDEX IF NOT EXISTS "WorkflowDefinition_trigger_status_idx" ON "WorkflowDefinition"("trigger", "status");

CREATE TABLE IF NOT EXISTS "WorkflowRun" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "definitionVersion" INTEGER NOT NULL DEFAULT 1,
    "processKey" TEXT NOT NULL,
    "graphSnapshot" TEXT NOT NULL DEFAULT '{}',
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentNodeId" TEXT,
    "resumeAt" TIMESTAMP(3),
    "enteredNodeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastInboundAt" TIMESTAMP(3),
    "context" TEXT NOT NULL DEFAULT '{}',
    "activeKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkflowRun_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkflowRun_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Single-active-run lock: only ONE active/waiting run per (lead, process).
CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowRun_leadId_activeKey_key" ON "WorkflowRun"("leadId", "activeKey");
CREATE INDEX IF NOT EXISTS "WorkflowRun_status_resumeAt_idx" ON "WorkflowRun"("status", "resumeAt");
CREATE INDEX IF NOT EXISTS "WorkflowRun_leadId_idx" ON "WorkflowRun"("leadId");
CREATE INDEX IF NOT EXISTS "WorkflowRun_definitionId_idx" ON "WorkflowRun"("definitionId");

CREATE TABLE IF NOT EXISTS "WorkflowRunStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "dedupKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkflowRunStep_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkflowRunStep_runId_fkey" FOREIGN KEY ("runId") REFERENCES "WorkflowRun"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Idempotency guard: a node fires at most once per run → never a double message.
CREATE UNIQUE INDEX IF NOT EXISTS "WorkflowRunStep_dedupKey_key" ON "WorkflowRunStep"("dedupKey");
CREATE INDEX IF NOT EXISTS "WorkflowRunStep_runId_createdAt_idx" ON "WorkflowRunStep"("runId", "createdAt");
