/**
 * One-off backfill: existing reactivated Alt-Leads that already carry a genuine
 * callback/consultation signal (funnelPhase CALLBACK_REQUIRED / CONSULTATION_
 * REQUIRED or replyIntent "callback") but predate the new "Rückrufe
 * angefordert" queue have callbackRequestedAt = null and therefore never show
 * up. This seeds callbackRequestedAt (best-effort: last inbound message time,
 * else updatedAt) so they surface in the queue exactly once. Idempotent: only
 * touches rows where callbackRequestedAt IS NULL and callbackHandledAt IS NULL.
 */
import { prisma } from "../src/server/db/prisma";

async function main() {
  const candidates = await prisma.lead.findMany({
    where: {
      deletedAt: null,
      leadType: "alt_lead",
      callbackRequestedAt: null,
      callbackHandledAt: null,
      OR: [
        { replyIntent: "callback" },
        { funnelPhase: { in: ["callback_required", "consultation_required"] } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      lastInboundMessageAt: true,
      updatedAt: true,
    },
  });

  console.log(`Found ${candidates.length} Alt-Lead(s) to backfill.`);

  let updated = 0;
  for (const c of candidates) {
    const at = c.lastInboundMessageAt ?? c.updatedAt;
    await prisma.lead.update({
      where: { id: c.id },
      data: { callbackRequestedAt: at },
    });
    updated += 1;
    console.log(
      `  ✓ ${c.firstName ?? "?"} ${c.lastName ?? ""} (${c.id}) → ${at.toISOString()}`,
    );
  }

  console.log(`Backfilled ${updated} callback request(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
