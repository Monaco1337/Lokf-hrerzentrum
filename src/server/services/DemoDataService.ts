/**
 * DemoDataService — idempotent demo seeder + one-click cleanup orchestrator.
 *
 * Purpose
 * --------
 * Build a realistic Lead Operating System experience for development and
 * stakeholder demos without polluting the production data path. Every entity
 * the seeder creates is registered in `DemoSeedEntry`; `reset()` reads that
 * registry and hard-deletes only what the seeder produced. Real customer
 * data is therefore guaranteed never to be touched.
 *
 * Heavy seeding logic lives in `DemoDataSeeder.ts` to keep this file lean.
 */
import { prisma } from "../db/prisma";
import { demoSeedRepository } from "../repositories/DemoSeedRepository";
import {
  seedDemoActivity,
  seedDemoLeads,
  seedDemoUsers,
} from "./DemoDataSeeder";

class DemoDataService {
  async status(): Promise<{
    isSeeded: boolean;
    counts: Record<string, number>;
    totalEntries: number;
  }> {
    const totalEntries = await demoSeedRepository.countAll();
    if (totalEntries === 0) {
      return { isSeeded: false, counts: {}, totalEntries: 0 };
    }
    const grouped = await prisma.demoSeedEntry.groupBy({
      by: ["entityType"],
      _count: { entityId: true },
    });
    const counts: Record<string, number> = {};
    for (const row of grouped) counts[row.entityType] = row._count.entityId;
    return { isSeeded: true, counts, totalEntries };
  }

  async seed(): Promise<{ created: number; reused: boolean }> {
    const existing = await demoSeedRepository.countAll();
    if (existing > 0) {
      return { created: existing, reused: true };
    }

    const users = await seedDemoUsers();
    const leads = await seedDemoLeads(users);
    await seedDemoActivity(leads);

    const total = await demoSeedRepository.countAll();
    return { created: total, reused: false };
  }

  /**
   * Hard-delete every entity tracked in the demo registry. Order matters:
   * delete children first, then parents. Errors per row are swallowed so a
   * partially-broken registry can still be cleaned up.
   */
  async reset(): Promise<{ removed: number }> {
    const start = await demoSeedRepository.countAll();
    if (start === 0) return { removed: 0 };

    const order: ReadonlyArray<{
      type: Parameters<typeof demoSeedRepository.listByType>[0];
      del: (id: string) => Promise<unknown>;
    }> = [
      { type: "CallLog", del: (id) => prisma.callLog.delete({ where: { id } }) },
      { type: "Note", del: (id) => prisma.note.delete({ where: { id } }) },
      {
        type: "CommunicationEvent",
        del: (id) => prisma.communicationEvent.delete({ where: { id } }),
      },
      {
        type: "StatusHistory",
        del: (id) => prisma.statusHistory.delete({ where: { id } }),
      },
      {
        type: "Document",
        del: (id) => prisma.document.delete({ where: { id } }),
      },
      {
        type: "UploadedFile",
        del: (id) => prisma.uploadedFile.delete({ where: { id } }),
      },
      { type: "AuditLog", del: (id) => prisma.auditLog.delete({ where: { id } }) },
      {
        type: "ContactInquiry",
        del: (id) => prisma.contactInquiry.delete({ where: { id } }),
      },
      { type: "Lead", del: (id) => prisma.lead.delete({ where: { id } }) },
      { type: "User", del: (id) => prisma.user.delete({ where: { id } }) },
    ];

    for (const step of order) {
      const ids = await demoSeedRepository.listByType(step.type);
      for (const id of ids) {
        try {
          await step.del(id);
        } catch {
          /* Already deleted via cascade or external removal — keep going. */
        }
      }
    }
    await demoSeedRepository.deleteAll();
    return { removed: start };
  }
}

export const demoDataService = new DemoDataService();
