/**
 * DemoSeedRepository — registry of every entity created by the demo seeder.
 *
 * The seeder records (entityType, entityId) for each row it inserts so the
 * "Demo-Daten entfernen" action can hard-delete every demo entity without
 * touching real production data.
 */
import { prisma } from "../db/prisma";

export type DemoEntityType =
  | "User"
  | "Lead"
  | "Note"
  | "CallLog"
  | "Document"
  | "UploadedFile"
  | "CommunicationEvent"
  | "AuditLog"
  | "StatusHistory"
  | "ContactInquiry"
  | "Task"
  | "AutomationTemplate"
  | "AutomationLog"
  | "AutomationRule"
  | "AutomationRunLog"
  | "MagicLinkToken"
  | "PortalLink"
  | "PortalDocument";

export interface DemoSeedRow {
  id: string;
  entityType: DemoEntityType;
  entityId: string;
  batch: string;
  createdAt: Date;
}

class DemoSeedRepository {
  /** Track a single entity as demo-created. Idempotent. */
  async track(
    entityType: DemoEntityType,
    entityId: string,
    batch = "default",
  ): Promise<void> {
    await prisma.demoSeedEntry.upsert({
      where: { entityType_entityId: { entityType, entityId } },
      create: { entityType, entityId, batch },
      update: { batch },
    });
  }

  /** Bulk insert helper. Silently de-duplicates. */
  async trackMany(
    rows: ReadonlyArray<{ entityType: DemoEntityType; entityId: string }>,
    batch = "default",
  ): Promise<void> {
    if (rows.length === 0) return;
    for (const r of rows) await this.track(r.entityType, r.entityId, batch);
  }

  async listByType(entityType: DemoEntityType): Promise<string[]> {
    const rows = await prisma.demoSeedEntry.findMany({
      where: { entityType },
      select: { entityId: true },
    });
    return rows.map((r) => r.entityId);
  }

  async countAll(): Promise<number> {
    return prisma.demoSeedEntry.count();
  }

  async deleteAll(): Promise<void> {
    await prisma.demoSeedEntry.deleteMany({});
  }
}

export const demoSeedRepository = new DemoSeedRepository();
