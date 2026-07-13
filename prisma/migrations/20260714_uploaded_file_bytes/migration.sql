-- Store uploaded file bytes directly in Postgres so uploads persist on
-- ephemeral/serverless hosts (Vercel) where the local filesystem is not durable.
ALTER TABLE "UploadedFile" ADD COLUMN IF NOT EXISTS "data" BYTEA;
