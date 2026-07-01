"use client";
/**
 * UserAdmin — Benutzer-Verwaltungs-UI.
 *
 * Renders the entire users area in one client component:
 *   - top stats strip (active users by role)
 *   - inline create form
 *   - searchable + role-filterable table
 *   - per-row actions: edit (drawer), role change, (de)activate, delete
 *
 * Permissions are enforced server-side by the underlying Server Actions;
 * the UI hides buttons whose action would be rejected anyway.
 */
import { useMemo, useState, useTransition } from "react";

import {
  createUser,
  deleteUser,
  updateUser,
} from "@/server/actions/users";

import {
  ROLE_LABEL,
  Role,
  type UserSummary,
} from "../../types";
import {
  can,
  canAssignRole,
} from "../../auth/permissions";

import { UserAdminRow } from "./UserAdminRow";
import { UserRoleBadge } from "./UserRoleBadge";

const ROLE_OPTIONS = Object.values(Role) as Role[];

export function UserAdmin({
  initialUsers,
  currentUser,
}: {
  initialUsers: UserSummary[];
  currentUser: UserSummary;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pwTarget, setPwTarget] = useState<UserSummary | null>(null);

  const canCreate = can(currentUser.role, "canCreateUsers");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (!showInactive && !u.isActive) return false;
      if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
      if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, search, roleFilter, showInactive]);

  const byRoleCounts = useMemo(() => {
    const acc: Record<Role, number> = {
      SUPER_ADMIN: 0,
      ADMIN: 0,
      PARTNER_MANAGER: 0,
      PARTNER_AGENT: 0,
      READ_ONLY: 0,
    };
    for (const u of users) if (u.isActive) acc[u.role]++;
    return acc;
  }, [users]);

  async function handleCreate(form: FormData) {
    setError(null);
    const res = await createUser({
      name: form.get("name"),
      email: form.get("email"),
      role: form.get("role"),
      password: form.get("password"),
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setUsers((cur) => [res.data, ...cur]);
    (document.getElementById("new-user-form") as HTMLFormElement | null)?.reset();
  }

  async function handleRoleChange(target: UserSummary, role: Role) {
    setError(null);
    const res = await updateUser({ id: target.id, role });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setUsers((cur) => cur.map((u) => (u.id === target.id ? res.data : u)));
  }

  async function handleToggleActive(target: UserSummary) {
    setError(null);
    const res = await updateUser({ id: target.id, isActive: !target.isActive });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setUsers((cur) => cur.map((u) => (u.id === target.id ? res.data : u)));
  }

  async function handleSetPassword(
    target: UserSummary,
    password: string,
    forceChange: boolean,
  ) {
    setError(null);
    const res = await updateUser({
      id: target.id,
      password,
      mustChangePassword: forceChange,
    });
    if (!res.ok) { setError(res.message); return; }
    setUsers((cur) => cur.map((u) => (u.id === target.id ? res.data : u)));
    setPwTarget(null);
  }

  async function handleDelete(target: UserSummary) {
    setError(null);
    if (
      !confirm(
        `Möchtest du ${target.name} wirklich endgültig entfernen? Dieser Schritt kann nicht rückgängig gemacht werden.`,
      )
    ) {
      return;
    }
    const res = await deleteUser({ id: target.id });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setUsers((cur) => cur.filter((u) => u.id !== target.id));
  }

  return (
    <div className="space-y-8">
      {/* Header + stats */}
      <header className="flex flex-col gap-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Team Control Center
        </p>
        <h1 className="text-2xl font-semibold text-navy-950">
          Mitarbeiter, Rollen &amp; Rechte
        </h1>
        <p className="text-[13.5px] text-ink-soft">
          Verwalte das Vertriebs- und Adminteam. Rollen werden zentral
          ausgewertet — diese Übersicht zeigt jeden aktiven Operator.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {ROLE_OPTIONS.map((r) => (
          <div
            key={r}
            className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <UserRoleBadge role={r} />
              <span className="text-xl font-semibold text-navy-950">
                {byRoleCounts[r]}
              </span>
            </div>
            <p className="mt-2 text-[11.5px] text-ink-muted">
              {ROLE_LABEL[r]} · aktiv
            </p>
          </div>
        ))}
      </section>

      {/* Search + filters */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suchen nach Name oder E-Mail…"
            className="input sm:max-w-xs"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "ALL")}
            className="input sm:max-w-[200px]"
          >
            <option value="ALL">Alle Rollen</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-[12.5px] text-ink-soft">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            inaktive einblenden
          </label>
        </div>
      </section>

      {/* Create form */}
      {canCreate ? (
        <section className="card p-5">
          <h2 className="text-[14px] font-semibold text-navy-950">
            Neuen Nutzer anlegen
          </h2>
          <form
            id="new-user-form"
            action={(fd) => startTransition(() => void handleCreate(fd))}
            className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_1.5fr_1fr_1fr_auto]"
          >
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              placeholder="Name"
              className="input"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="name@fairtrain.de"
              className="input"
            />
            <select name="role" defaultValue="PARTNER_AGENT" className="input">
              {ROLE_OPTIONS.filter((r) =>
                canAssignRole(currentUser.role, r),
              ).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
            <input
              name="password"
              type="password"
              minLength={8}
              placeholder="Passwort (optional)"
              className="input"
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={pending}
              className="btn-primary"
            >
              {pending ? "…" : "Anlegen"}
            </button>
          </form>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      ) : null}

      {/* Table */}
      <section className="card overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-ink/10 bg-surface-subtle/60 text-[11.5px] font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="px-4 py-3">Nutzer</th>
              <th className="px-4 py-3">Rolle</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Erstellt</th>
              <th className="px-4 py-3">Letzte Aktivität</th>
              <th className="px-4 py-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-[12.5px] text-ink-muted"
                >
                  Keine Nutzer gefunden.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <UserAdminRow
                  key={u.id}
                  user={u}
                  currentUser={currentUser}
                  onRoleChange={(target, role) =>
                    startTransition(() => void handleRoleChange(target, role))
                  }
                  onToggleActive={(target) =>
                    startTransition(() => void handleToggleActive(target))
                  }
                  onDelete={(target) => void handleDelete(target)}
                  onSetPassword={(target) => setPwTarget(target)}
                />
              ))
            )}
          </tbody>
        </table>
      </section>

      {pwTarget ? (
        <SetPasswordModal
          user={pwTarget}
          pending={pending}
          onClose={() => setPwTarget(null)}
          onSave={(pw, forceChange) =>
            startTransition(() => void handleSetPassword(pwTarget, pw, forceChange))
          }
        />
      ) : null}
    </div>
  );
}

