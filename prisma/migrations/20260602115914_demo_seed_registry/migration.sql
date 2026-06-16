-- CreateTable
CREATE TABLE "DemoSeedEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "batch" TEXT NOT NULL DEFAULT 'default',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DemoSeedEntry_batch_idx" ON "DemoSeedEntry"("batch");

-- CreateIndex
CREATE INDEX "DemoSeedEntry_entityType_idx" ON "DemoSeedEntry"("entityType");

-- CreateIndex
CREATE UNIQUE INDEX "DemoSeedEntry_entityType_entityId_key" ON "DemoSeedEntry"("entityType", "entityId");
