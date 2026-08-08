/**
 * Shared Operations-Center navigation model.
 *
 * One source of truth consumed by BOTH the desktop/tablet sidebar
 * (OpsSidebarClient) and the mobile rail (OpsMobileNavClient), so every device
 * shows the exact same destinations, order and permissions — just laid out for
 * the viewport. Includes the premium 4-colour icon palette (emerald · blue ·
 * violet · amber) so symbols read as colourful tiles instead of flat glyphs.
 */
import {
  can,
  type Permission,
} from "@/features/fairtrain-funnel/auth/permissions";
import type { Role } from "@/features/fairtrain-funnel/types";

export interface OpsNavLeaf {
  href: string;
  label: string;
  icon: string;
  badge?: string | undefined;
}

export interface OpsNavGroup {
  label: string;
  icon: string;
  children: OpsNavLeaf[];
}

export type OpsNavEntry =
  | ({ kind: "leaf" } & OpsNavLeaf)
  | ({ kind: "group" } & OpsNavGroup);

export interface OpsNavSection {
  title: string;
  entries: OpsNavEntry[];
}

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

function isRawGroup(entry: RawLeaf | RawGroup): entry is RawGroup {
  return "children" in entry;
}

/**
 * FLAT information architecture — no group "Überpunkte", every destination is a
 * first-class leaf shown immediately with its high-end icon tile. Hrefs map 1:1
 * onto the existing routes (nothing is renamed under the hood). Two sections
 * (operational vs. administration) are separated by a hairline only — no header
 * labels — for a clean, dense operations rail. Curated per the current spec:
 * Pipeline, Bewerberakte and Bildungsgutscheine are intentionally not surfaced
 * here (the routes still exist and remain reachable directly / via deep links).
 */
const SECTIONS: ReadonlyArray<RawSection> = [
  {
    title: "",
    entries: [
      { href: "/crm", label: "Dashboard", icon: "leitstand" },
      { href: "/crm/leads", label: "Leads", icon: "leads", permission: "canManageLeads" },
      {
        href: "/crm/callback-requests",
        label: "Rückrufe",
        icon: "phone",
        permission: "canManageLeads",
      },
      { href: "/crm/campaigns/reaktivierung", label: "Kommunikation", icon: "message", permission: "canManageLeads" },
      { href: "/crm/multichat", label: "Multi-Chat", icon: "chat", permission: "canManageLeads" },
      { href: "/crm/import", label: "Lead-Import", icon: "import", permission: "canManageLeads" },
      { href: "/crm/applicants", label: "Bewerberportal", icon: "user-circle" },
      { href: "/crm/agenturtermine", label: "Termine", icon: "calendar" },
    ],
  },
  {
    title: "",
    entries: [
      { href: "/crm/users", label: "Mitarbeiter", icon: "users", permission: "canManageUsers" },
      { href: "/crm/team/performance", label: "Vertrieb", icon: "chart-up", permission: "canViewAnalytics" },
      { href: "/crm/reporting", label: "Reports", icon: "report", permission: "canViewAnalytics" },
      { href: "/crm/automation", label: "Automationen", icon: "spark", permission: "canManageAutomations" },
      { href: "/crm/settings/whatsapp-numbers", label: "WhatsApp-Nummern", icon: "message", permission: "canManageSettings" },
      { href: "/crm/settings", label: "Einstellungen", icon: "settings", permission: "canManageSettings" },
    ],
  },
];

function leafAllowed(role: Role, leaf: RawLeaf): boolean {
  return !leaf.permission || can(role, leaf.permission);
}

/**
 * Resolve the permission-filtered, badge-annotated navigation for a role.
 * Empty groups (all children filtered out) are dropped entirely.
 */
