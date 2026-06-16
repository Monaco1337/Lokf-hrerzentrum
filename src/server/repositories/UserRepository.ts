/**
 * UserRepository — operator accounts, role storage and credential lookup.
 *
 * Responsibilities:
 *   - CRUD on the User table (the application layer enforces RBAC, this repo
 *     stays mechanical).
 *   - Read helpers used by the auth layer (`findActiveByEmail`).
 *   - Single-pass `countByRole` for the "last super-admin protection" check.
 *
 * Soft delete: deactivation sets `isActive = false`; hard delete sets
 * `deletedAt` plus removes any future relations. We default to deactivation
 * — only SUPER_ADMIN may hard-delete via the service layer.
 */
import type { Prisma, User as UserRow } from "@prisma/client";

import {
  type Role,
  type UserRef,
  type UserSummary,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { parseRole } from "./types";

function rowToSummary(row: UserRow): UserSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: parseRole(row.role),
    isActive: row.isActive,
    avatar: row.avatar,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function rowToUserRef(
  row: Pick<UserRow, "id" | "name" | "role" | "avatar">,
): UserRef {
  return {
    id: row.id,
    name: row.name,
    role: parseRole(row.role),
    avatar: row.avatar,
  };
}

/**
 * For the auth layer — returns the password hash alongside the basic
 * user fields. NEVER expose this from a Server Action or UI.
 */
export interface UserAuthRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  role: Role;
  isActive: boolean;
  avatar: string | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string | null;
  role: Role;
  avatar?: string | null;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
  avatar?: string | null;
  isActive?: boolean;
  passwordHash?: string | null;
}

export class UserRepository {
  async findById(id: string): Promise<UserSummary | null> {
    const row = await prisma.user.findUnique({ where: { id } });
    if (!row || row.deletedAt) return null;
    return rowToSummary(row);
  }

  async findRefById(id: string): Promise<UserRef | null> {
    const row = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, avatar: true, deletedAt: true },
    });
    if (!row || row.deletedAt) return null;
    return rowToUserRef(row);
  }

  async findActiveByEmail(email: string): Promise<UserAuthRow | null> {
    const row = await prisma.user.findUnique({ where: { email } });
    if (!row || row.deletedAt || !row.isActive) return null;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      passwordHash: row.passwordHash,
      role: parseRole(row.role),
      isActive: row.isActive,
      avatar: row.avatar,
    };
  }

  async list(opts: {
    role?: Role;
    includeInactive?: boolean;
    search?: string;
  } = {}): Promise<UserSummary[]> {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (opts.role) where.role = opts.role;
    if (!opts.includeInactive) where.isActive = true;
    if (opts.search) {
      where.OR = [
        { name: { contains: opts.search } },
        { email: { contains: opts.search } },
      ];
    }
    const rows = await prisma.user.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(rowToSummary);
  }

  /** Count of users per role — used for the "last super-admin" guards. */
  async countActiveByRole(role: Role): Promise<number> {
    return prisma.user.count({
      where: { role, isActive: true, deletedAt: null },
    });
  }

  async create(input: CreateUserInput): Promise<UserSummary> {
    const row = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
        avatar: input.avatar ?? null,
      },
    });
    return rowToSummary(row);
  }

  async update(id: string, input: UpdateUserInput): Promise<UserSummary> {
    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.email !== undefined) data.email = input.email;
    if (input.role !== undefined) data.role = input.role;
    if (input.avatar !== undefined) data.avatar = input.avatar;
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.passwordHash !== undefined) data.passwordHash = input.passwordHash;
    const row = await prisma.user.update({ where: { id }, data });
    return rowToSummary(row);
  }

  async markLoginNow(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }

  async softDelete(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });
  }
}

export const userRepository = new UserRepository();
