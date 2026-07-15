/**
 * OpsSidebar — Operations Center navigation.
 *
 * Server component: resolves the current user once, filters every entry by
 * permission, and delegates rendering + active-state to the client child.
 *
 * The information architecture is grouped into three sections (OPERATIV /
 * MANAGEMENT / SYSTEM). Operative day-to-day work collapses into two expandable
 * groups (Bewerber, Dokumente) so the rail reads like enterprise software
 * rather than a flat tool list. No routes are added or removed here — every
 * existing screen stays reachable.
 */
import {
  can,
  type Permission,
} from "@/features/fairtrain-funnel/auth/permissions";
import type { Role } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";

import {
  OpsSidebarClient,
  type OpsNavSection,
} from "./OpsSidebarClient";

interface RawLeaf {
  href: string;
  label: string;
  icon: string;
  permission?: Permission;
  badge?: string;
}

interface RawGroup {
  label: string;
  icon: string;
  children: RawLeaf[];
}

interface RawSection {
  title: string;
  entries: Array<RawLeaf | RawGroup>;
}

function isGroup(entry: RawLeaf | RawGroup): entry is RawGroup {
  return "children" in entry;
}

/**
 * Grouped IA. Hrefs map 1:1 onto the existing routes — only the grouping,
 * ordering and a couple of labels changed (e.g. Anrufcenter → Kontaktcenter).
 */
const SECTIONS: ReadonlyArray<RawSection> = [
  {
    title: "Operativ",
    entries: [
      { href: "/crm", label: "Dashboard", icon: "leitstand" },
      {
        label: "Bewerber",
        icon: "applicants",
        children: [
          { href: "/crm/leads", label: "Leads", icon: "leads", permission: "canManageLeads" },
          { href: "/crm/pipeline", label: "Pipeline", icon: "pipeline", permission: "canManageLeads" },
          { href: "/crm/sales/dialer", label: "Kontaktcenter", icon: "phone", permission: "canTrackCalls" },
          { href: "/crm/multichat", label: "Multichat", icon: "message", permission: "canManageLeads" },
          { href: "/crm/communication", label: "Kommunikation", icon: "message" },
          { href: "/crm/import", label: "Lead-Import", icon: "import", permission: "canManageLeads" },
        ],
      },
      {
        label: "Dokumente",
        icon: "folder",
        children: [
          { href: "/crm/unterlagen", label: "Bewerberakte", icon: "doc" },
          { href: "/crm/bildungsgutschein", label: "Bildungsgutscheine", icon: "voucher" },
          { href: "/crm/applicants", label: "Bewerberportal", icon: "user-circle" },
        ],
      },
      { href: "/crm/agenturtermine", label: "Termine", icon: "calendar" },
    ],
  },
  {
    title: "Management",
    entries: [
      { href: "/crm/users", label: "Mitarbeiter", icon: "users", permission: "canManageUsers" },
      { href: "/crm/campaigns/reaktivierung", label: "Reaktivierung", icon: "megaphone", permission: "canManageLeads" },
      { href: "/crm/team/performance", label: "Vertrieb", icon: "chart-up", permission: "canViewAnalytics" },
      { href: "/crm/reporting", label: "Reports", icon: "report", permission: "canViewAnalytics" },
    ],
  },
  {
    title: "System",
    entries: [
      { href: "/crm/automation", label: "Automationen", icon: "spark", permission: "canManageAutomations" },
      { href: "/crm/settings/whatsapp-numbers", label: "WhatsApp-Nummern", icon: "message", permission: "canManageSettings" },
      { href: "/crm/settings", label: "Einstellungen", icon: "settings", permission: "canManageSettings" },
    ],
  },
];

function leafAllowed(role: Role, leaf: RawLeaf): boolean {
  return !leaf.permission || can(role, leaf.permission);
}

function buildSections(role: Role): OpsNavSection[] {
  const out: OpsNavSection[] = [];
  for (const section of SECTIONS) {
    const entries: OpsNavSection["entries"] = [];
    for (const entry of section.entries) {
      if (isGroup(entry)) {
        const children = entry.children
          .filter((c) => leafAllowed(role, c))
          .map((c) => ({ href: c.href, label: c.label, icon: c.icon, badge: c.badge }));
        if (children.length > 0) {
          entries.push({ kind: "group", label: entry.label, icon: entry.icon, children });
        }
      } else if (leafAllowed(role, entry)) {
        entries.push({
          kind: "leaf",
          href: entry.href,
          label: entry.label,
          icon: entry.icon,
          badge: entry.badge,
        });
      }
    }
    if (entries.length > 0) out.push({ title: section.title, entries });
  }
  return out;
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
      sections={buildSections(role)}
      role={role}
      displayName={displayName}
      initials={initials}
    />
  );
}
