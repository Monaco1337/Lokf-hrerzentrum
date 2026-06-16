-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'PARTNER_AGENT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "note" TEXT,
    "nextStep" TEXT,
    "callbackAt" DATETIME,
    "durationSeconds" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CallLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT,
    "funnelPath" TEXT NOT NULL,
    "employmentStatus" TEXT NOT NULL,
    "preferredLocation" TEXT NOT NULL,
    "acceptsShiftWork" BOOLEAN NOT NULL,
    "motivationText" TEXT,
    "birthDate" DATETIME,
    "birthPlace" TEXT,
    "street" TEXT,
    "houseNumber" TEXT,
    "postalCode" TEXT,
    "addressCity" TEXT,
    "nationality" TEXT,
    "agencyCity" TEXT,
    "agencyCustomerNumber" TEXT,
    "agencyCaseWorker" TEXT,
    "unemployedSince" TEXT,
    "careerHistory" TEXT,
    "schoolEducation" TEXT,
    "graduationYear" TEXT,
    "languages" TEXT,
    "computerSkills" TEXT,
    "interests" TEXT,
    "acceptsTravelHotel" BOOLEAN,
    "acceptsPsychLoad" BOOLEAN,
    "hasNoKbaDrugEntries" BOOLEAN,
    "score" INTEGER NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "slaBreachedAt" DATETIME,
    "nextFollowUpAt" DATETIME,
    "assignedTo" TEXT,
    "assignedToId" TEXT,
    "assignedAt" DATETIME,
    "assignedById" TEXT,
    "source" TEXT,
    "utm" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("acceptsPsychLoad", "acceptsShiftWork", "acceptsTravelHotel", "addressCity", "agencyCaseWorker", "agencyCity", "agencyCustomerNumber", "assignedTo", "birthDate", "birthPlace", "careerHistory", "city", "computerSkills", "createdAt", "deletedAt", "email", "employmentStatus", "firstName", "funnelPath", "graduationYear", "hasNoKbaDrugEntries", "houseNumber", "id", "interests", "languages", "lastName", "motivationText", "nationality", "nextFollowUpAt", "phone", "postalCode", "preferredLocation", "priority", "schoolEducation", "score", "slaBreachedAt", "source", "status", "street", "unemployedSince", "updatedAt", "utm") SELECT "acceptsPsychLoad", "acceptsShiftWork", "acceptsTravelHotel", "addressCity", "agencyCaseWorker", "agencyCity", "agencyCustomerNumber", "assignedTo", "birthDate", "birthPlace", "careerHistory", "city", "computerSkills", "createdAt", "deletedAt", "email", "employmentStatus", "firstName", "funnelPath", "graduationYear", "hasNoKbaDrugEntries", "houseNumber", "id", "interests", "languages", "lastName", "motivationText", "nationality", "nextFollowUpAt", "phone", "postalCode", "preferredLocation", "priority", "schoolEducation", "score", "slaBreachedAt", "source", "status", "street", "unemployedSince", "updatedAt", "utm" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_priority_idx" ON "Lead"("priority");
CREATE INDEX "Lead_preferredLocation_idx" ON "Lead"("preferredLocation");
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");
CREATE INDEX "Lead_slaBreachedAt_idx" ON "Lead"("slaBreachedAt");
CREATE INDEX "Lead_assignedToId_idx" ON "Lead"("assignedToId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "CallLog_leadId_createdAt_idx" ON "CallLog"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "CallLog_userId_createdAt_idx" ON "CallLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actor_createdAt_idx" ON "AuditLog"("actor", "createdAt");
