"use client";
/**
 * AssigneeSelect — assigns a lead to a user (or clears the assignment).
 *
 * Renders an inline picker with the current assignee surfaced as an avatar
 * chip. Operators without `canAssignLeads` see a read-only chip.
 */
import { useState, useTransition } from "react";

import { assignLead } from "@/server/actions/assignLead";

import type { UserRef, UserSummary } from "../../types";
import { UserAvatar } from "../users/UserAvatar";
import { UserRoleBadge } from "../users/UserRoleBadge";

interface AssigneeOption {
  id: string;
  name: string;
  role: UserSummary["role"];
}

export function AssigneeSelect({
  leadId,
  current,
  options,
  canEdit,
}: {
  leadId: string;
  current: UserRef | null;
  options: ReadonlyArray<AssigneeOption>;
  canEdit: boolean;
}) {
  const [picked, setPicked] = useState<UserRef | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function assign(userId: string | null) {
    setError(null);
    const res = await assignLead({ leadId, userId });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    if (userId === null) {
      setPicked(null);
    } else {
      const next = options.find((o) => o.id === userId);
      setPicked(
        next
          ? { id: next.id, name: next.name, role: next.role, avatar: null }
          : null,
      );
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-muted">
          Zuständig
        </span>
        {picked ? (
          canEdit ? (
            <button
              type="button"
              onClick={() => startTransition(() => void assign(null))}
              disabled={pending}
              className="text-[11px] font-medium text-ink-soft transition hover:text-danger"
            >
              entfernen
            </button>
          ) : null
        ) : null}
      </div>

      {picked ? (
        <div className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white px-3 py-2 shadow-sm">
          <UserAvatar name={picked.name} avatar={picked.avatar} size="sm" />
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold text-navy-950">
              {picked.name}
            </span>
            <UserRoleBadge role={picked.role} />
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-ink/15 bg-surface-subtle/40 px-3 py-2 text-[12px] text-ink-muted">
          Niemand zugewiesen
        </p>
      )}

      {canEdit ? (
        <select
          value={picked?.id ?? ""}
          onChange={(e) =>
            startTransition(() => void assign(e.target.value || null))
          }
          disabled={pending}
          className="input"
        >
          <option value="">— niemand —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      ) : null}

      {error ? (
        <p className="text-[11.5px] text-danger">{error}</p>
      ) : null}
    </div>
  );
}
