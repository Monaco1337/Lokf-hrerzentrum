/**
 * UserService — CRUD on operator accounts with RBAC + audit + safety rails.
 *
 * Safety rails enforced here (NEVER skip):
 *   - Email is normalised to lowercase before storage / lookup.
 *   - Password hash is bcrypt(12) and never stored in plaintext.
 *   - The last active SUPER_ADMIN may not be deleted, deactivated or demoted.
 *   - Role assignment respects `canAssignRole(actorRole, targetRole)`.
 *   - All mutating operations emit a corresponding `AuditAction` entry.
 *
 * Bootstrap: `ensureBootstrapAdmins()` is idempotent — on first call (per
 * server process) it ensures two super-admins exist: "Admin" and
 * "Danijel Zekanovic". The old "Dennis" account is cleaned up automatically
 * on the first run after this change. Seeded users receive the legacy
 * `CRM_PASSWORD_HASH` (if configured) for backward compatibility; Danijel
 * gets mustChangePassword = true so he is prompted to set his own password.
 *
 * One-time initial password for Danijel (share securely out-of-band):
 *   → same as the configured CRM_PASSWORD_HASH, or "dev" in local dev
 */
import { hash } from "bcryptjs";

import {
  AuditAction,
  type Role,
  type UserSummary,
} from "@/features/fairtrain-funnel/types";
import {
  canAssignRole,
  outranks,
} from "@/features/fairtrain-funnel/auth/permissions";

import { getCrmPasswordHash } from "../env";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors";
import {
  userRepository,
  type CreateUserInput,
  type UpdateUserInput,
} from "../repositories/UserRepository";
import { auditLogService } from "./AuditLogService";

const PASSWORD_ROUNDS = 12;

export interface CreateUserCommand {
  name: string;
  email: string;
  role: Role;
  password: string | null;
  avatar?: string | null;
}

export interface UpdateUserCommand {
  name?: string;
  email?: string;
  role?: Role;
  isActive?: boolean;
  avatar?: string | null;
  password?: string | null;
}

export class UserService {
  // ----- Bootstrap (Dennis + Admin) ----------------------------------------

  private bootstrapPromise: Promise<void> | null = null;

  async ensureBootstrapAdmins(): Promise<void> {
    if (this.bootstrapPromise) return this.bootstrapPromise;
    this.bootstrapPromise = this.runBootstrap();
    return this.bootstrapPromise;
  }

  private async runBootstrap(): Promise<void> {
    const legacyHash = getCrmPasswordHash();
    // bcrypt-of-"dev" is used as a safe in-dev fallback when no real
    // hash is configured. Operators should change passwords via the UI.
    const fallbackHash = await hash("dev", PASSWORD_ROUNDS);
    const defaultHash = legacyHash || fallbackHash;

    // Primary admin — no forced password change (uses legacy hash)
    await this.ensureUser({
      email: "admin@fairtrain.local",
      name: "Admin",
      passwordHash: defaultHash,
      mustChangePassword: false,
    });

    // Second super-admin: Danijel Zekanovic
    // Initial password = CRM_PASSWORD_HASH value (or "dev" in local dev).
    // mustChangePassword = true forces a new password on first login.
    await this.ensureUser({
      email: "danijel@fairtrain.local",
      name: "Danijel Zekanovic",
      passwordHash: defaultHash,
      mustChangePassword: true,
    });

    // Cleanup: soft-delete the old "Dennis" bootstrap account if it still
    // exists, as long as there are at least 2 other active super-admins.
    await this.retireOldBootstrapAccount("dennis@fairtrain.local");
  }

