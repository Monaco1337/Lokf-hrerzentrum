/**
 * /crm/team/performance — Mitarbeiter-Performance-Dashboard.
 *
 * Card grid (one per operator) with the three sections from the ops brief:
 *   HEUTE (Anrufe, Qualifizierungen, Termine, Gutscheine, Anmeldungen)
 *   OFFEN (überfällige Leads, Rückrufe, Dokumente)
 *   EFFIZIENZ (Conversion, Reaktionszeit, SLA-Quote)
 *
 * Every number is sourced from real DB rows.
 */
import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { LeadStatus, type LeadSummary } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { auditLogRepository } from "@/server/repositories/AuditLogRepository";
import { callLogRepository } from "@/server/repositories/CallLogRepository";
import { prisma } from "@/server/db/prisma";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { userRepository } from "@/server/repositories/UserRepository";

export const dynamic = "force-dynamic";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

interface UserStats {
  user: { id: string; name: string; role: string };
  /** HEUTE bucket */
  today: {
    calls: number;
    qualifications: number;
    appointments: number;
    voucherActivity: number;
    enrollments: number;
  };
  /** OFFEN bucket */
  open: {
    overdueLeads: number;
    overdueCallbacks: number;
    missingDocs: number;
  };
  /** EFFIZIENZ bucket */
  efficiency: {
    activeLeads: number;
    conversion: number;
    avgResponseHours: number | null;
    slaCompliance: number;
  };
}

