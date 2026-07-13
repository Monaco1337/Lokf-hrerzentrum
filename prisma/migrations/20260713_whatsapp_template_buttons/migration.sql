-- Meta WhatsApp template buttons: interactive components (Quick Reply / URL /
-- Call) stored per template as a JSON array, rendered into template.components
-- at send time. Additive + nullable so existing templates keep working
-- unchanged (no buttons). Idempotent (IF NOT EXISTS).

ALTER TABLE "AutomationTemplate" ADD COLUMN IF NOT EXISTS "metaButtons" TEXT;
