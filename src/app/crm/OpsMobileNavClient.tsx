"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { OpsNavIcon as Icon } from "./OpsNavIcon";
import { colorForHref, type OpsNavLeaf } from "./opsNav";

function isActive(href: string, pathname: string): boolean {
  if (href === "/crm") return pathname === "/crm";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Phone rail: a single sticky, swipeable strip of colour-tile destinations.
 * Hidden from `md` up (the sidebar handles tablet/desktop).
 */
export function OpsMobileNavClient({ items }: { items: OpsNavLeaf[] }) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      className="md:hidden sticky top-[60px] z-30 border-b border-[#EEF0F3] bg-white/90 backdrop-blur-md"
      aria-label="Hauptnavigation"
    >
      <ul className="flex gap-1.5 overflow-x-auto px-3 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [scroll-snap-type:x_proximity] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = isActive(item.href, pathname);
          const color = colorForHref(item.href);
          return (
            <li key={item.href} className="shrink-0 [scroll-snap-align:start]">
              <Link
                href={item.href as Route}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex w-[68px] flex-col items-center gap-1.5 rounded-2xl px-1 py-1.5 transition",
                  active ? color.row : "hover:bg-[#F6F7F9]",
                ].join(" ")}
              >
                <span className="relative">
                  <span
                    className={[
                      "inline-flex h-9 w-9 items-center justify-center rounded-[12px] transition",
                      active ? color.tileActive : color.tile,
                    ].join(" ")}
                  >
                    <Icon name={item.icon} />
                  </span>
                  {item.badge && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span
                  className={[
                    "max-w-full truncate text-[10px] font-semibold leading-tight",
                    active ? "" : "text-[#6B7280]",
                  ].join(" ")}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
