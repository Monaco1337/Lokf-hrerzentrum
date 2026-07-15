/**
 * One-off / repeatable maintenance run: reconciles stale `priority=HOT`
 * over-assignment and clears stale `slaBreachedAt` flags (see
 * `SlaService.sweep` for the exact rules). Safe to re-run — idempotent.
 *
 * Usage: npx tsx scripts/reconcileSla.ts
 */
import { slaService } from "../src/server/services/SlaService";

async function main() {
  const result = await slaService.sweep();
  console.log("[reconcileSla] result:", result);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[reconcileSla] failed", err);
    process.exit(1);
  });
