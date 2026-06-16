import { LeadList } from "@/features/fairtrain-funnel/crm/LeadList";
import { LeadFilterSchema } from "@/features/fairtrain-funnel/forms/schemas";
import {
  FunnelPathSchema,
  LeadPrioritySchema,
  LeadStatus,
  LeadStatusSchema,
  PreferredLocationSchema,
  type LeadFilters,
} from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadInsightsService } from "@/server/services/LeadInsightsService";
import { applyScope } from "@/server/services/LeadAccess";
import { leadService } from "@/server/services/LeadService";

export const dynamic = "force-dynamic";

function safeEnumParse<T extends string>(
  schema: { safeParse(v: string): { success: boolean; data?: T } },
  v: string | undefined,
): T | undefined {
  if (!v) return undefined;
  const r = schema.safeParse(v);
  return r.success && r.data ? r.data : undefined;
}

/**
 * Pipeline-kanban deep-links pass multiple statuses comma-separated. We parse
 * them into a `LeadStatus[]` so the repository can `WHERE status IN (...)`.
 * Falls back to a single status (legacy URLs) or undefined.
 */
function parseStatusFilter(
  raw: string | undefined,
): LeadStatus | ReadonlyArray<LeadStatus> | undefined {
  if (!raw) return undefined;
  if (!raw.includes(",")) return safeEnumParse(LeadStatusSchema, raw);
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const valid = parts
    .map((p) => safeEnumParse(LeadStatusSchema, p))
    .filter((s): s is LeadStatus => s !== undefined);
  if (valid.length === 0) return undefined;
  if (valid.length === 1) return valid[0];
  return valid;
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = LeadFilterSchema.safeParse({
    status: typeof sp.status === "string" ? sp.status : undefined,
    priority: typeof sp.priority === "string" ? sp.priority : undefined,
    preferredLocation:
      typeof sp.preferredLocation === "string" ? sp.preferredLocation : undefined,
    funnelPath: typeof sp.funnelPath === "string" ? sp.funnelPath : undefined,
    slaBreachedOnly: sp.slaBreachedOnly !== undefined,
  });

  const baseFilters: LeadFilters = raw.success
    ? {
        status: parseStatusFilter(raw.data.status),
        priority: safeEnumParse(LeadPrioritySchema, raw.data.priority),
        preferredLocation: safeEnumParse(
          PreferredLocationSchema,
          raw.data.preferredLocation,
        ),
        funnelPath: safeEnumParse(FunnelPathSchema, raw.data.funnelPath),
        slaBreachedOnly: raw.data.slaBreachedOnly,
      }
    : {};

  const currentUser = await requireCrmUser();
  const filters = applyScope(baseFilters, currentUser);
  const leads = await leadService.list(filters);
  const enriched = await leadInsightsService.enrich(leads);
  return <LeadList leads={enriched} filters={baseFilters} />;
}
