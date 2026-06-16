import Link from "next/link";
import type { Route } from "next";

import { StatusPill } from "@/features/fairtrain-funnel/crm/StatusPill";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

export default async function WiedervorlagenPage() {
  const currentUser = await requireCrmUser();
  const scoped = applyScope({}, currentUser);
  const leads = await leadRepository.list(scoped);

  const now = Date.now();
  const overdue = leads
    .filter(
      (l) =>
        l.nextFollowUpAt !== null && l.nextFollowUpAt.getTime() < now,
    )
    .sort(
      (a, b) =>
        (a.nextFollowUpAt!.getTime()) - (b.nextFollowUpAt!.getTime()),
    );

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Vertrieb
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-950">
          Wiedervorlagen
        </h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Termine, die nicht eingehalten wurden — hier liegen die dringendsten
          Vorgänge. Klick öffnet die Lead-Workbench.
        </p>
      </header>

      {overdue.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white p-10 text-center">
          <p className="text-[14px] font-medium text-ink-soft">
            Alle Wiedervorlagen im Plan — sehr gut.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {overdue.map((l) => (
            <li key={l.id}>
              <Link
                href={`/crm/leads/${l.id}` as Route}
                className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/40 px-4 py-3 transition hover:bg-rose-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-navy-950">
                    {l.firstName} {l.lastName}
                  </p>
                  <p className="text-[11.5px] text-rose-700">
                    Fällig war:{" "}
                    {l.nextFollowUpAt!.toLocaleString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <StatusPill status={l.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
