/**
 * OperationsTopHeader — sticky brand row for the Lead Operations Center.
 *
 * Server side loads live health counts; rendering + sidebar toggle live in
 * the client sibling so the header stays interactive without lifting DB
 * access into a client tree.
 */
/* eslint-disable no-restricted-imports -- server component (no client code); direct DB access is intentional and never bundled to the client. */
import { unstable_cache } from "next/cache";

import { prisma } from "@/server/db/prisma";
import { LeadStatus } from "@/features/fairtrain-funnel/types";

import {
  OperationsTopHeaderClient,
  type HeaderHealth,
} from "./OperationsTopHeaderClient";

const HEALTH = {
  ok: { dot: "bg-emerald-500", label: "Stabil" },
  warn: { dot: "bg-amber-500", label: "Beobachten" },
  crit: { dot: "bg-red-500", label: "Eskalation" },
} as const;

/**
 * The header renders in the CRM LAYOUT (every page). Cache the three health
 * counts briefly in the cross-instance Data Cache so navigation doesn't pay for
 * them on every hard load; they reconcile within the TTL and via AutoRefresh.
 * `safe`/try-catch stays outside so a DB blip is never cached.
 */
const cachedHealthCounts = unstable_cache(
  async () => {
    const [slaBreached, hotUnassigned, callbacksOverdue] = await Promise.all([
      prisma.lead.count({
        where: {
          deletedAt: null,
          slaBreachedAt: { not: null },
          status: { notIn: [LeadStatus.CLOSED, LeadStatus.LOST, LeadStatus.REJECTED] },
        },
      }),
      prisma.lead.count({
        where: { deletedAt: null, priority: "HOT", assignedToId: null },
      }),
      prisma.lead.count({
        where: {
          deletedAt: null,
          nextFollowUpAt: { lt: new Date() },
          status: { notIn: [LeadStatus.CLOSED, LeadStatus.LOST, LeadStatus.REJECTED] },
        },
      }),
    ]);
    return { slaBreached, hotUnassigned, callbacksOverdue };
  },
  ["crm-header:health"],
  { revalidate: 30, tags: ["crm-dashboard"] },
);

async function loadHealth(): Promise<HeaderHealth> {
  // This header renders in the CRM LAYOUT — it wraps every CRM page. A DB blip
  // here must NEVER crash the whole shell (that would white-screen the entire
  // CRM). On any failure we degrade to a neutral "stabil" state; the counts
  // reconcile on the next render once the DB is healthy again.
  try {
    const { slaBreached, hotUnassigned, callbacksOverdue } = await cachedHealthCounts();
    let level: keyof typeof HEALTH = "ok";
    if (slaBreached > 0 || hotUnassigned > 0) level = "crit";
    else if (callbacksOverdue > 0) level = "warn";
    const meta = HEALTH[level];
    return {
      level,
      slaBreached,
      hotUnassigned,
      callbacksOverdue,
      label: meta.label,
      dotClass: meta.dot,
    } satisfies HeaderHealth;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[ops-header] health load failed — degrading gracefully", err);
    return {
      level: "ok",
      slaBreached: 0,
      hotUnassigned: 0,
      callbacksOverdue: 0,
      label: HEALTH.ok.label,
      dotClass: HEALTH.ok.dot,
    } satisfies HeaderHealth;
  }
}

export async function OperationsTopHeader() {
  const health = await loadHealth();
  return <OperationsTopHeaderClient health={health} />;
}
