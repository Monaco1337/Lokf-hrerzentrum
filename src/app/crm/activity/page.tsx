import { ActivityFeed } from "@/features/fairtrain-funnel/crm/sales/ActivityFeed";
import type { UserRef } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { auditLogRepository } from "@/server/repositories/AuditLogRepository";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { userRepository } from "@/server/repositories/UserRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const currentUser = await requireCrmUser();

  // Pull a healthy window. PARTNER_AGENT only sees activity for leads they
  // can see; we filter in-memory after the audit fetch.
  const events = await auditLogRepository.listRecent({ limit: 200 });

  // Resolve actor names for every unique non-system actor id.
  const actorIds = Array.from(
    new Set(events.map((e) => e.actor).filter((a) => a !== "system")),
  );
  const actorById: Record<string, UserRef> = {};
  for (const id of actorIds) {
    const ref = await userRepository.findRefById(id);
    if (ref) actorById[id] = ref;
  }

  // Build lead-name lookup, then enforce scoping.
  const leadIds = Array.from(
    new Set(
      events
        .filter((e) => e.entityType === "Lead")
        .map((e) => e.entityId),
    ),
  );
  const scopedFilters = applyScope({}, currentUser);
  const scopedLeads = await leadRepository.list(scopedFilters);
  const allowedLeadIds = new Set(scopedLeads.map((l) => l.id));
  const leadNameById: Record<string, string> = {};
  for (const lead of scopedLeads) {
    if (leadIds.includes(lead.id)) {
      leadNameById[lead.id] = `${lead.firstName} ${lead.lastName}`;
    }
  }

  const filtered = events.filter(
    (e) => e.entityType !== "Lead" || allowedLeadIds.has(e.entityId),
  );

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Aktivitäten
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-navy-950">
            Live-Aktivitäten
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            Jede Aktion im System chronologisch — Statuswechsel, Anrufe,
            Notizen, Versand, Mitarbeiterbewegungen. Klick auf einen Lead
            öffnet die Workbench.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink-soft shadow-sm ring-1 ring-inset ring-ink/10">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent-600" />
          {filtered.length} Ereignisse
        </span>
      </header>

      <ActivityFeed
        events={filtered}
        actorById={actorById}
        leadNameById={leadNameById}
      />
    </div>
  );
}
