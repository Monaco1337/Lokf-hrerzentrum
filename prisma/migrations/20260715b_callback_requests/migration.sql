-- Alt-Lead callback requests: when the AI detects a callback/consultation
-- request from a reactivated Alt-Lead in Multichat (see
-- CallbackRequestService), the lead is flagged here so it surfaces in the
-- new "Rückrufe angefordert" section instead of the Dashboard/Leads list.
-- Additive only; idempotent (IF NOT EXISTS).

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "callbackRequestedAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "callbackHandledAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Lead_callbackRequestedAt_idx" ON "Lead"("callbackRequestedAt");
CREATE INDEX IF NOT EXISTS "Lead_callbackHandledAt_idx" ON "Lead"("callbackHandledAt");
