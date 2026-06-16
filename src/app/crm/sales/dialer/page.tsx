import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { PowerDialer } from "@/features/fairtrain-funnel/crm/sales/PowerDialer";
import { LeadStatus, type LeadSummary } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

interface QueueEntry {
  lead: LeadSummary;
  reason: string;
}

function buildQueue(leads: ReadonlyArray<LeadSummary>): QueueEntry[] {
  const now = Date.now();
  const out: QueueEntry[] = [];
  for (const lead of leads) {
    if (lead.status === LeadStatus.CLOSED || lead.status === LeadStatus.LOST) continue;
    if (lead.priority === "BLOCKED") continue;
    let reason: string | null = null;
    if (lead.slaBreachedAt) reason = "SLA überschritten — höchste Priorität.";
    else if (lead.nextFollowUpAt && lead.nextFollowUpAt.getTime() < now)
      reason = "Rückruf-Termin überfällig.";
    else if (
      lead.nextFollowUpAt &&
      lead.nextFollowUpAt.getTime() < now + 12 * 60 * 60 * 1000
    )
      reason = "Rückruf-Termin in den nächsten 12 Stunden.";
    else if (lead.priority === "HOT" && lead.status === LeadStatus.NEW)
      reason = "Neuer Hot-Lead — Erstkontakt aufnehmen.";
    else if (lead.priority === "HOT") reason = "Hot-Lead — Aktivität halten.";
    if (reason) out.push({ lead, reason });
  }
  // Order: SLA breached first → overdue callbacks → hot leads → score.
  out.sort((a, b) => {
    const score = (e: QueueEntry) => {
      let s = 0;
      if (e.lead.slaBreachedAt) s += 10000;
      if (e.lead.nextFollowUpAt && e.lead.nextFollowUpAt.getTime() < now) s += 5000;
      if (e.lead.priority === "HOT") s += 1000;
      s += e.lead.score;
      return s;
    };
    return score(b) - score(a);
  });
  return out.slice(0, 30);
}

export default async function DialerPage() {
  const currentUser = await requireCrmUser();
  if (!can(currentUser.role, "canTrackCalls")) redirect("/crm");

  const scoped = applyScope({}, currentUser);
  const leads = await leadRepository.list(scoped);
  const queue = buildQueue(leads);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-eyebrow">Anrufcenter</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
            Power-Dialer
          </h1>
          <p className="mt-1 max-w-2xl text-[12.5px] text-zinc-400">
            Warteschlange aus SLA-Verstößen, fälligen Rückrufen und Hot-Leads.{" "}
            <kbd className="rounded border border-white/10 bg-white/[0.05] px-1 py-0.5 text-[10px] font-bold text-zinc-300">
              1–6
            </kbd>{" "}
            entscheidet direkt.
          </p>
        </div>
        <span className="ops-chip ops-chip-orange">
          {queue.length} Leads in Warteschlange
        </span>
      </header>
      <PowerDialer queue={queue} />
    </div>
  );
}
