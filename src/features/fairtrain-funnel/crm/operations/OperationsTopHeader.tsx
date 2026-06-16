/**
 * OperationsTopHeader — sticky brand row for the Lead Operations Center.
 *
 * Anatomy (left → right):
 *  - Wordmark "Lokführer.de · Operations" + live event-clock indicator
 *  - Status pills computed from real DB state (SLA breaches, hot unassigned,
 *    callbacks overdue) so an operator instantly knows the room temperature
 *  - Right-side: Bewerberportal shortcut + user-menu chip
 *
 * Everything here is server-rendered. The clock ticks via a tiny client
 * sibling (Clock) so we don't lift the entire header into a client tree.
 */
import Link from "next/link";

import { prisma } from "@/server/db/prisma";
import { requireCrmUser } from "@/server/actions/_helpers";
import { LeadStatus } from "@/features/fairtrain-funnel/types";

import { LiveClock } from "./LiveClock";

const HEALTH = {
  ok: { dot: "bg-emerald-500", label: "Stabil", chip: "ops-chip ops-chip-green" },
  warn: { dot: "bg-amber-500", label: "Beobachten", chip: "ops-chip ops-chip-amber" },
  crit: { dot: "bg-red-500", label: "Eskalation", chip: "ops-chip ops-chip-red" },
} as const;

async function loadHealth() {
  const [slaBreached, hotUnassigned, callbacksOverdue, totalActive] = await Promise.all([
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
    prisma.lead.count({
      where: {
        deletedAt: null,
        status: { notIn: [LeadStatus.CLOSED, LeadStatus.LOST, LeadStatus.REJECTED] },
      },
    }),
  ]);
  let level: keyof typeof HEALTH = "ok";
  if (slaBreached > 0 || hotUnassigned > 0) level = "crit";
  else if (callbacksOverdue > 0) level = "warn";
  return { slaBreached, hotUnassigned, callbacksOverdue, totalActive, level };
}

export async function OperationsTopHeader() {
  const [user, health] = await Promise.all([
    requireCrmUser().catch(() => null),
    loadHealth(),
  ]);
  const initials = user
    ? user.name
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "·";
  const healthMeta = HEALTH[health.level];

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-white/[0.06] bg-[#0a0a0b]/95 backdrop-blur-md">
      <div className="flex h-full items-center gap-3 px-4 sm:px-5">
        {/* Brand + system identity */}
        <Link href="/crm" className="flex shrink-0 items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/15 ring-1 ring-orange-500/30">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 text-orange-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12h3l2-6 4 12 2-6h7" />
            </svg>
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-[13px] font-bold tracking-tight text-white">
              Lokführer.de
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Lead-Leitstand
            </span>
          </span>
        </Link>

        <span aria-hidden className="hidden h-6 w-px bg-white/[0.08] sm:inline-block" />

        {/* System health pill — real data */}
        <span
          className={[
            "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex",
            health.level === "crit"
              ? "border-red-500/30 bg-red-500/10 text-red-300"
              : health.level === "warn"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
          ].join(" ")}
          title={`SLA-Verstöße: ${health.slaBreached} · Hot ohne Bearbeiter: ${health.hotUnassigned} · Rückrufe überfällig: ${health.callbacksOverdue}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${healthMeta.dot}`} />
          {healthMeta.label}
        </span>

        {/* Live ticker chips — counts only render when > 0 */}
        <div className="hidden items-center gap-1.5 md:flex">
          {health.slaBreached > 0 && (
            <Link
              href="/crm/leads?sla=1"
              className="ops-chip ops-chip-red hover:opacity-90"
            >
              <span className="ops-dot bg-red-400" />
              {health.slaBreached} SLA
            </Link>
          )}
          {health.hotUnassigned > 0 && (
            <Link
              href="/crm/leads?priority=HOT&unassigned=1"
              className="ops-chip ops-chip-orange hover:opacity-90"
            >
              <span className="ops-dot bg-orange-400" />
              {health.hotUnassigned} HOT offen
            </Link>
          )}
          {health.callbacksOverdue > 0 && (
            <Link
              href="/crm/sales/followups"
              className="ops-chip ops-chip-amber hover:opacity-90"
            >
              <span className="ops-dot bg-amber-400" />
              {health.callbacksOverdue} Rückrufe
            </Link>
          )}
          {health.slaBreached === 0 &&
            health.hotUnassigned === 0 &&
            health.callbacksOverdue === 0 && (
              <span className="ops-chip ops-chip-green">
                <span className="ops-dot bg-emerald-400" />
                Keine Eskalationen
              </span>
            )}
        </div>

        <div className="flex-1" />

        {/* Right cluster */}
        <LiveClock />

        <a
          href="/eignungs-check"
          target="_blank"
          rel="noopener"
          className="hidden items-center gap-1 rounded-md border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] font-medium text-zinc-300 transition hover:border-white/[0.16] hover:bg-white/[0.06] hover:text-white sm:inline-flex"
          title="Öffentliches Bewerberportal"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 14 21 3" />
            <path d="M21 9V3h-6" />
            <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
          </svg>
          Bewerberportal
        </a>

        <span
          className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-2 py-1 text-[11.5px] ring-1 ring-white/[0.08]"
          title={user ? `Angemeldet als ${user.name}` : ""}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-bold text-black">
            {initials}
          </span>
          <span className="hidden text-zinc-100 sm:inline">{user?.name ?? "—"}</span>
        </span>
      </div>
    </header>
  );
}
