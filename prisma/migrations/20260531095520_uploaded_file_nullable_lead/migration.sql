-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UploadedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT,
    "draftId" TEXT,
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
INSERT INTO "new_UploadedFile" ("deletedAt", "id", "kind", "leadId", "mimeType", "originalName", "sha256", "sizeBytes", "storageKey", "uploadedAt") SELECT "deletedAt", "id", "kind", "leadId", "mimeType", "originalName", "sha256", "sizeBytes", "storageKey", "uploadedAt" FROM "UploadedFile";
DROP TABLE "UploadedFile";
ALTER TABLE "new_UploadedFile" RENAME TO "UploadedFile";
CREATE INDEX "UploadedFile_leadId_idx" ON "UploadedFile"("leadId");
CREATE INDEX "UploadedFile_leadId_deletedAt_idx" ON "UploadedFile"("leadId", "deletedAt");
CREATE INDEX "UploadedFile_draftId_idx" ON "UploadedFile"("draftId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
