/**
 * OperationsTopHeader — sticky brand row for the Lead Operations Center.
 *
 * Server side loads live health counts; rendering + sidebar toggle live in
 * the client sibling so the header stays interactive without lifting DB
 * access into a client tree.
 */
/* eslint-disable no-restricted-imports -- server component (no client code); direct DB access is intentional and never bundled to the client. */
import { prisma } from "@/server/db/prisma";
import { LeadStatus } from "@/features/fairtrain-funnel/types";
import { demoDataService } from "@/server/services/DemoDataService";

import {
  OperationsTopHeaderClient,
  type HeaderHealth,
} from "./OperationsTopHeaderClient";

const HEALTH = {
  ok: { dot: "bg-emerald-500", label: "Stabil" },
  warn: { dot: "bg-amber-500", label: "Beobachten" },
  crit: { dot: "bg-red-500", label: "Eskalation" },
} as const;

async function loadHealth() {
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
}

export async function OperationsTopHeader() {
  const [health, demoActive] = await Promise.all([
    loadHealth(),
    demoDataService.isActive(),
  ]);
  return <OperationsTopHeaderClient health={health} demoActive={demoActive} />;
}
