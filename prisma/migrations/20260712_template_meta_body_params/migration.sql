-- WhatsApp template Meta body-parameter mapping: ordered variable list that
-- maps our named variables onto Meta's numbered placeholders ({{1}}, {{2}}, …).
-- Additive + idempotent.
ALTER TABLE "AutomationTemplate" ADD COLUMN IF NOT EXISTS "metaBodyParams" TEXT;
