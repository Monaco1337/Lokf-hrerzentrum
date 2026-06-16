/**
 * User, role, call-log and audit-log types.
 *
 * These live in their own file because they grew the main `types.ts` past
 * the project-wide `max-lines` cap. They are re-exported from `types.ts`
 * so call sites keep using `import { Role, ... } from "../types"` and
 * nothing in the existing codebase needs to change.
 *
 * As elsewhere in the funnel, enums are stored as String in SQLite and
 * validated at boundaries via zod.
 */
import { z } from "zod";

import {
  AuditAction,
  AuditActionSchema,
} from "./auditTypes";

// ---------------------------------------------------------------------------
// Role — RBAC source-of-truth.
// SUPER_ADMIN     — full system access; manages users, roles, settings.
// ADMIN           — operational admin; manages leads, partners, tasks.
// PARTNER_MANAGER — extended sales partner; sees assigned + team leads.
// PARTNER_AGENT   — standard sales partner; sees only own leads.
// READ_ONLY       — read-only access for auditors/analysts.
// ---------------------------------------------------------------------------
export const Role = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  PARTNER_MANAGER: "PARTNER_MANAGER",
  PARTNER_AGENT: "PARTNER_AGENT",
  READ_ONLY: "READ_ONLY",
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const RoleSchema = z.enum(
  Object.values(Role) as [Role, ...Role[]],
);

/** Role display labels (German) for UI. */
export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super-Administrator",
  ADMIN: "Administrator",
  PARTNER_MANAGER: "Vertriebsmanager",
  PARTNER_AGENT: "Vertriebspartner",
  READ_ONLY: "Lesezugriff",
};

// ---------------------------------------------------------------------------
// CallOutcome — captured per CallLog entry.
// ---------------------------------------------------------------------------
export const CallOutcome = {
  ATTEMPT_NO_ANSWER: "ATTEMPT_NO_ANSWER",
  TALKED: "TALKED",
  INTERESTED: "INTERESTED",
  NOT_INTERESTED: "NOT_INTERESTED",
  NOT_ELIGIBLE: "NOT_ELIGIBLE",
  CALLBACK_SCHEDULED: "CALLBACK_SCHEDULED",
  APPOINTMENT_SET: "APPOINTMENT_SET",
  CLOSED: "CLOSED",
} as const;
export type CallOutcome = (typeof CallOutcome)[keyof typeof CallOutcome];
export const CallOutcomeSchema = z.enum(
  Object.values(CallOutcome) as [CallOutcome, ...CallOutcome[]],
);

export const CALL_OUTCOME_LABEL: Record<CallOutcome, string> = {
  ATTEMPT_NO_ANSWER: "Anrufversuch (nicht erreicht)",
  TALKED: "Gespräch geführt",
  INTERESTED: "Interesse bekundet",
  NOT_INTERESTED: "Kein Interesse",
  NOT_ELIGIBLE: "Nicht geeignet",
  CALLBACK_SCHEDULED: "Rückruf vereinbart",
  APPOINTMENT_SET: "Termin vereinbart",
  CLOSED: "Erfolgreich abgeschlossen",
};

// ---------------------------------------------------------------------------
// User / CallLog UI-facing shapes — UI must NEVER import from @/server/*,
// so the canonical shapes live here.
// ---------------------------------------------------------------------------

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  avatar: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Reference to a user — embedded into Lead summary / call logs / notes. */
export interface UserRef {
  id: string;
  name: string;
  role: Role;
  avatar: string | null;
}

export interface CallLogEntry {
  id: string;
  leadId: string;
  user: UserRef;
  outcome: CallOutcome;
  note: string | null;
  nextStep: string | null;
  callbackAt: Date | null;
  durationSeconds: number | null;
  createdAt: Date;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  details: string | null;
  createdAt: Date;
}

export { AuditAction, AuditActionSchema };
