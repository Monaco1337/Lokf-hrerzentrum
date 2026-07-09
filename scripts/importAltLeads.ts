/**
 * CLI Alt-Lead import — runs the real LeadImportService.commit against the
 * configured DATABASE_URL. Same code path as the /crm/import UI, so the leads
 * are created with the reactivation defaults (leadType=alt_lead,
 * campaign=reaktivierung_alt_leads, employmentSnapshot=arbeitslos_nein,
 * automationPaused=true) and NEVER auto-messaged. Sending still requires a
 * manual campaign release.
 *
 * Usage:
 *   tsx scripts/importAltLeads.ts <path-to-xlsx-or-csv> [actorEmail]
 *   tsx scripts/importAltLeads.ts <file> --dry   # preview only, no writes
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

import { PrismaClient } from "@prisma/client";

import { leadImportService } from "@/server/services/LeadImportService";

const prisma = new PrismaClient();

async function resolveActorId(email?: string): Promise<string> {
  if (email) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) throw new Error(`Kein Nutzer mit E-Mail ${email} gefunden`);
    return user.id;
  }
  const admin = await prisma.user.findFirst({
    where: { isActive: true, role: { in: ["SUPER_ADMIN", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
  });
  if (!admin) throw new Error("Kein aktiver Admin als Import-Akteur gefunden");
  return admin.id;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry");
  const positional = args.filter((a) => !a.startsWith("--"));
  const filePath = positional[0];
  const actorEmail = positional[1];

  if (!filePath) {
    throw new Error(
      "Pfad zur Excel-/CSV-Datei fehlt.\n" +
        "  tsx scripts/importAltLeads.ts <file> [actorEmail] [--dry]",
    );
  }

  const buffer = readFileSync(filePath);
  const filename = basename(filePath);

  if (dryRun) {
    const analysis = await leadImportService.preview(buffer);
    console.log("=== VORSCHAU (keine Änderungen) ===");
    console.log("Mapping:", analysis.mapping);
    console.table(analysis.counters);
    console.log("Beispielzeilen:");
    console.table(
      analysis.rows.slice(0, 8).map((r) => ({
        idx: r.rowIndex,
        firstName: r.firstName,
        lastName: r.lastName,
        email: r.emailNormalized ?? r.email,
        phone: r.phoneNormalized ?? r.phone,
        status: r.status,
        wa: r.hasWhatsapp,
        reason: r.errorReason ?? "",
      })),
    );
    return;
  }

  const actorId = await resolveActorId(actorEmail);
  console.log(`Import-Akteur: ${actorId}`);
  const result = await leadImportService.commit(buffer, filename, actorId);
  console.log("=== IMPORT ABGESCHLOSSEN ===");
  console.log("Batch:", result.batchId);
  console.table(result.counters);
}

main()
  .catch((err) => {
    console.error("Import fehlgeschlagen:", err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
