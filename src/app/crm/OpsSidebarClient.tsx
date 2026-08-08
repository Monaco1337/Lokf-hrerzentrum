"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { useOpsShell } from "@/app/crm/OpsShellProvider";
import type { Role } from "@/features/fairtrain-funnel/types";
import { ROLE_LABEL } from "@/features/fairtrain-funnel/types";
import { crmLogout } from "@/server/actions/crmAuth";

import { OpsNavIcon as Icon } from "./OpsNavIcon";
import {
  colorForGroup,
  colorForHref,
  type OpsNavGroup,
  type OpsNavLeaf,
  type OpsNavSection,
} from "./opsNav";

function isActive(href: string, pathname: string): boolean {
  if (href === "/crm") return pathname === "/crm";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A premium tinted icon tile — the source of the "four-colour symbols". */
function IconTile({
  icon,
  color,
  active,
}: {
  icon: string;
  color: { tile: string; tileActive: string };
  active: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] transition",
        active ? color.tileActive : color.tile,
      ].join(" ")}
    >
      <Icon name={icon} />
    </span>
  );
}

function LeafLink({
  item,
  pathname,
  nested = false,
}: {
  item: OpsNavLeaf;
  pathname: string;
  nested?: boolean;
}) {
  const active = isActive(item.href, pathname);
  const color = colorForHref(item.href);
  return (
    <Link
      href={item.href as Route}
      className={[
        "group relative flex items-center gap-2.5 rounded-xl text-[13px] font-medium transition",
        nested ? "py-1.5 pl-2.5 pr-2.5" : "px-2 py-1.5",
        active
          ? color.row
          : "text-[#374151] hover:bg-[#F6F7F9] hover:text-[#111827]",
      ].join(" ")}
    >
      {active && (
        <span
          aria-hidden
          className={[
            "absolute left-0 top-1.5 h-[calc(100%-12px)] w-[3px] rounded-r-full",
            color.bar,
          ].join(" ")}
        />
      )}
      <IconTile icon={item.icon} color={color} active={active} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="ops-chip ops-chip-amber text-[9.5px]">{item.badge}</span>
      )}
    </Link>
  );
}

/**
 * A navigation group rendered ALWAYS expanded — no dropdown/toggle. The group
 * label is a quiet, non-interactive header (icon tile + name); every child is
 * shown immediately below it, so the whole IA is visible at a glance.
 */
function GroupBlock({
  group,
  pathname,
}: {
  group: OpsNavGroup;
  pathname: string;
}) {
  const hasActiveChild = group.children.some((c) => isActive(c.href, pathname));
  const color = colorForGroup(group.icon);

  return (
    <li>
      <div className="flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-[13px] font-semibold text-[#111827]">
        <IconTile icon={group.icon} color={color} active={hasActiveChild} />
        <span className="flex-1 truncate text-left">{group.label}</span>
      </div>
      <ul className="relative mt-0.5 space-y-0.5 pl-[22px]">
        <span
          aria-hidden
          className="absolute bottom-1 left-[22px] top-1 w-px bg-[#EEF0F3]"
        />
        {group.children.map((child) => (
          <li key={child.href}>
            <LeafLink item={child} pathname={pathname} nested />
          </li>
        ))}
      </ul>
    </li>
  );
}

/** Full navigation with labels + collapsible groups (lg, expanded). */
function FullNav({
  sections,
  pathname,
}: {
  sections: ReadonlyArray<OpsNavSection>;
  pathname: string;
}) {
  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <div key={section.title || `section-${si}`}>
          {section.title ? (
            <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
              {section.title}
            </p>
          ) : null}
          <ul className="space-y-0.5">
            {section.entries.map((entry) =>
              entry.kind === "group" ? (
                <GroupBlock key={entry.label} group={entry} pathname={pathname} />
              ) : (
                <li key={entry.href}>
                  <LeafLink item={entry} pathname={pathname} />
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Icon-only rail (tablet, or desktop when collapsed) — groups flatten. */
function RailNav({
  sections,
  pathname,
}: {
  sections: ReadonlyArray<OpsNavSection>;
  pathname: string;
}) {
  return (
    <ul className="space-y-1">
      {sections.map((section, si) => {
        const leaves: OpsNavLeaf[] = [];
        for (const entry of section.entries) {
          if (entry.kind === "group") leaves.push(...entry.children);
          else leaves.push(entry);
        }
        return (
          <li key={section.title || `section-${si}`}>
            {si > 0 && <div className="my-1.5 h-px bg-[#EEF0F3]" />}
            <ul className="space-y-1">
              {leaves.map((item) => {
                const active = isActive(item.href, pathname);
                const color = colorForHref(item.href);
                return (
                  <li key={item.href} className="flex justify-center">
                    <Link
                      href={item.href as Route}
                      title={item.label}
                      aria-label={item.label}
                      className="group relative flex items-center justify-center rounded-xl p-1.5 transition hover:bg-[#F6F7F9]"
                    >
                      <IconTile icon={item.icon} color={color} active={active} />
                      {item.badge && (
                        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}

export function OpsSidebarClient({
  sections,
  role,
  displayName,
  initials,
}: {
  sections: ReadonlyArray<OpsNavSection>;
  role: Role;
  displayName: string;
  initials: string;
}) {
  const pathname = usePathname() ?? "";
  const { sidebarCollapsed, sidebarReady } = useOpsShell();
  const collapsed = sidebarReady && sidebarCollapsed;

  return (
    <aside
      className={[
        // Visible from tablet up; the mobile rail (OpsMobileNav) covers phones.
        "hidden md:flex sticky top-[60px] shrink-0 flex-col border-r border-[#EEF0F3] bg-white overflow-hidden",
        "h-[calc(100vh-60px)] w-[76px]",
        sidebarReady ? "transition-[width] duration-300 ease-in-out" : "",
        // md is always the rail; lg expands unless the operator collapsed it.
        collapsed ? "lg:w-[76px]" : "lg:w-[248px]",
      ].join(" ")}
    >
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 [-ms-overflow-style:none] [scrollbar-width:thin]">
        {/* Rail: tablet always; desktop only when collapsed. */}
        <div className={collapsed ? "block" : "block lg:hidden"}>
          <RailNav sections={sections} pathname={pathname} />
        </div>
        {/* Full: desktop, expanded. */}
        <div className={collapsed ? "hidden" : "hidden lg:block"}>
          <FullNav sections={sections} pathname={pathname} />
        </div>
      </nav>

      <div className="border-t border-[#EEF0F3] p-2.5">
        <div
          className={[
            "flex items-center gap-2 rounded-xl bg-[#FAFBFC] px-2 py-2 ring-1 ring-[#EEF0F3]",
            collapsed ? "flex-col" : "flex-col lg:flex-row lg:gap-2.5",
          ].join(" ")}
        >
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#111827] ring-1 ring-[#E5E7EB]"
            title={displayName || undefined}
          >
            {initials || "U"}
          </span>
          <div
            className={
              collapsed ? "hidden" : "hidden min-w-0 flex-1 lg:block"
            }
          >
            <p className="truncate text-[12.5px] font-semibold text-[#111827]">
              {displayName || "—"}
            </p>
            <p className="truncate text-[10.5px] text-[#9CA3AF]">
              {ROLE_LABEL[role] ?? role}
            </p>
          </div>
          <form action={crmLogout} className="shrink-0">
            <button
              type="submit"
              title="Abmelden"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-white hover:text-[#374151] hover:ring-1 hover:ring-[#E5E7EB]"
              aria-label="Abmelden"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
