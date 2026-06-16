/**
 * OpsSidebar — Operations Center sidebar with 17 sections.
 *
 * Server component: resolves the current user once, filters by permission,
 * delegates rendering + active-state to the client child.
 */
import {
  can,
  type Permission,
} from "@/features/fairtrain-funnel/auth/permissions";
import type { Role } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";

import { OpsSidebarClient, type OpsSidebarItem } from "./OpsSidebarClient";

interface RawItem extends Omit<OpsSidebarItem, "active"> {
  permission?: Permission;
}

/**
 * Single ordered list — the brief mandates exactly these 17 sections.
 * Icon identifiers are rendered by `OpsSidebarClient` from a small SVG map.
 */
const ITEMS: ReadonlyArray<RawItem> = [
  { href: "/crm", label: "Leitstand", icon: "leitstand" },
  { href: "/crm/leads", label: "Leads", icon: "leads", permission: "canManageLeads" },
  { href: "/crm/pipeline", label: "Pipeline", icon: "pipeline", permission: "canManageLeads" },
  { href: "/crm/sales/dialer", label: "Anrufcenter", icon: "phone", permission: "canTrackCalls" },
  { href: "/crm/sales/followups", label: "Follow-Ups", icon: "clock", permission: "canCreateTasks" },
  { href: "/crm/tasks", label: "Aufgaben", icon: "checkbox", permission: "canCreateTasks" },
  { href: "/crm/unterlagen", label: "Unterlagen", icon: "doc" },
  { href: "/crm/bildungsgutschein", label: "Bildungsgutschein", icon: "voucher" },
  { href: "/crm/agenturtermine", label: "Agenturtermine", icon: "calendar" },
  { href: "/crm/applicants", label: "Bewerberportal", icon: "user-circle" },
  { href: "/crm/applicants/uploads", label: "Uploads", icon: "upload" },
  { href: "/crm/communication", label: "Kommunikation", icon: "message" },
  { href: "/crm/automation", label: "Automationen", icon: "spark", permission: "canManageAutomations" },
  { href: "/crm/users", label: "Mitarbeiter", icon: "users", permission: "canManageUsers" },
  { href: "/crm/team/performance", label: "Vertriebsübersicht", icon: "chart-up", permission: "canViewAnalytics" },
  { href: "/crm/reporting", label: "Geschäftsübersicht", icon: "report", permission: "canViewAnalytics" },
  { href: "/crm/settings", label: "Einstellungen", icon: "settings", permission: "canManageSettings" },
];

function filterByRole(role: Role): OpsSidebarItem[] {
  return ITEMS.filter((i) => !i.permission || can(role, i.permission)).map(
    (i) => ({ href: i.href, label: i.label, icon: i.icon, badge: i.badge }),
  );
}

export async function OpsSidebar() {
  let role: Role = "READ_ONLY";
  let displayName = "";
  let initials = "";
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
  } catch {
    /* Unauthenticated requests are handled by middleware; render minimal shell. */
  }
  return (
    <OpsSidebarClient
      items={filterByRole(role)}
      role={role}
      displayName={displayName}
      initials={initials}
    />
  );
}
