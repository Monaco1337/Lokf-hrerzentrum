-- WhatsApp sender selection: each WhatsApp template stores the chosen sender
-- number (Meta `phone_number_id`) it is sent FROM. Additive + idempotent.
ALTER TABLE "AutomationTemplate" ADD COLUMN IF NOT EXISTS "senderPhoneNumberId" TEXT;
