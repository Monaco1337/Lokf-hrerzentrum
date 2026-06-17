/**
 * /crm/agenturtermine — Agentur-Termin-Center.
 *
 * Real data: every Lead in status AA_APPOINTMENT_* with their nextFollowUpAt
 * is bucketed into Heute / Diese Woche / Offen / Überfällig / Bestätigt.
 */
import Link from "next/link";
import type { Route } from "next";

import { LeadStatus, type LeadSummary } from "@/features/fairtrain-funnel/types";
import { FollowUpDateControl } from "@/features/fairtrain-funnel/crm/operations/FollowUpDateControl";
import {
  LeadStageSelect,
  type StageOption,
} from "@/features/fairtrain-funnel/crm/operations/LeadStageSelect";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

const APPOINTMENT_STAGES: ReadonlyArray<StageOption> = [
  { value: LeadStatus.AA_APPOINTMENT_PENDING, label: "Termin geplant" },
  { value: LeadStatus.AA_APPOINTMENT_DONE, label: "Termin bestätigt/erledigt" },
];

const DATE_TIME = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_ONLY = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
});

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

interface Bucket {
  key: "overdue" | "today" | "thisWeek" | "open" | "confirmed";
  label: string;
  tone: "red" | "orange" | "amber" | "blue" | "emerald";
}

const BUCKETS: ReadonlyArray<Bucket> = [
  { key: "overdue", label: "Überfällig", tone: "red" },
  { key: "today", label: "Heute", tone: "orange" },
  { key: "thisWeek", label: "Diese Woche", tone: "amber" },
  { key: "open", label: "Offen", tone: "blue" },
  { key: "confirmed", label: "Bestätigt", tone: "emerald" },
];

const TONE_CLS = {
  red: "border-red-500/30 text-red-300",
  orange: "border-orange-500/30 text-orange-300",
  amber: "border-amber-500/30 text-amber-300",
  blue: "border-blue-500/30 text-blue-300",
  emerald: "border-emerald-500/30 text-emerald-300",
} as const;

interface BucketLead {
  lead: LeadSummary;
  when: Date | null;
}

function classify(
  leads: ReadonlyArray<LeadSummary>,
): Record<Bucket["key"], BucketLead[]> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const out: Record<Bucket["key"], BucketLead[]> = {
    overdue: [],
    today: [],
    thisWeek: [],
    open: [],
    confirmed: [],
  };

  for (const lead of leads) {
    const when = lead.nextFollowUpAt;
    if (lead.status === LeadStatus.AA_APPOINTMENT_DONE) {
      out.confirmed.push({ lead, when });
      continue;
    }
    if (lead.status !== LeadStatus.AA_APPOINTMENT_PENDING) continue;
    if (!when) {
      out.open.push({ lead, when: null });
      continue;
    }
    if (when.getTime() < now.getTime()) {
      out.overdue.push({ lead, when });
    } else if (when.getTime() < tomorrowStart.getTime()) {
      out.today.push({ lead, when });
    } else if (when.getTime() < weekEnd.getTime()) {
      out.thisWeek.push({ lead, when });
    } else {
      out.open.push({ lead, when });
    }
  }
  // Sort each bucket by date asc
  for (const k of Object.keys(out) as Bucket["key"][]) {
    out[k].sort((a, b) => {
      const av = a.when?.getTime() ?? Number.POSITIVE_INFINITY;
      const bv = b.when?.getTime() ?? Number.POSITIVE_INFINITY;
      return av - bv;
    });
  }
  return out;
}

export default async function AgenturtermineePage() {
  const user = await requireCrmUser();
  const all = await leadRepository.list(applyScope({}, user));
  const grouped = classify(all);
  const total = Object.values(grouped).reduce((s, arr) => s + arr.length, 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-eyebrow">Agenturtermine</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
            {total} Termine im Auge
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {grouped.overdue.length > 0 && (
            <span className="ops-chip ops-chip-red">
              {grouped.overdue.length} überfällig
            </span>
          )}
          {grouped.today.length > 0 && (
            <span className="ops-chip ops-chip-orange">
              {grouped.today.length} heute
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {BUCKETS.map((b) => {
          const items = grouped[b.key];
          return (
            <section
              key={b.key}
              className={`ops-card border-t-2 ${TONE_CLS[b.tone].split(" ")[0]}`}
            >
              <header className="flex items-baseline justify-between gap-2 px-4 pt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                  {b.label}
                </span>
                <span className={`text-[24px] font-bold tabular-nums ${TONE_CLS[b.tone].split(" ")[1]}`}>
                  {items.length}
                </span>
              </header>
              <div className="mt-3 max-h-72 divide-y divide-white/[0.05] border-t border-white/[0.05] overflow-y-auto">
                {items.length === 0 && (
                  <p className="px-4 py-6 text-center text-[11px] text-zinc-600">—</p>
                )}
                {items.slice(0, 15).map((entry) => (
                  <div
                    key={entry.lead.id}
                    className="px-4 py-2 transition hover:bg-white/[0.03]"
                  >
                    <Link
                      href={`/crm/leads/${entry.lead.id}` as Route}
                      className="block"
                    >
                      <p className="truncate text-[12.5px] font-semibold text-white">
                        {entry.lead.firstName} {entry.lead.lastName}
                      </p>
                      <p className="text-[10.5px] tabular-nums text-zinc-400">
                        {entry.when
                          ? DATE_TIME.format(entry.when)
                          : `Letzte Aktualisierung ${DATE_ONLY.format(entry.lead.updatedAt)}`}
                      </p>
                    </Link>
                    <div className="mt-1.5">
                      <LeadStageSelect
                        leadId={entry.lead.id}
                        current={entry.lead.status}
                        options={APPOINTMENT_STAGES}
                        reason="Agenturtermin-Status aktualisiert"
                      />
                    </div>
                    <FollowUpDateControl leadId={entry.lead.id} current={entry.when} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
