/**
 * SalesPulse — compact dashboard row with sales-side activity metrics.
 *
 * Renders four counters (Anrufe heute / Anrufe Woche / Aktivitäten heute /
 * Aktivitäten Woche) plus the top-vertriebspartner list. This is the
 * "operations pulse" — separate from the lead-centric KPI bar above.
 */
import type { UserRef } from "../../types";
import { UserAvatar } from "../users/UserAvatar";
import { UserRoleBadge } from "../users/UserRoleBadge";

export interface TopPartner {
  user: UserRef;
  callsThisWeek: number;
  leadsAssigned: number;
}

export interface SalesPulseProps {
  callsToday: number;
  callsThisWeek: number;
  activitiesToday: number;
  activitiesThisWeek: number;
  unassignedLeads: number;
  topPartners: ReadonlyArray<TopPartner>;
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-navy-950">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function SalesPulse({
  callsToday,
  callsThisWeek,
  activitiesToday,
  activitiesThisWeek,
  unassignedLeads,
  topPartners,
}: SalesPulseProps) {
  return (
    <section className="space-y-5">
      <header className="flex items-baseline justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
            Vertriebspuls
          </p>
          <h2 className="font-display text-[18px] font-bold tracking-tight text-navy-950 md:text-[20px]">
            Aktivität &amp; Team
          </h2>
        </div>
        <span className="hidden text-right text-[12px] text-ink-muted sm:inline">
          Letzte 7 Tage · Anrufe + Aktivitäten + Top-Partner
        </span>
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Anrufe heute" value={callsToday} />
        <Stat label="Anrufe diese Woche" value={callsThisWeek} />
        <Stat label="Aktivitäten heute" value={activitiesToday} />
        <Stat
          label="Aktivitäten Woche"
          value={activitiesThisWeek}
        />
        <Stat
          label="Unbearbeitet"
          value={unassignedLeads}
          hint="ohne Zuweisung"
        />
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-navy-950">
            Top-Vertriebspartner
          </h3>
          <span className="text-[11px] text-ink-muted">7 Tage · Anrufe</span>
        </div>
        {topPartners.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-ink/15 bg-surface-subtle/40 px-3 py-3 text-center text-[12px] text-ink-muted">
            Noch keine Anrufaktivität in dieser Woche.
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {topPartners.map((p, idx) => (
              <li
                key={p.user.id}
                className="flex items-center gap-3 rounded-xl border border-ink/10 bg-surface-subtle/40 px-3 py-2"
              >
                <span className="w-5 text-center text-[11px] font-semibold text-ink-muted">
                  #{idx + 1}
                </span>
                <UserAvatar name={p.user.name} avatar={p.user.avatar} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-navy-950">
                      {p.user.name}
                    </span>
                    <UserRoleBadge role={p.user.role} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-navy-950">
                    {p.callsThisWeek}
                  </p>
                  <p className="text-[10.5px] text-ink-muted">
                    Anrufe · {p.leadsAssigned} Leads
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
