/**
 * LeadAccess — lead-level scoping + per-lead access assertions.
 *
 * Centralises three concerns:
 *
 *   1. `applyScope(filters, actor)` — restricts `LeadFilters` so that
 *      PARTNER_AGENT only sees leads assigned to them. Admins and
 *      SUPER_ADMINs see everything. PARTNER_MANAGER sees their own + the
 *      unassigned bucket (so they can self-assign new leads).
 *
 *   2. `assertCanAccessLead(actor, leadId)` — throws ForbiddenError when a
 *      lead is requested that the actor is not allowed to see. Used by the
 *      lead detail page and every per-lead mutating action.
 *
 *   3. `assertLeadScopeForActor(actor, leadId)` — alias used by actions
 *      that need both "I have the action permission" AND "I may touch
 *      THIS lead" enforced.
 */
import { can } from "@/features/fairtrain-funnel/auth/permissions";
import type {
  LeadFilters,
  Role,
  UserSummary,
} from "@/features/fairtrain-funnel/types";

import { ForbiddenError, NotFoundError } from "../errors";
import { leadRepository } from "../repositories/LeadRepository";

/** Apply role-based scoping to LeadFilters. Mutates a copy, never the input. */
export function applyScope(
  filters: LeadFilters,
  actor: { id: string; role: Role },
): LeadFilters {
  if (can(actor.role, "canViewAllLeads")) return filters;
  // PARTNER_MANAGER sees own + unassigned; PARTNER_AGENT sees own only.
  if (actor.role === "PARTNER_MANAGER") {
    return { ...filters, assignedToId: actor.id, includeUnassigned: true };
  }
  // PARTNER_AGENT and READ_ONLY (own only — READ_ONLY normally has
  // canViewAllLeads=true, but if someone flips it off this stays safe).
  return { ...filters, assignedToId: actor.id, includeUnassigned: false };
}

export async function assertCanAccessLead(
  actor: UserSummary,
  leadId: string,
): Promise<void> {
  if (can(actor.role, "canViewAllLeads")) return;
  const lead = await leadRepository.findById(leadId);
  if (!lead) throw new NotFoundError("Lead", leadId);
  if (lead.assignedToId === actor.id) return;
  if (actor.role === "PARTNER_MANAGER" && lead.assignedToId === null) return;
  throw new ForbiddenError("Kein Zugriff auf diesen Lead");
}

/** Alias — explicit name for the action-guard call site. */
export const assertLeadScopeForActor = assertCanAccessLead;
