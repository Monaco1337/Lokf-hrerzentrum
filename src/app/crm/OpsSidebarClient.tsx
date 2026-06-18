"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";

import { useOpsShell } from "@/app/crm/OpsShellProvider";
import type { Role } from "@/features/fairtrain-funnel/types";
import { ROLE_LABEL } from "@/features/fairtrain-funnel/types";
import { crmLogout } from "@/server/actions/crmAuth";

import { OpsNavIcon as Icon } from "./OpsNavIcon";

export interface OpsNavLeaf {
  href: string;
  label: string;
  icon: string;
  badge?: string | undefined;
}

export interface OpsNavGroup {
  label: string;
  icon: string;
  children: OpsNavLeaf[];
}

export type OpsNavEntry =
  | ({ kind: "leaf" } & OpsNavLeaf)
  | ({ kind: "group" } & OpsNavGroup);

export interface OpsNavSection {
  title: string;
  entries: OpsNavEntry[];
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/crm") return pathname === "/crm";
  return pathname === href || pathname.startsWith(`${href}/`);
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
  return (
    <Link
      href={item.href as Route}
      className={[
        "group relative flex items-center rounded-xl text-[13px] font-medium transition",
        nested ? "gap-2.5 py-1.5 pl-3 pr-2.5" : "gap-2.5 px-2.5 py-2",
        active
          ? "bg-emerald-50 text-emerald-800 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.12)]"
          : "text-[#374151] hover:bg-[#F6F7F9] hover:text-[#111827]",
      ].join(" ")}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 h-[calc(100%-12px)] w-[2px] rounded-r-full bg-emerald-600"
        />
      )}
      <span
        className={
          active
            ? "text-emerald-700 transition"
            : "text-[#9CA3AF] transition group-hover:text-[#6B7280]"
        }
      >
        <Icon name={item.icon} />
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="ops-chip ops-chip-amber text-[9.5px]">{item.badge}</span>
      )}
    </Link>
  );
}

function GroupBlock({
  group,
  pathname,
}: {
  group: OpsNavGroup;
  pathname: string;
}) {
  const hasActiveChild = group.children.some((c) => isActive(c.href, pathname));
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? hasActiveChild;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOverride(!open)}
        aria-expanded={open}
        className={[
          "group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold transition",
          hasActiveChild
            ? "text-[#111827]"
            : "text-[#374151] hover:bg-[#F6F7F9] hover:text-[#111827]",
        ].join(" ")}
      >
        <span className="text-[#9CA3AF] transition group-hover:text-[#6B7280]">
          <Icon name={group.icon} />
        </span>
        <span className="flex-1 truncate text-left">{group.label}</span>
        <svg
          className={[
            "h-3.5 w-3.5 text-[#9CA3AF] transition-transform duration-200",
            open ? "rotate-90" : "",
          ].join(" ")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
      {open && (
        <ul className="relative mt-0.5 space-y-0.5 pl-[18px]">
          <span
            aria-hidden
            className="absolute bottom-1 left-[18px] top-1 w-px bg-[#EEF0F3]"
          />
          {group.children.map((child) => (
            <li key={child.href}>
              <LeafLink item={child} pathname={pathname} nested />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/** Collapsed rail: every leaf becomes an icon-only link (groups flatten). */
function CollapsedRail({
  sections,
  pathname,
}: {
  sections: ReadonlyArray<OpsNavSection>;
  pathname: string;
}) {
  return (
    <ul className="space-y-0.5">
      {sections.map((section, si) => {
        const leaves: OpsNavLeaf[] = [];
        for (const entry of section.entries) {
          if (entry.kind === "group") leaves.push(...entry.children);
          else leaves.push(entry);
        }
        return (
          <li key={section.title}>
            {si > 0 && <div className="my-1.5 h-px bg-[#EEF0F3]" />}
            <ul className="space-y-0.5">
              {leaves.map((item) => {
                const active = isActive(item.href, pathname);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href as Route}
                      title={item.label}
                      className={[
                        "group relative flex items-center justify-center rounded-xl px-2 py-2.5 transition",
                        active
                          ? "bg-emerald-50 text-emerald-800 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.12)]"
                          : "text-[#374151] hover:bg-[#F6F7F9] hover:text-[#111827]",
                      ].join(" ")}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute bottom-1 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-emerald-600"
                        />
                      )}
                      <span
                        className={
                          active
                            ? "text-emerald-700"
                            : "text-[#9CA3AF] group-hover:text-[#6B7280]"
                        }
                      >
                        <Icon name={item.icon} />
                      </span>
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
        "hidden lg:flex sticky top-[60px] shrink-0 flex-col border-r border-[#EEF0F3] bg-white overflow-hidden",
        "h-[calc(100vh-60px)]",
        sidebarReady ? "transition-[width] duration-300 ease-in-out" : "",
        collapsed ? "w-[72px]" : "w-[248px]",
      ].join(" ")}
    >
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 [-ms-overflow-style:none] [scrollbar-width:thin]">
        {collapsed ? (
          <CollapsedRail sections={sections} pathname={pathname} />
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">
                  {section.title}
                </p>
                <ul className="space-y-0.5">
                  {section.entries.map((entry) =>
                    entry.kind === "group" ? (
                      <GroupBlock
                        key={entry.label}
                        group={entry}
                        pathname={pathname}
                      />
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
        )}
      </nav>

      <div className="border-t border-[#EEF0F3] p-2.5">
        <div
          className={[
            "rounded-xl bg-[#FAFBFC] ring-1 ring-[#EEF0F3]",
            collapsed
              ? "flex flex-col items-center gap-2 px-2 py-2.5"
              : "flex items-center gap-2.5 px-2 py-2",
          ].join(" ")}
        >
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[#111827] ring-1 ring-[#E5E7EB]"
            title={displayName || undefined}
          >
            {initials || "U"}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-semibold text-[#111827]">
                {displayName || "—"}
              </p>
              <p className="truncate text-[10.5px] text-[#9CA3AF]">
                {ROLE_LABEL[role] ?? role}
              </p>
            </div>
          )}
          <form action={crmLogout} className={collapsed ? "" : "shrink-0"}>
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
