/**
 * Central permission matrix — the single source of truth for "what may a
 * role do?" decisions in the entire CRM.
 *
 * Why a flat per-action matrix and not hierarchy:
 *   - explicit > implicit; a reviewer can audit every cell at a glance.
 *   - new roles cost a column, new actions cost a row — both safe edits.
 *   - never a behind-the-scenes "Manager inherits Agent" surprise.
 *
 * Rules:
 *   - UI calls `can(role, "...")` to gate buttons / menu items.
 *   - Server-side `requirePermission(actor, "...")` enforces the same check
 *     before any mutating action — UI gating alone is NEVER trusted.
 *   - Adding a Permission key here automatically forces every Role column to
 *     declare a value (TS error otherwise) — no silent gaps.
 */
import type { Role } from "../types";
import { Role as RoleEnum } from "../types";

/**
 * Permission catalogue. Names are stable and surface in audit logs / API
 * contracts, so changing one is a breaking change.
 */
export type Permission =
  | "canManageUsers"
  | "canCreateUsers"
  | "canDeleteUsers"
  | "canAssignRoles"
  | "canManageLeads"
  | "canDeleteLeads"
  | "canViewAllLeads"
  | "canAssignLeads"
  | "canEditLeadStatus"
  | "canCreateNotes"
  | "canCreateTasks"
  | "canTrackCalls"
  | "canManageSettings"
  | "canManageAutomations"
  | "canManagePipeline"
  | "canViewAnalytics"
  | "canRevealSensitive"
  | "canDeleteContactInquiries"
  | "canEditContactInquiries"
  | "canViewAuditLog";

/** All permissions in stable declaration order. Useful for matrix UIs. */
export const PERMISSIONS: ReadonlyArray<Permission> = [
  "canManageUsers",
  "canCreateUsers",
  "canDeleteUsers",
  "canAssignRoles",
  "canManageLeads",
  "canDeleteLeads",
  "canViewAllLeads",
  "canAssignLeads",
  "canEditLeadStatus",
  "canCreateNotes",
  "canCreateTasks",
  "canTrackCalls",
  "canManageSettings",
  "canManageAutomations",
  "canManagePipeline",
  "canViewAnalytics",
  "canRevealSensitive",
  "canDeleteContactInquiries",
  "canEditContactInquiries",
  "canViewAuditLog",
];

type Matrix = Record<Role, Readonly<Record<Permission, boolean>>>;

/**
 * The actual role × permission matrix. Each role declares EVERY permission
 * — this is enforced by the `Matrix` type so future refactors stay safe.
 */
