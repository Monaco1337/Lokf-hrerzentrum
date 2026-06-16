-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "acceptsPsychLoad" BOOLEAN;
ALTER TABLE "Lead" ADD COLUMN "acceptsTravelHotel" BOOLEAN;
ALTER TABLE "Lead" ADD COLUMN "addressCity" TEXT;
ALTER TABLE "Lead" ADD COLUMN "agencyCaseWorker" TEXT;
ALTER TABLE "Lead" ADD COLUMN "agencyCity" TEXT;
ALTER TABLE "Lead" ADD COLUMN "agencyCustomerNumber" TEXT;
ALTER TABLE "Lead" ADD COLUMN "birthDate" DATETIME;
ALTER TABLE "Lead" ADD COLUMN "birthPlace" TEXT;
ALTER TABLE "Lead" ADD COLUMN "careerHistory" TEXT;
ALTER TABLE "Lead" ADD COLUMN "computerSkills" TEXT;
ALTER TABLE "Lead" ADD COLUMN "graduationYear" TEXT;
ALTER TABLE "Lead" ADD COLUMN "hasNoKbaDrugEntries" BOOLEAN;
ALTER TABLE "Lead" ADD COLUMN "houseNumber" TEXT;
ALTER TABLE "Lead" ADD COLUMN "interests" TEXT;
ALTER TABLE "Lead" ADD COLUMN "languages" TEXT;
ALTER TABLE "Lead" ADD COLUMN "nationality" TEXT;
ALTER TABLE "Lead" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "Lead" ADD COLUMN "schoolEducation" TEXT;
ALTER TABLE "Lead" ADD COLUMN "street" TEXT;
ALTER TABLE "Lead" ADD COLUMN "unemployedSince" TEXT;

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "UploadedFile_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UploadedFile_leadId_idx" ON "UploadedFile"("leadId");

-- CreateIndex
CREATE INDEX "UploadedFile_leadId_deletedAt_idx" ON "UploadedFile"("leadId", "deletedAt");
