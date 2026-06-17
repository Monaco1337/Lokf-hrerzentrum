/**
 * /crm/sales/followups — Follow-Up Board.
 *
 * Real data: leads with `nextFollowUpAt` set, grouped by urgency buckets:
 * Überfällig · Heute · Morgen · Diese Woche · Ohne Termin.
 */
import Link from "next/link";
import type { Route } from "next";

import { LeadStatus, type LeadSummary } from "@/features/fairtrain-funnel/types";
import { FollowUpDateControl } from "@/features/fairtrain-funnel/crm/operations/FollowUpDateControl";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

const TIME_FMT = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

interface Bucket {
  key: "overdue" | "today" | "tomorrow" | "thisWeek" | "noDate";
  label: string;
  hint: string;
  tone: "red" | "orange" | "amber" | "blue" | "slate";
}

const BUCKETS: ReadonlyArray<Bucket> = [
  { key: "overdue", label: "Überfällig", hint: "Frist verstrichen", tone: "red" },
  { key: "today", label: "Heute", hint: "Heute fällig", tone: "orange" },
  { key: "tomorrow", label: "Morgen", hint: "Morgen vorbereiten", tone: "amber" },
  { key: "thisWeek", label: "Diese Woche", hint: "In dieser Woche fällig", tone: "blue" },
  { key: "noDate", label: "Ohne Termin", hint: "Kein Kontakt geplant", tone: "slate" },
];

const TONE_CLS = {
  red: "border-red-500/30 text-red-300",
  orange: "border-orange-500/30 text-orange-300",
  amber: "border-amber-500/30 text-amber-300",
  blue: "border-blue-500/30 text-blue-300",
  slate: "border-white/[0.06] text-zinc-400",
} as const;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

interface Card {
  lead: LeadSummary;
  when: Date | null;
}

function bucketize(leads: ReadonlyArray<LeadSummary>): Record<Bucket["key"], Card[]> {
  const out: Record<Bucket["key"], Card[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    noDate: [],
  };
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const afterTomorrow = new Date(today);
  afterTomorrow.setDate(afterTomorrow.getDate() + 2);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  for (const lead of leads) {
    if (
      lead.status === LeadStatus.CLOSED ||
      lead.status === LeadStatus.LOST ||
      lead.status === LeadStatus.REJECTED
    )
      continue;
    const when = lead.nextFollowUpAt;
    if (!when) {
      // Only include in "no date" when the lead is in an active state and needs work
      if (
        lead.priority === "HOT" ||
        lead.status === LeadStatus.NEW ||
        lead.status === LeadStatus.CONTACT_PENDING
      ) {
        out.noDate.push({ lead, when: null });
      }
      continue;
    }
    if (when.getTime() < now.getTime()) out.overdue.push({ lead, when });
    else if (when.getTime() < tomorrow.getTime()) out.today.push({ lead, when });
    else if (when.getTime() < afterTomorrow.getTime())
      out.tomorrow.push({ lead, when });
    else if (when.getTime() < weekEnd.getTime())
      out.thisWeek.push({ lead, when });
    else {
      // Outside the week — collapse into noDate to keep the board focussed
      out.noDate.push({ lead, when });
    }
  }
  for (const k of Object.keys(out) as Bucket["key"][]) {
    out[k].sort((a, b) => {
      const av = a.when?.getTime() ?? Number.POSITIVE_INFINITY;
      const bv = b.when?.getTime() ?? Number.POSITIVE_INFINITY;
      return av - bv;
    });
  }
  return out;
}

export default async function FollowUpsPage() {
  const currentUser = await requireCrmUser();
  const leads = await leadRepository.list(applyScope({}, currentUser));
  const grouped = bucketize(leads);
  const total = Object.values(grouped).reduce((s, v) => s + v.length, 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-eyebrow">Follow-Ups</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
            {total} aktive Rückrufe & Wiedervorlagen
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

      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3 px-1">
          {BUCKETS.map((b) => {
            const cards = grouped[b.key];
            return (
              <section
                key={b.key}
                className={`w-[280px] shrink-0 rounded-xl border-t-2 ${TONE_CLS[b.tone].split(" ")[0]} border border-white/[0.06] bg-[#0d0d0f]`}
              >
                <header className="flex items-end justify-between border-b border-white/[0.06] px-4 py-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                      {b.label}
                    </p>
                    <p className="text-[10px] text-zinc-500">{b.hint}</p>
                  </div>
                  <span className={`text-[20px] font-bold tabular-nums ${TONE_CLS[b.tone].split(" ")[1]}`}>
                    {cards.length}
                  </span>
                </header>
                <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-2.5">
                  {cards.length === 0 && (
                    <p className="px-2 py-6 text-center text-[11px] text-zinc-600">
                      Leer
                    </p>
                  )}
                  {cards.map((c) => (
                    <div
                      key={c.lead.id}
                      className="rounded-lg border border-white/[0.06] bg-[#161618] p-3 transition hover:border-white/[0.16]"
                    >
                      <Link href={`/crm/leads/${c.lead.id}` as Route} className="block">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[12.5px] font-semibold text-white">
                            {c.lead.firstName} {c.lead.lastName}
                          </p>
                          {c.lead.priority === "HOT" && (
                            <span className="ops-chip ops-chip-orange">HOT</span>
                          )}
                        </div>
                        <p className="mt-1 text-[10.5px] tabular-nums text-zinc-400">
                          {c.when ? TIME_FMT.format(c.when) : "kein Termin gesetzt"}
                        </p>
                        <p className="mt-1 text-[10.5px] text-zinc-500">
                          Score {c.lead.score} · {c.lead.city ?? "—"}
                        </p>
                      </Link>
                      <FollowUpDateControl leadId={c.lead.id} current={c.when} />
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