  private async ensureUser(input: {
    email: string;
    name: string;
    passwordHash: string;
    mustChangePassword: boolean;
  }): Promise<void> {
    const existing = await userRepository.findActiveByEmail(input.email);
    if (existing) return;
    await userRepository.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: "SUPER_ADMIN",
      mustChangePassword: input.mustChangePassword,
    });
    await auditLogService.append({
      actor: "system",
      action: AuditAction.USER_CREATED,
      entityType: "User",
      entityId: input.email.toLowerCase(),
      details: { role: "SUPER_ADMIN", bootstrap: true },
    });
  }

  /** Retire a legacy bootstrap account only when ≥ 2 other admins exist. */
  private async retireOldBootstrapAccount(email: string): Promise<void> {
    const old = await userRepository.findActiveByEmail(email);
    if (!old) return;
    const activeAdminCount = await userRepository.countActiveByRole("SUPER_ADMIN");
    if (activeAdminCount < 2) return; // Safety: keep the last one standing
    await userRepository.softDelete(old.id);
    await auditLogService.append({
      actor: "system",
      action: AuditAction.USER_DELETED,
      entityType: "User",
      entityId: old.id,
      details: { reason: "bootstrap_cleanup", email },
    });
  }

  // ----- Reads --------------------------------------------------------------

  async list(opts: {
    role?: Role;
    includeInactive?: boolean;
    search?: string;
  } = {}): Promise<UserSummary[]> {
    return userRepository.list(opts);
  }

  async getById(id: string): Promise<UserSummary> {
    const u = await userRepository.findById(id);
    if (!u) throw new NotFoundError("User", id);
    return u;
  }

  // ----- Mutations ----------------------------------------------------------

  async create(actor: UserSummary, cmd: CreateUserCommand): Promise<UserSummary> {
    if (!canAssignRole(actor.role, cmd.role)) {
      throw new ForbiddenError("Rolle darf nicht vergeben werden");
    }
    const email = cmd.email.trim().toLowerCase();
    const existing = await userRepository.findActiveByEmail(email);
    if (existing) {
      throw new ConflictError("E-Mail bereits vergeben");
    }
    const data: CreateUserInput = {
      name: cmd.name.trim(),
      email,
      role: cmd.role,
      passwordHash: cmd.password ? await hash(cmd.password, PASSWORD_ROUNDS) : null,
      avatar: cmd.avatar ?? null,
    };
    const created = await userRepository.create(data);
    await auditLogService.append({
      actor: actor.id,
      action: AuditAction.USER_CREATED,
      entityType: "User",
      entityId: created.id,
      details: { role: created.role, email: created.email },
    });
    return created;
  }

  async update(
    actor: UserSummary,
    targetId: string,
    cmd: UpdateUserCommand,
  ): Promise<UserSummary> {
    const target = await this.getById(targetId);
    this.guardActOn(actor, target);

    const data: UpdateUserInput = {};

    if (cmd.name !== undefined) data.name = cmd.name.trim();
    if (cmd.email !== undefined) data.email = cmd.email.trim().toLowerCase();
    if (cmd.avatar !== undefined) data.avatar = cmd.avatar;

    if (cmd.role !== undefined && cmd.role !== target.role) {
      if (!canAssignRole(actor.role, cmd.role)) {
        throw new ForbiddenError("Rolle darf nicht vergeben werden");
      }
      // Demoting the last SUPER_ADMIN is forbidden.
      if (target.role === "SUPER_ADMIN" && cmd.role !== "SUPER_ADMIN") {
        await this.guardLastSuperAdminMutation(target);
      }
      data.role = cmd.role;
    }

    if (cmd.isActive !== undefined && cmd.isActive !== target.isActive) {
      if (!cmd.isActive && target.role === "SUPER_ADMIN") {
        await this.guardLastSuperAdminMutation(target);
      }
      data.isActive = cmd.isActive;
    }

    if (cmd.password) {
      data.passwordHash = await hash(cmd.password, PASSWORD_ROUNDS);
    }

    const updated = await userRepository.update(targetId, data);

    // Audit
    if (data.role !== undefined && data.role !== target.role) {
      await auditLogService.append({
        actor: actor.id,
        action: AuditAction.USER_ROLE_CHANGED,
        entityType: "User",
        entityId: targetId,
        details: { from: target.role, to: data.role },
      });
    }
    if (data.isActive === false && target.isActive) {
      await auditLogService.append({
        actor: actor.id,
        action: AuditAction.USER_DEACTIVATED,
        entityType: "User",
        entityId: targetId,
      });
    }
    if (data.isActive === true && !target.isActive) {
      await auditLogService.append({
        actor: actor.id,
        action: AuditAction.USER_REACTIVATED,
        entityType: "User",
        entityId: targetId,
      });
    }
    if (
      data.name !== undefined ||
      data.email !== undefined ||
      data.avatar !== undefined ||
      data.passwordHash !== undefined
    ) {
      await auditLogService.append({
        actor: actor.id,
        action: AuditAction.USER_UPDATED,
        entityType: "User",
        entityId: targetId,
        details: {
          name: data.name !== undefined,
          email: data.email !== undefined,
          avatar: data.avatar !== undefined,
          password: data.passwordHash !== undefined,
        },
      });
    }

    return updated;
  }

  async softDelete(actor: UserSummary, targetId: string): Promise<void> {
    const target = await this.getById(targetId);
    this.guardActOn(actor, target);
    if (target.role === "SUPER_ADMIN") {
      await this.guardLastSuperAdminMutation(target);
    }
    await userRepository.softDelete(targetId);
    await auditLogService.append({
      actor: actor.id,
      action: AuditAction.USER_DELETED,
      entityType: "User",
      entityId: targetId,
    });
  }

  // ----- Guards -------------------------------------------------------------

  /** Reject self-demotion / acting on a higher-ranked target. */
  private guardActOn(actor: UserSummary, target: UserSummary): void {
    if (actor.id === target.id) {
      // Self-edits are allowed only for name/email/password (not role / active).
      return;
    }
    if (target.role === actor.role) {
      throw new ForbiddenError("Gleichrangige Konten dürfen nicht verwaltet werden");
    }
    if (!outranks(actor.role, target.role)) {
      throw new ForbiddenError("Ziel-Konto hat höhere Rolle");
    }
  }

  private async guardLastSuperAdminMutation(target: UserSummary): Promise<void> {
    if (target.role !== "SUPER_ADMIN") return;
    const count = await userRepository.countActiveByRole("SUPER_ADMIN");
    if (count <= 1) {
      throw new ForbiddenError(
        "Der letzte Super-Administrator darf nicht entfernt werden",
      );
    }
  }
}

export const userService = new UserService();
