/**
 * UserRoleBadge — small role pill used in tables, navs, and assignee chips.
 * Pure presentational; no client-side logic.
 */
import { ROLE_LABEL, type Role } from "../../types";

const STYLE: Record<Role, string> = {
  SUPER_ADMIN:
    "bg-accent-50 text-accent-900 ring-accent-200",
  ADMIN: "bg-brand-50 text-brand-900 ring-brand-200",
  PARTNER_MANAGER: "bg-indigo-50 text-indigo-900 ring-indigo-200",
  PARTNER_AGENT: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  READ_ONLY: "bg-slate-100 text-slate-700 ring-slate-200",
};

const DOT: Record<Role, string> = {
  SUPER_ADMIN: "bg-accent-600",
  ADMIN: "bg-brand-600",
  PARTNER_MANAGER: "bg-indigo-500",
  PARTNER_AGENT: "bg-emerald-500",
  READ_ONLY: "bg-slate-400",
};

export function UserRoleBadge({
  role,
  className = "",
}: {
  role: Role;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        STYLE[role],
        className,
      ].join(" ")}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT[role]}`} />
      {ROLE_LABEL[role]}
    </span>
  );
}