// ── SetPasswordModal ──────────────────────────────────────────────────────────

function SetPasswordModal({
  user,
  pending,
  onClose,
  onSave,
}: {
  user: UserSummary;
  pending: boolean;
  onClose: () => void;
  onSave: (password: string, forceChange: boolean) => void;
}) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [forceChange, setForceChange] = useState(true);
  const [localErr, setLocalErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { setLocalErr("Mindestens 8 Zeichen"); return; }
    setLocalErr(null);
    onSave(pw, forceChange);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-ink/[0.08] bg-white p-6 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Passwort zurücksetzen</p>
          <h2 className="mt-1 font-display text-[18px] font-bold text-navy-950">{user.name}</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">{user.email}</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-semibold text-ink">Neues Einmalpasswort</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                minLength={8}
                required
                autoFocus
                className="input pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute inset-y-0 right-3 flex items-center text-ink-muted hover:text-ink"
                tabIndex={-1}
              >
                {show ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-surface-subtle/60 px-3.5 py-3 ring-1 ring-ink/[0.06]">
            <input
              type="checkbox"
              checked={forceChange}
              onChange={(e) => setForceChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
            />
            <span className="text-[12px] text-ink-soft">
              <span className="font-semibold text-ink">Passwortänderung beim nächsten Login erzwingen</span>
              <br />
              {forceChange
                ? <>{user.name} muss beim nächsten Login ein eigenes Passwort festlegen.</>
                : <>Zum Testen: der Login funktioniert direkt, ohne Passwortänderung.</>}
            </span>
          </label>

          {localErr ? (
            <p className="text-[12.5px] font-medium text-rose-600">{localErr}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-ink/10 px-4 py-2 text-[13px] font-medium text-ink hover:bg-surface-subtle">
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={pending || pw.length < 8}
              className="rounded-xl bg-brand-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {pending ? "Speichern …" : "Passwort setzen"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
