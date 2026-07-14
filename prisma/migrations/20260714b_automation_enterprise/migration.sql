-- Enterprise Automation Builder (2026-07-14b).
--
-- 1. `funnelPhase` — the PROCESS step, fully SEPARATE from `status`
--    (communication status). Default "none" keeps every existing lead and
--    automation behaving exactly as before.
-- 2. AI reply analysis fields — deterministic classification of the last
--    inbound WhatsApp reply. The KI ONLY classifies; it never generates.
--    `needsManualReview` gates uncertain replies so no wrong automation starts.
--
-- Idempotent (IF NOT EXISTS) so it applies safely regardless of how the
-- production database was provisioned.

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "funnelPhase" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "replyInterest" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "replyIntent" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "replyConfidence" INTEGER;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "needsManualReview" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Lead_funnelPhase_idx" ON "Lead"("funnelPhase");
CREATE INDEX IF NOT EXISTS "Lead_needsManualReview_idx" ON "Lead"("needsManualReview");

-- Automation rule condition combination: "all" = UND (default), "any" = ODER.
ALTER TABLE "AutomationRule" ADD COLUMN IF NOT EXISTS "conditionLogic" TEXT NOT NULL DEFAULT 'all';
