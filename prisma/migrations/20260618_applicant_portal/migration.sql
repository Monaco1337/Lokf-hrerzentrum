-- Applicant self-service portal + document review workflow.
-- Idempotent (IF NOT EXISTS) so it is safe to apply regardless of how the
-- production database was provisioned. No data is dropped or rewritten.

-- Lead: portal self-service fields.
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "availability" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "agencyStatus" TEXT;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "hasEducationVoucher" BOOLEAN;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "hasDrivingLicense" BOOLEAN;

-- PortalLink.
CREATE TABLE IF NOT EXISTS "PortalLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "formData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PortalLink_tokenHash_key" ON "PortalLink"("tokenHash");
CREATE INDEX IF NOT EXISTS "PortalLink_leadId_idx" ON "PortalLink"("leadId");
CREATE INDEX IF NOT EXISTS "PortalLink_status_idx" ON "PortalLink"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PortalLink_leadId_fkey'
  ) THEN
    ALTER TABLE "PortalLink"
      ADD CONSTRAINT "PortalLink_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- PortalDocument.
CREATE TABLE IF NOT EXISTS "PortalDocument" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MISSING',
    "fileName" TEXT,
    "uploadedFileId" TEXT,
    "reviewerNote" TEXT,
    "reviewerId" TEXT,
    "requestedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PortalDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PortalDocument_leadId_kind_key" ON "PortalDocument"("leadId", "kind");
CREATE INDEX IF NOT EXISTS "PortalDocument_leadId_idx" ON "PortalDocument"("leadId");
CREATE INDEX IF NOT EXISTS "PortalDocument_status_idx" ON "PortalDocument"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'PortalDocument_leadId_fkey'
  ) THEN
    ALTER TABLE "PortalDocument"
      ADD CONSTRAINT "PortalDocument_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
