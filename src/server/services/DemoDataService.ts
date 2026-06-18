/**
 * DemoDataService — idempotent demo seeder + one-click cleanup orchestrator.
 *
 * Purpose
 * --------
 * Build a realistic Lead-Operating-System experience for stakeholder demos
 * without polluting the production data path. Every entity the seeder creates
 * is registered in `DemoSeedEntry` (the authoritative `isDemo` marker);
 * `remove()` reads that registry and hard-deletes only what the seeder
 * produced, in dependency order. Real customer data is therefore guaranteed
 * never to be touched.
 *
 * Heavy seeding logic lives in the DemoDataSeeder* modules to keep this lean.
 */
import { prisma } from "../db/prisma";
import { demoSeedRepository } from "../repositories/DemoSeedRepository";
import { seedDemoLeads, seedDemoUsers } from "./DemoDataSeeder";
import { seedDemoActivity } from "./DemoDataSeederActivity";
import { seedDemoTemplatesAndRules } from "./DemoDataSeederAutomationLib";
import { seedDemoAutomation, seedDemoTasks } from "./DemoDataSeederOps";

class DemoDataService {
  /** Cheap boolean used by the global top-bar Demo-Modus indicator. */
  async isActive(): Promise<boolean> {
    return (await demoSeedRepository.countAll()) > 0;
  }

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

  /** Seed the demo dataset. Idempotent — re-running returns the existing count. */
  async seed(): Promise<{ created: number; reused: boolean }> {
    const existing = await demoSeedRepository.countAll();
    if (existing > 0) {
      return { created: existing, reused: true };
    }

    const users = await seedDemoUsers();
    const leads = await seedDemoLeads(users);
    await seedDemoActivity(leads);
    await seedDemoTasks(users, leads);
    await seedDemoAutomation(leads);
    await seedDemoTemplatesAndRules();

    const total = await demoSeedRepository.countAll();
    return { created: total, reused: false };
  }

  /**
   * Reset = remove everything, then seed a fresh pristine dataset. Used by the
   * "Demo-Daten zurücksetzen" control so a demo can be returned to its initial
   * state after it was edited in the UI.
   */
  async reseed(): Promise<{ created: number }> {
    await this.remove();
    const result = await this.seed();
    return { created: result.created };
  }

  /**
   * Hard-delete every entity tracked in the demo registry. Order matters:
   * children first (and rows that block a User delete via FK Restrict), then
   * parents. Errors per row are swallowed so a partially-broken registry can
   * still be cleaned up.
   */
  async remove(): Promise<{ removed: number }> {
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
      { type: "Document", del: (id) => prisma.document.delete({ where: { id } }) },
      {
        type: "UploadedFile",
        del: (id) => prisma.uploadedFile.delete({ where: { id } }),
      },
      {
        type: "MagicLinkToken",
        del: (id) => prisma.magicLinkToken.delete({ where: { id } }),
      },
      {
        type: "PortalDocument",
        del: (id) => prisma.portalDocument.delete({ where: { id } }),
      },
      {
        type: "PortalLink",
        del: (id) => prisma.portalLink.delete({ where: { id } }),
      },
      {
        type: "AutomationLog",
        del: (id) => prisma.automationLog.delete({ where: { id } }),
      },
      {
        type: "AutomationRunLog",
        del: (id) => prisma.automationRunLog.delete({ where: { id } }),
      },
      {
        type: "AutomationRule",
        del: (id) => prisma.automationRule.delete({ where: { id } }),
      },
      { type: "Task", del: (id) => prisma.task.delete({ where: { id } }) },
      { type: "AuditLog", del: (id) => prisma.auditLog.delete({ where: { id } }) },
      {
        type: "ContactInquiry",
        del: (id) => prisma.contactInquiry.delete({ where: { id } }),
      },
      { type: "Lead", del: (id) => prisma.lead.delete({ where: { id } }) },
      {
        type: "AutomationTemplate",
        del: (id) => prisma.automationTemplate.delete({ where: { id } }),
      },
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

  /** Back-compat alias — the original public method name was `reset`. */
  async reset(): Promise<{ removed: number }> {
    return this.remove();
  }
}

export const demoDataService = new DemoDataService();
