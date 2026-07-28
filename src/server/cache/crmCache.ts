/**
 * CRM read-cache helpers.
 *
 * The whole CRM runs on a single serverless DB connection
 * (connection_limit=1), so the big list loaders (Leads, Pipeline, Rückrufe,
 * Reaktivierung, Dokumente) otherwise re-run many serialized queries on EVERY
 * navigation — the ~7s "Ladezeit" the operator sees. These helpers wrap those
 * loaders in the Next.js Data Cache (cross-instance, shared) with a short TTL,
 * so repeat visits / rapid navigation are served from cache instead of the DB.
 *
 * Two correctness guarantees:
 *  1. The Data Cache serialises to JSON, so any `Date` comes back as a string.
 *     `reviveDates` walks the cached value and restores real `Date` objects, so
 *     every consumer keeps the exact typed contract it had before caching.
 *  2. Lists are mutable. Writes call `invalidateCrmLeadCaches()` (see the lead
 *     mutation actions) which purges the tag immediately, so a status change /
 *     assignment / new import shows up at once. The TTL is only a backstop.
 */
import { revalidateTag, unstable_cache } from "next/cache";

/** Tag shared by every lead-derived cache entry (lists + dashboard + shell). */
export const CRM_LEADS_TAG = "crm-leads";
/** Tag shared by dashboard/header/sidebar aggregate entries. */
export const CRM_DASHBOARD_TAG = "crm-dashboard";

/**
 * Strict ISO-8601 date-time matcher (with `T` and a `Z`/offset), so plain
 * strings like names, phone numbers or cities are never mistaken for dates.
 */
const ISO_DATE_TIME_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Recursively restore `Date` objects that the Data Cache flattened to ISO
 * strings. Returns a structurally-identical value with real Dates. Non-plain
 * values (numbers, booleans, existing Dates) pass through untouched.
 */
export function reviveDates<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === "string") {
    return (ISO_DATE_TIME_RE.test(value) ? new Date(value) : value) as unknown as T;
  }
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value.map((item) => reviveDates(item)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = reviveDates(val);
  }
  return out as unknown as T;
}

/**
 * Wrap a loader in the Data Cache and revive Dates on the way out.
 *
 * `keyParts` MUST include everything the result depends on (user scope, filter
 * signature, …) because the cache is shared across users/requests.
 */
export function cachedCrmRead<T>(
  loader: () => Promise<T>,
  keyParts: string[],
  options: { revalidate: number; tags?: string[] },
): () => Promise<T> {
  const wrapped = unstable_cache(loader, keyParts, {
    revalidate: options.revalidate,
    tags: options.tags ?? [CRM_LEADS_TAG],
  });
  return async () => reviveDates(await wrapped());
}

/**
 * Purge every lead-derived read cache (lists + dashboard + shell counts). Call
 * this from any Server Action that mutates lead data so the change is visible
 * immediately instead of after the TTL.
 */
export function invalidateCrmLeadCaches(): void {
  revalidateTag(CRM_LEADS_TAG);
  revalidateTag(CRM_DASHBOARD_TAG);
}