export function buildSections(
  role: Role,
  callbackRequestCount: number,
): OpsNavSection[] {
  const out: OpsNavSection[] = [];
  for (const section of SECTIONS) {
    const entries: OpsNavSection["entries"] = [];
    for (const entry of section.entries) {
      if (isRawGroup(entry)) {
        const children = entry.children
          .filter((c) => leafAllowed(role, c))
          .map((c) => ({
            href: c.href,
            label: c.label,
            icon: c.icon,
            badge:
              c.href === "/crm/callback-requests" && callbackRequestCount > 0
                ? String(callbackRequestCount)
                : c.badge,
          }));
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

/**
 * Flatten every leaf (groups expanded) preserving order — used by the mobile
 * rail, which shows a single continuous, swipeable strip of destinations.
 */
export function flattenLeaves(
  sections: ReadonlyArray<OpsNavSection>,
): OpsNavLeaf[] {
  const leaves: OpsNavLeaf[] = [];
  for (const section of sections) {
    for (const entry of section.entries) {
      if (entry.kind === "group") leaves.push(...entry.children);
      else leaves.push(entry);
    }
  }
  return leaves;
}

/* --------------------------------------------------------------------------
 * Premium 4-colour icon palette.
 * Every class is a full literal string so Tailwind's JIT compiler keeps it.
 * ------------------------------------------------------------------------ */
export type NavColorKey = "emerald" | "blue" | "violet" | "amber";

export interface NavColor {
  /** Idle icon tile. */
  tile: string;
  /** Active icon tile (stronger tint). */
  tileActive: string;
  /** Active row background + text. */
  row: string;
  /** Active accent bar / underline. */
  bar: string;
}

export const NAV_COLORS: Record<NavColorKey, NavColor> = {
  emerald: {
    tile: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
    tileActive: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
    row: "bg-emerald-50 text-emerald-900",
    bar: "bg-emerald-500",
  },
  blue: {
    tile: "bg-sky-50 text-sky-600 ring-1 ring-sky-100",
    tileActive: "bg-sky-100 text-sky-700 ring-1 ring-sky-200",
    row: "bg-sky-50 text-sky-900",
    bar: "bg-sky-500",
  },
  violet: {
    tile: "bg-violet-50 text-violet-600 ring-1 ring-violet-100",
    tileActive: "bg-violet-100 text-violet-700 ring-1 ring-violet-200",
    row: "bg-violet-50 text-violet-900",
    bar: "bg-violet-500",
  },
  amber: {
    tile: "bg-amber-50 text-amber-600 ring-1 ring-amber-100",
    tileActive: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    row: "bg-amber-50 text-amber-900",
    bar: "bg-amber-500",
  },
};

/** Deterministic colour per route/icon so the palette reads intentional. */
const COLOR_BY_HREF: Record<string, NavColorKey> = {
  "/crm": "emerald",
  "/crm/leads": "blue",
  "/crm/pipeline": "violet",
  "/crm/callback-requests": "amber",
  "/crm/campaigns/reaktivierung": "emerald",
  "/crm/multichat": "blue",
  "/crm/import": "violet",
  "/crm/unterlagen": "amber",
  "/crm/bildungsgutschein": "emerald",
  "/crm/applicants": "blue",
  "/crm/agenturtermine": "violet",
  "/crm/users": "emerald",
  "/crm/team/performance": "blue",
  "/crm/reporting": "violet",
  "/crm/automation": "amber",
  "/crm/settings/whatsapp-numbers": "emerald",
  "/crm/settings": "blue",
};

const COLOR_BY_GROUP_ICON: Record<string, NavColorKey> = {
  applicants: "blue",
  megaphone: "amber",
  folder: "violet",
  "chart-up": "blue",
  settings: "violet",
};

const COLOR_CYCLE: NavColorKey[] = ["emerald", "blue", "violet", "amber"];

/** Colour for a leaf destination (by route, with a stable fallback). */
export function colorForHref(href: string): NavColor {
  const key = COLOR_BY_HREF[href];
  if (key) return NAV_COLORS[key];
  // Stable fallback derived from the href so it never flickers between renders.
  let hash = 0;
  for (let i = 0; i < href.length; i += 1) hash = (hash + href.charCodeAt(i)) % COLOR_CYCLE.length;
  return NAV_COLORS[COLOR_CYCLE[hash]!];
}

/** Colour for a collapsible group header (by its icon). */
export function colorForGroup(icon: string): NavColor {
  return NAV_COLORS[COLOR_BY_GROUP_ICON[icon] ?? "emerald"];
}
