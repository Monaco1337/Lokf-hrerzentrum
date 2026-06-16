import Link from "next/link";
import type { Route } from "next";

import { PriorityBadge } from "@/features/fairtrain-funnel/crm/PriorityBadge";
import { StatusPill } from "@/features/fairtrain-funnel/crm/StatusPill";
import { LeadStatus } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const currentUser = await requireCrmUser();
  const scoped = applyScope({}, currentUser);
  const leads = await leadRepository.list(scoped);
  const now = Date.now();

  const overdue = leads.filter(
    (l) =>
      l.status !== LeadStatus.CLOSED &&
      l.status !== LeadStatus.LOST &&
      (l.slaBreachedAt !== null ||
        (l.nextFollowUpAt !== null && l.nextFollowUpAt.getTime() < now)),
  );
  const todayDue = leads.filter(
    (l) =>
      l.status !== LeadStatus.CLOSED &&
      l.status !== LeadStatus.LOST &&
      l.nextFollowUpAt !== null &&
      l.nextFollowUpAt.getTime() >= now &&
      l.nextFollowUpAt.getTime() < now + 24 * 60 * 60 * 1000,
  );
  const hotLeads = leads.filter(
    (l) =>
      l.priority === "HOT" &&
      l.status !== LeadStatus.CLOSED &&
      !overdue.includes(l) &&
      !todayDue.includes(l),
  );

  const sections = [
    {
      title: "Überfällig",
      hint: "SLA überschritten oder Rückruf-Termin in der Vergangenheit.",
      tone: "rose" as const,
      leads: overdue.slice(0, 10),
    },
    {
      title: "Heute fällig",
      hint: "Rückrufe und Folgekontakte für die nächsten 24 Stunden.",
      tone: "amber" as const,
      leads: todayDue.slice(0, 10),
    },
    {
      title: "Hot Leads",
      hint: "Höchste Priorität — Erstkontakt halten oder Termin koordinieren.",
      tone: "accent" as const,
      leads: hotLeads.slice(0, 10),
    },
  ];

  const total = overdue.length + todayDue.length + hotLeads.length;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-950">
          Heute bearbeiten
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Die operative Tagesliste — drei Buckets, klare Reihenfolge.{" "}
          <span className="font-semibold text-navy-950">{total}</span> Vorgänge
          warten auf dich.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {sections.map((s) => (
          <section
            key={s.title}
            className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm"
          >
            <header className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-navy-950">
                {s.title}
              </h2>
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                  s.tone === "rose"
                    ? "bg-rose-50 text-rose-800 ring-rose-200"
                    : s.tone === "amber"
                      ? "bg-amber-50 text-amber-800 ring-amber-200"
                      : "bg-accent-50 text-accent-900 ring-accent-200",
                ].join(" ")}
              >
                {s.leads.length}
              </span>
            </header>
            <p className="mt-1 text-[11.5px] text-ink-muted">{s.hint}</p>
            {s.leads.length === 0 ? (
              <p className="mt-4 rounded-lg bg-surface-subtle/60 px-3 py-3 text-[12px] text-ink-muted">
                Aktuell leer — alles im Plan.
              </p>
            ) : (
              <ul className="mt-3 space-y-1.5">
                {s.leads.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/crm/leads/${l.id}` as Route}
                      className="flex items-center justify-between gap-2 rounded-lg border border-ink/5 bg-white px-3 py-2 transition hover:border-ink/15 hover:bg-surface-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-navy-950">
                          {l.firstName} {l.lastName}
                        </p>
                        <p className="truncate text-[11.5px] text-ink-muted">
                          {l.city ?? "—"} · Score {l.score}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <StatusPill status={l.status} />
                        <PriorityBadge priority={l.priority} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