const MATRIX: Matrix = {
  SUPER_ADMIN: {
    canManageUsers: true,
    canCreateUsers: true,
    canDeleteUsers: true,
    canAssignRoles: true,
    canManageLeads: true,
    canDeleteLeads: true,
    canViewAllLeads: true,
    canAssignLeads: true,
    canEditLeadStatus: true,
    canCreateNotes: true,
    canCreateTasks: true,
    canTrackCalls: true,
    canManageSettings: true,
    canManageAutomations: true,
    canManagePipeline: true,
    canViewAnalytics: true,
    canRevealSensitive: true,
    canDeleteContactInquiries: true,
    canEditContactInquiries: true,
    canViewAuditLog: true,
  },
  ADMIN: {
    canManageUsers: true,
    canCreateUsers: true,
    // Admin may not delete users — only deactivate. Hard delete is SUPER_ADMIN.
    canDeleteUsers: false,
    // Admin may not grant SUPER_ADMIN — enforced separately at the service
    // level (canAssignRoles is true but the role-rank check blocks elevation).
    canAssignRoles: true,
    canManageLeads: true,
    canDeleteLeads: true,
    canViewAllLeads: true,
    canAssignLeads: true,
    canEditLeadStatus: true,
    canCreateNotes: true,
    canCreateTasks: true,
    canTrackCalls: true,
    // Admin operates the day-to-day; only SUPER_ADMIN touches core settings.
    canManageSettings: false,
    canManageAutomations: true,
    canManagePipeline: true,
    canViewAnalytics: true,
    canRevealSensitive: true,
    canDeleteContactInquiries: true,
    canEditContactInquiries: true,
    canViewAuditLog: true,
  },
  PARTNER_MANAGER: {
    canManageUsers: false,
    canCreateUsers: false,
    canDeleteUsers: false,
    canAssignRoles: false,
    canManageLeads: true,
    canDeleteLeads: false,
    canViewAllLeads: false,
    canAssignLeads: true,
    canEditLeadStatus: true,
    canCreateNotes: true,
    canCreateTasks: true,
    canTrackCalls: true,
    canManageSettings: false,
    canManageAutomations: false,
    canManagePipeline: false,
    canViewAnalytics: true,
    canRevealSensitive: false,
    canDeleteContactInquiries: false,
    canEditContactInquiries: true,
    canViewAuditLog: false,
  },
  PARTNER_AGENT: {
    canManageUsers: false,
    canCreateUsers: false,
    canDeleteUsers: false,
    canAssignRoles: false,
    // Sees + edits ONLY own leads — enforced by scoping in LeadRepository.
    canManageLeads: true,
    canDeleteLeads: false,
    canViewAllLeads: false,
    canAssignLeads: false,
    canEditLeadStatus: true,
    canCreateNotes: true,
    canCreateTasks: true,
    canTrackCalls: true,
    canManageSettings: false,
    canManageAutomations: false,
    canManagePipeline: false,
    canViewAnalytics: false,
    canRevealSensitive: false,
    canDeleteContactInquiries: false,
    canEditContactInquiries: false,
    canViewAuditLog: false,
  },
  READ_ONLY: {
    canManageUsers: false,
    canCreateUsers: false,
    canDeleteUsers: false,
    canAssignRoles: false,
    canManageLeads: false,
    canDeleteLeads: false,
    canViewAllLeads: true,
    canAssignLeads: false,
    canEditLeadStatus: false,
    canCreateNotes: false,
    canCreateTasks: false,
    canTrackCalls: false,
    canManageSettings: false,
    canManageAutomations: false,
    canManagePipeline: false,
    canViewAnalytics: true,
    canRevealSensitive: false,
    canDeleteContactInquiries: false,
    canEditContactInquiries: false,
    canViewAuditLog: false,
  },
};

/**
 * Returns true iff the role has the given permission.
 * Safe to call on UI; never relied upon for security alone.
 */
export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role][permission];
}

/**
 * Returns the entire permission row for a role — useful when rendering
 * larger UIs that branch on multiple permissions at once.
 */
export function permissionsFor(role: Role): Readonly<Record<Permission, boolean>> {
  return MATRIX[role];
}

/**
 * Role rank — higher means more powerful. Used to prevent privilege
 * escalation: a role may never assign a role >= its own rank.
 */
const ROLE_RANK: Record<Role, number> = {
  READ_ONLY: 0,
  PARTNER_AGENT: 1,
  PARTNER_MANAGER: 2,
  ADMIN: 3,
  SUPER_ADMIN: 4,
};

export function roleRank(role: Role): number {
  return ROLE_RANK[role];
}

/**
 * Returns true iff `actor` is strictly more powerful than `target` — used
 * to enforce: ADMIN cannot edit a SUPER_ADMIN, a manager cannot demote a
 * peer admin, etc.
 */
export function outranks(actor: Role, target: Role): boolean {
  return roleRank(actor) > roleRank(target);
}

/**
 * Returns true iff `actor` may assign `target` as a role. The actor must
 * outrank the target role (you may never assign a role >= your own).
 * SUPER_ADMIN is the only role allowed to grant SUPER_ADMIN.
 */
export function canAssignRole(actor: Role, target: Role): boolean {
  if (!can(actor, "canAssignRoles")) return false;
  if (target === RoleEnum.SUPER_ADMIN) return actor === RoleEnum.SUPER_ADMIN;
  return outranks(actor, target);
}
