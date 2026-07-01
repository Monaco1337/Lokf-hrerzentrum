-- Add mustChangePassword flag to User.
-- Bootstrap super-admins created with a temporary password have this set to
-- true; the user is redirected to /crm/change-password on their first login.
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
