-- WhatsApp opt-out ("Abmelden"): a lead that replies with a stop keyword
-- (STOP / STOPP / ABMELDEN / KEINE NACHRICHTEN / UNSUBSCRIBE / ENDE) is opted
-- out of all WhatsApp contact. The lead is fully retained in the CRM; only
-- future WhatsApp sends are blocked. Idempotent (IF NOT EXISTS) so it applies
-- safely regardless of how the production database was provisioned.

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "optOut" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "optOutAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "whatsappMarketing" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS "Lead_optOut_idx" ON "Lead"("optOut");
