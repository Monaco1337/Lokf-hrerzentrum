/**
 * Server-side loader for the Operations-Center navigation.
 *
 * Resolves the current user (cached per request), the cached callback badge
 * count and the permission-filtered sections — shared by the desktop/tablet
 * sidebar and the mobile rail so both render identically without duplicating
 * the query logic. Never throws: an unauthenticated/failed lookup degrades to a
 * minimal READ_ONLY shell (middleware handles the real redirect).
 */
import { unstable_cache } from "next/cache";

import type { Role } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { CRM_DASHBOARD_TAG } from "@/server/cache/crmCache";
import { leadRepository } from "@/server/repositories/LeadRepository";

import { buildSections, type OpsNavSection } from "./opsNav";

const cachedCallbackRequestCount = unstable_cache(
  () => leadRepository.countCallbackRequests(),
  ["crm-sidebar:callbackCount"],
  { revalidate: 30, tags: [CRM_DASHBOARD_TAG] },
);

export interface OpsNavData {
  sections: OpsNavSection[];
  role: Role;
  displayName: string;
  initials: string;
}

export async function loadOpsNav(): Promise<OpsNavData> {
  let role: Role = "READ_ONLY";
  let displayName = "";
  let initials = "";
  let callbackRequestCount = 0;
  try {
    const user = await requireCrmUser();
    role = user.role;
    displayName = user.name;
    initials = user.name
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
    callbackRequestCount = await cachedCallbackRequestCount();
  } catch {
    /* Unauthenticated requests are handled by middleware; render minimal shell. */
  }
  return {
    sections: buildSections(role, callbackRequestCount),
    role,
    displayName,
    initials,
  };
}
