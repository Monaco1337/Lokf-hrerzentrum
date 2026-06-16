"use client";
/**
 * UserAdminRow — single row of the Benutzer & Rollen table.
 *
 * Split out of UserAdmin to keep both files below the project max-lines
 * cap and to make each cell easier to reason about.
 */
import {
  ROLE_LABEL,
  Role,
  type UserSummary,
} from "../../types";
import {
  can,
  canAssignRole,
} from "../../auth/permissions";

import { UserAvatar } from "./UserAvatar";
import { UserRoleBadge } from "./UserRoleBadge";

const ROLE_OPTIONS = Object.values(Role) as Role[];

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function relative(d: Date | null, now = Date.now()): string {
  if (!d) return "noch nie";
  const diff = now - d.getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return `vor ${Math.max(1, minutes)} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  if (days < 30) return `vor ${days} Tagen`;
  return d.toLocaleDateString("de-DE");
}

export function UserAdminRow({
  user,
  currentUser,
  onRoleChange,
  onToggleActive,
  onDelete,
}: {
  user: UserSummary;
  currentUser: UserSummary;
  onRoleChange: (target: UserSummary, role: Role) => void;
  onToggleActive: (target: UserSummary) => void;
  onDelete: (target: UserSummary) => void;
}) {
  const u = user;
  const isSelf = u.id === currentUser.id;
  const mayEditRole = !isSelf && canAssignRole(currentUser.role, u.role);
  const mayToggle = can(currentUser.role, "canManageUsers") && !isSelf;
  const mayDelete = can(currentUser.role, "canDeleteUsers") && !isSelf;

  return (
    <tr
      className={[
        "border-b border-ink/[0.06] transition hover:bg-surface-subtle/30",
        !u.isActive ? "opacity-60" : "",
      ].join(" ")}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <UserAvatar name={u.name} avatar={u.avatar} size="md" />
          <div className="flex flex-col">
            <span className="font-medium text-navy-950">
              {u.name}
              {isSelf ? (
                <span className="ml-2 text-[10.5px] text-ink-muted">(du)</span>
              ) : null}
            </span>
            <span className="text-[11.5px] text-ink-muted">{u.email}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {mayEditRole ? (
          <select
            value={u.role}
            onChange={(e) => onRoleChange(u, e.target.value as Role)}
            className="rounded-md border border-ink/10 bg-white px-2 py-1 text-[12px]"
          >
            {ROLE_OPTIONS.filter(
              (r) => r === u.role || canAssignRole(currentUser.role, r),
            ).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        ) : (
          <UserRoleBadge role={u.role} />
        )}
      </td>
      <td className="px-4 py-3">
        {u.isActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Aktiv
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Inaktiv
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-ink-soft">{formatDate(u.createdAt)}</td>
      <td className="px-4 py-3 text-ink-soft">{relative(u.lastLoginAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {mayToggle ? (
            <button
              type="button"
              onClick={() => onToggleActive(u)}
              className="inline-flex items-center gap-1 rounded-full border border-ink/10 bg-white px-2.5 py-1 text-[11.5px] font-medium text-ink-soft transition hover:border-ink/20 hover:bg-surface-muted hover:text-ink"
            >
              {u.isActive ? "Deaktivieren" : "Reaktivieren"}
            </button>
          ) : null}
          {mayDelete ? (
            <button
              type="button"
              onClick={() => onDelete(u)}
              className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-white px-2.5 py-1 text-[11.5px] font-medium text-danger transition hover:bg-danger/5"
            >
              Löschen
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
