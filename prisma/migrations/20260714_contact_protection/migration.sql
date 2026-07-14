-- Contact protection ("Kontaktschutz") for leads already handled by a human.
-- A lead that was contacted by phone / Multichat and now waits for the applicant
-- to act (Eignungscheck / Unterlagen) must NOT receive any further automatic
-- reactivation / follow-up / WhatsApp / e-mail. `contactState` is a SEPARATE
-- German handling lifecycle and never touches `status` (pipeline) or
-- `campaignStatus`. Idempotent (IF NOT EXISTS) so it applies safely regardless
-- of how the production database was provisioned.

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "contactState" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "reactivationExcluded" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastManualContactAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastManualContactBy" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "lastManualContactChannel" TEXT;

CREATE INDEX IF NOT EXISTS "Lead_contactState_idx" ON "Lead"("contactState");
CREATE INDEX IF NOT EXISTS "Lead_reactivationExcluded_idx" ON "Lead"("reactivationExcluded");
