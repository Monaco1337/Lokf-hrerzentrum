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
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
            Sales Control Center
          </p>
          <h1 className="mt-1 font-display text-[22px] font-bold tracking-tight text-navy-950 sm:text-[26px]">
            Vertrieb &amp; Team-Pulse
          </h1>
          <p className="mt-1 max-w-2xl text-[12.5px] text-ink-muted">
            Pro Mitarbeiter: was heute geschah, was noch offen ist, wie effizient gearbeitet wird.
          </p>
        </div>
        <p className="hidden text-[11.5px] text-ink-muted sm:block">
          Echtzeit · täglich aktualisiert
        </p>
      </header>

      {/* ── Agent card grid ─────────────────────────────────────────── */}
      <ul className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {ranking.map((row) => (
          <li
            key={row.user.id}
            className="rounded-2xl border border-ink/[0.08] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow hover:shadow-[0_4px_16px_-6px_rgba(15,23,42,0.12)]"
          >
            {/* Card header — name + role, no avatar */}
            <div className="flex items-center justify-between gap-3 border-b border-ink/[0.07] px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold tracking-tight text-navy-950">
                  {row.user.name}
                </p>
                <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.12em] text-ink-muted">
                  {row.user.role.replace(/_/g, " ")}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-surface-subtle px-2.5 py-1 text-[11px] font-semibold text-ink-muted ring-1 ring-ink/[0.08]">
                {row.efficiency.activeLeads} Leads
              </span>
            </div>

            <div className="space-y-4 px-5 py-4">
              {/* HEUTE */}
              <div>
                <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                  Heute
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  <Tile label="Anrufe"    value={row.today.calls} />
                  <Tile label="Quali"     value={row.today.qualifications} />
                  <Tile label="Termine"   value={row.today.appointments} />
                  <Tile label="Gutschein" value={row.today.voucherActivity} />
                  <Tile label="Anmeldung" value={row.today.enrollments} />
                </div>
              </div>

              {/* OFFEN */}
              <div>
                <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                  Offen
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  <Tile
                    label="Überfällig"
                    value={row.open.overdueLeads}
                    tone={row.open.overdueLeads > 0 ? "red" : "neutral"}
                  />
                  <Tile
                    label="Rückrufe"
                    value={row.open.overdueCallbacks}
                    tone={row.open.overdueCallbacks > 0 ? "amber" : "neutral"}
                  />
                  <Tile
                    label="Doc-Lücken"
                    value={row.open.missingDocs}
                    tone={row.open.missingDocs > 0 ? "orange" : "neutral"}
                  />
                </div>
              </div>

              {/* EFFIZIENZ */}
              <div>
                <p className="mb-2 text-[9.5px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
                  Effizienz
                </p>
                <div className="grid grid-cols-3 gap-1.5">
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
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Tone = "neutral" | "red" | "amber" | "orange" | "emerald" | "blue";

function Tile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: Tone;
}) {
  const styles: Record<Tone, string> = {
    neutral: "bg-surface-subtle/70 text-navy-950 border-ink/[0.07]",
    red:     "bg-red-50        text-red-700   border-red-200/70",
    amber:   "bg-amber-50      text-amber-700 border-amber-200/70",
    orange:  "bg-orange-50     text-orange-700 border-orange-200/70",
    emerald: "bg-emerald-50    text-emerald-700 border-emerald-200/70",
    blue:    "bg-blue-50       text-blue-700  border-blue-200/70",
  };
  const labelStyles: Record<Tone, string> = {
    neutral: "text-ink-muted",
    red:     "text-red-400",
    amber:   "text-amber-500",
    orange:  "text-orange-500",
    emerald: "text-emerald-500",
    blue:    "text-blue-400",
  };
  return (
    <div className={`rounded-xl border px-2 py-2 text-center ${styles[tone]}`}>
      <p className="text-[13.5px] font-bold leading-tight tabular-nums">
        {value}
      </p>
      <p className={`mt-0.5 text-[9px] uppercase tracking-[0.12em] ${labelStyles[tone]}`}>
        {label}
      </p>
    </div>
  );
}