export default async function MitarbeiterPerformancePage() {
  const currentUser = await requireCrmUser();
  if (!can(currentUser.role, "canViewAnalytics")) redirect("/crm");

  const todayStart = startOfDay(new Date());
  const [
    users,
    callTopToday,
    statusChangesToday,
    allLeads,
    callLogs7d,
    docsRows,
  ] = await Promise.all([
    userRepository.list({ includeInactive: false }),
    callLogRepository.topUsersSince(todayStart, 200),
    auditLogRepository.listRecent({ since: todayStart, limit: 2000 }),
    leadRepository.list({}),
    prisma.callLog.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      select: { userId: true, createdAt: true, leadId: true },
    }),
    prisma.document.findMany({
      where: { status: { in: ["MISSING_DATA", "READY_TO_GENERATE"] } },
      select: { leadId: true, status: true },
    }),
  ]);

  // Map for fast lead lookup
  const leadById = new Map(allLeads.map((l: LeadSummary) => [l.id, l]));

  // Calls per user today
  const callsByUser = new Map(callTopToday.map((c) => [c.userId, c.callCount]));

  // Status-change buckets per actor today
  const statusByActor = new Map<
    string,
    { qualifications: number; appointments: number; voucher: number; enrollments: number }
  >();
  for (const e of statusChangesToday) {
    if (e.action !== "STATUS_CHANGED" && e.action !== "STATUS_OVERRIDE") continue;
    const cur =
      statusByActor.get(e.actor) ??
      { qualifications: 0, appointments: 0, voucher: 0, enrollments: 0 };
    const text = (e.details ?? "").toUpperCase();
    if (text.includes("QUALIFIED") || text.includes("HOT")) cur.qualifications += 1;
    if (text.includes("APPOINTMENT")) cur.appointments += 1;
    if (text.includes("GUTSCHEIN")) cur.voucher += 1;
    if (text.includes("ENROLLED") || text.includes("STARTED"))
      cur.enrollments += 1;
    statusByActor.set(e.actor, cur);
  }

  // Leads owned per user
  const leadsByOwner = new Map<string, LeadSummary[]>();
  for (const l of allLeads) {
    if (!l.assignedToId) continue;
    const arr = leadsByOwner.get(l.assignedToId) ?? [];
    arr.push(l);
    leadsByOwner.set(l.assignedToId, arr);
  }

  // Missing docs per owner (via lead.assignee)
  const missingDocsByOwner = new Map<string, number>();
  for (const d of docsRows) {
    const lead = leadById.get(d.leadId);
    if (!lead?.assignedToId) continue;
    missingDocsByOwner.set(
      lead.assignedToId,
      (missingDocsByOwner.get(lead.assignedToId) ?? 0) + 1,
    );
  }

  // Average response time (lead.createdAt → first call by owner) over 7 days
  const responseByUser = new Map<string, { sum: number; n: number }>();
  const firstCallSeen = new Set<string>();
  // callLogs are unordered — sort to find earliest per lead+user
  const callsSorted = [...callLogs7d].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  for (const c of callsSorted) {
    const k = `${c.userId}:${c.leadId}`;
    if (firstCallSeen.has(k)) continue;
    firstCallSeen.add(k);
    const lead = leadById.get(c.leadId);
    if (!lead) continue;
    const respMs = c.createdAt.getTime() - lead.createdAt.getTime();
    if (respMs <= 0) continue;
    const cur = responseByUser.get(c.userId) ?? { sum: 0, n: 0 };
    cur.sum += respMs;
    cur.n += 1;
    responseByUser.set(c.userId, cur);
  }

  const ranking: UserStats[] = users
    .filter((u) => u.role !== "READ_ONLY")
    .map((u) => {
      const owned = leadsByOwner.get(u.id) ?? [];
      const activeOwned = owned.filter(
        (l) =>
          l.status !== LeadStatus.CLOSED &&
          l.status !== LeadStatus.LOST &&
          l.status !== LeadStatus.REJECTED,
      );
      const wonSet = new Set<string>([
        LeadStatus.GUTSCHEIN_APPROVED,
        LeadStatus.ENROLLED,
        LeadStatus.STARTED,
        LeadStatus.CLOSED,
      ]);
      const closed = owned.filter((l) => wonSet.has(l.status)).length;
      const overdueLeads = activeOwned.filter((l) => l.slaBreachedAt).length;
      const overdueCallbacks = activeOwned.filter(
        (l) => l.nextFollowUpAt && l.nextFollowUpAt.getTime() < Date.now(),
      ).length;
      const resp = responseByUser.get(u.id);
      const avgResponseHours =
        resp && resp.n > 0 ? resp.sum / resp.n / 3_600_000 : null;
      const slaCompliance =
        activeOwned.length === 0
          ? 1
          : 1 - overdueLeads / activeOwned.length;
      const conversion =
        owned.length === 0 ? 0 : closed / owned.length;
      const sc = statusByActor.get(u.id) ?? {
        qualifications: 0,
        appointments: 0,
        voucher: 0,
        enrollments: 0,
      };
      return {
        user: { id: u.id, name: u.name, role: u.role },
        today: {
          calls: callsByUser.get(u.id) ?? 0,
          qualifications: sc.qualifications,
          appointments: sc.appointments,
          voucherActivity: sc.voucher,
          enrollments: sc.enrollments,
        },
        open: {
          overdueLeads,
          overdueCallbacks,
          missingDocs: missingDocsByOwner.get(u.id) ?? 0,
        },
        efficiency: {
          activeLeads: activeOwned.length,
          conversion,
          avgResponseHours,
          slaCompliance,
        },
      };
    })
    .sort((a, b) => {
      // Rank by today activity + conversion
      const ra = a.today.calls * 5 + a.today.qualifications * 10 + a.today.enrollments * 50;
      const rb = b.today.calls * 5 + b.today.qualifications * 10 + b.today.enrollments * 50;
      return rb - ra;
    });

  const PERCENT = new Intl.NumberFormat("de-DE", {
    style: "percent",
    maximumFractionDigits: 1,
  });

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-eyebrow">Sales Control Center</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
            Vertrieb &amp; Team-Pulse
          </h1>
          <p className="mt-1 max-w-2xl text-[12.5px] text-zinc-400">
            Pro Mitarbeiter: was heute geschah, was noch offen ist, wie
            effizient gearbeitet wird.
          </p>
        </div>
      </header>

      <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {ranking.map((row) => (
          <li
            key={row.user.id}
            className="rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4"
          >
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[11px] font-bold text-black">
                {row.user.name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-white">
                  {row.user.name}
                </p>
                <p className="text-[10.5px] text-zinc-500">{row.user.role}</p>
              </div>
            </div>

            <h3 className="ops-eyebrow mt-3">Heute</h3>
            <div className="mt-1.5 grid grid-cols-5 gap-1.5">
              <Tile label="Anrufe" value={row.today.calls} />
              <Tile label="Quali" value={row.today.qualifications} />
              <Tile label="Termine" value={row.today.appointments} />
              <Tile label="Gutschein" value={row.today.voucherActivity} />
              <Tile label="Anmeldung" value={row.today.enrollments} />
            </div>

            <h3 className="ops-eyebrow mt-3">Offen</h3>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              <Tile
                label="Überfällig"
                value={row.open.overdueLeads}
                tone={row.open.overdueLeads > 0 ? "red" : "slate"}
              />
              <Tile
                label="Rückrufe"
                value={row.open.overdueCallbacks}
                tone={row.open.overdueCallbacks > 0 ? "amber" : "slate"}
              />
              <Tile
                label="Doc-Lücken"
                value={row.open.missingDocs}
                tone={row.open.missingDocs > 0 ? "orange" : "slate"}
              />
            </div>

            <h3 className="ops-eyebrow mt-3">Effizienz</h3>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              <Tile
                label="Abschluss"
                value={PERCENT.format(row.efficiency.conversion)}
                tone="emerald"
              />
              <Tile
                label="Reaktion"
                value={
                  row.efficiency.avgResponseHours === null
                    ? "—"
                    : `${row.efficiency.avgResponseHours.toFixed(1)} h`
                }
                tone="blue"
              />
              <Tile
                label="Pünktlich"
                value={PERCENT.format(row.efficiency.slaCompliance)}
                tone={row.efficiency.slaCompliance >= 0.9 ? "emerald" : "red"}
              />
            </div>
            <p className="mt-2 text-[10px] text-zinc-500">
              {row.efficiency.activeLeads} aktive Leads
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number | string;
  tone?: "slate" | "red" | "amber" | "orange" | "emerald" | "blue";
}) {
  const cls = {
    slate: "bg-white/[0.03] text-zinc-300 border-white/[0.06]",
    red: "bg-red-500/[0.10] text-red-200 border-red-500/30",
    amber: "bg-amber-500/[0.10] text-amber-200 border-amber-500/30",
    orange: "bg-orange-500/[0.10] text-orange-200 border-orange-500/30",
    emerald: "bg-emerald-500/[0.10] text-emerald-200 border-emerald-500/30",
    blue: "bg-blue-500/[0.10] text-blue-200 border-blue-500/30",
  } as const;
  return (
    <div
      className={`rounded-md border px-2 py-1.5 text-center ${cls[tone]}`}
    >
      <p className="text-[14px] font-bold leading-tight tabular-nums">
        {value}
      </p>
      <p className="text-[9.5px] uppercase tracking-wider opacity-80">{label}</p>
    </div>
  );
}
