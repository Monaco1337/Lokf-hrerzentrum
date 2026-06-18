-- Opt-in proof: record which version of the consent text the lead accepted.
-- Idempotent so it applies safely on any provisioning path.

ALTER TABLE "ConsentRecord" ADD COLUMN IF NOT EXISTS "textVersion" TEXT;
