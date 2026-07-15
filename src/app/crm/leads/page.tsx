import { LeadList } from "@/features/fairtrain-funnel/crm/LeadList";
import { LeadFilterSchema } from "@/features/fairtrain-funnel/forms/schemas";
import {
  FunnelPathSchema,
  LeadPrioritySchema,
  LeadQualityStatusSchema,
  LeadStatus,
  LeadStatusSchema,
  type LeadTemperature,
  leadTemperature,
  PreferredLocationSchema,
  type LeadFilters,
  WhatsappTrackingStatusSchema,
} from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { userRepository } from "@/server/repositories/UserRepository";
import { leadInsightsService } from "@/server/services/LeadInsightsService";
import { applyScope } from "@/server/services/LeadAccess";
import { leadService } from "@/server/services/LeadService";

export const dynamic = "force-dynamic";

/**
 * Show ALL matching leads, not a page of 100. The set is naturally bounded by
 * the hyperfilter; the cap is a safety valve against an unbounded query/render.
 */
const LEADS_VIEW_LIMIT = 20000;

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
    whatsapp: typeof sp.whatsapp === "string" ? sp.whatsapp : undefined,
    quality: typeof sp.quality === "string" ? sp.quality : undefined,
    temp: typeof sp.temp === "string" ? sp.temp : undefined,
    newReply: sp.newReply !== undefined,
    leadType: typeof sp.leadType === "string" ? sp.leadType : undefined,
    campaign: typeof sp.campaign === "string" ? sp.campaign : undefined,
    campaignStatus:
      typeof sp.campaignStatus === "string" ? sp.campaignStatus : undefined,
  });

  const temperature = ((): LeadTemperature | undefined => {
    const t = raw.success ? raw.data.temp : undefined;
    return t === "HOT" || t === "WARM" || t === "COLD" ? t : undefined;
  })();

  // The default sidebar "Leads" view (no explicit filters) is the curated
  // hyperfilter. Any explicit drill-down (status/quality/… from the Leitstand,
  // Pipeline or Alarme) shows the EXACT bucket instead, so the drill-down always
  // matches the count that was clicked — no widget drifts out of sync.
  const hasExplicitFilter =
    raw.success &&
    Boolean(
      raw.data.status ||
        raw.data.priority ||
        raw.data.preferredLocation ||
        raw.data.funnelPath ||
        raw.data.slaBreachedOnly ||
        raw.data.whatsapp ||
        raw.data.quality ||
        raw.data.temp ||
        raw.data.newReply ||
        raw.data.leadType ||
        raw.data.campaign ||
        raw.data.campaignStatus,
    );

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
        whatsappStatus: safeEnumParse(
          WhatsappTrackingStatusSchema,
          raw.data.whatsapp,
        ),
        leadQualityStatus: safeEnumParse(
          LeadQualityStatusSchema,
          raw.data.quality,
        ),
        hasNewReply: raw.data.newReply || undefined,
        temperature,
        leadType: raw.data.leadType,
        campaign: raw.data.campaign,
        campaignStatus: raw.data.campaignStatus,
        // Hyperfilter only on the plain view: funnel completers (Web-Bewerber)
        // OR arbeitssuchende mit WhatsApp-Rückrufwunsch. Explicit drill-downs
        // show their exact bucket. Nothing is deleted, only hidden.
        funnelOrJobseekerCallback: hasExplicitFilter ? undefined : true,
      }
    : { funnelOrJobseekerCallback: true };

  const currentUser = await requireCrmUser();
  const filters = applyScope(baseFilters, currentUser);
  const [leads, userRows] = await Promise.all([
    leadService.list(filters, { limit: LEADS_VIEW_LIMIT }),
    userRepository.list({ includeInactive: false }),
  ]);
  // Temperature is derived from engagement, so it is filtered after load.
  const scoped = temperature
    ? leads.filter((l) => leadTemperature(l) === temperature)
    : leads;
  const enriched = await leadInsightsService.enrich(scoped);
  const users = userRows.map((u) => ({ id: u.id, name: u.name }));
  return <LeadList leads={enriched} filters={baseFilters} users={users} />;
}
