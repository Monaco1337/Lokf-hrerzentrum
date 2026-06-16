"use client";
/**
 * MobileNavbar — slide-down drawer rendered below the fixed Navbar.
 *
 * Pure presentation: it does not manage its own open state nor scroll
 * listeners. The Navbar passes `open`, `activeId` and the close handler.
 *
 * UX rules baked in:
 *   - Large 14 px+ tap targets, full-row tiles instead of underlined links.
 *   - Active section pill marker on the right.
 *   - Smooth height + opacity transition (no JS animation library needed).
 *   - Pointer-events disabled when closed so taps fall through to content.
 */
import Link from "next/link";

import { Logo } from "../ui/Logo";
import {
  NAV_LINKS,
  PRIMARY_CTA_HREF,
  PRIMARY_CTA_LABEL,
} from "./navConfig";

export interface MobileNavbarProps {
  id: string;
  open: boolean;
  activeId: string | null;
  onClose: () => void;
}

export function MobileNavbar({ id, open, activeId, onClose }: MobileNavbarProps) {
  return (
    <div
      id={id}
      aria-hidden={!open}
      className={[
        "overflow-hidden border-b border-ink/5 bg-white/95 backdrop-blur-xl transition-[max-height,opacity] duration-300 ease-out md:hidden",
        open
          ? "max-h-[520px] opacity-100"
          : "pointer-events-none max-h-0 opacity-0",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 pb-6 pt-2">
        {/* Brand row visible only when drawer is open — anchors identity */}
        <div className="flex items-center justify-between border-b border-ink/5 pb-3">
          <Link
            href="/"
            onClick={onClose}
            aria-label="Lokführerzentrum.de Startseite"
            className="inline-flex"
          >
            <Logo variant="icon" className="h-11 w-auto" />
          </Link>
        </div>

        <nav
          className="flex flex-col gap-1"
          aria-label="Mobile Navigation"
        >
          {NAV_LINKS.map((l) => {
            const isActive = activeId === l.id;
            return (
              <a
                key={l.id}
                href={`#${l.id}`}
                onClick={onClose}
                className={[
                  "flex items-center justify-between rounded-xl px-3 py-3 text-[15px] font-medium transition",
                  isActive
                    ? "bg-surface-subtle text-navy-950"
                    : "text-ink-soft hover:bg-surface-subtle hover:text-navy-950",
                ].join(" ")}
              >
                <span>{l.label}</span>
                <span
                  aria-hidden
                  className={[
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    isActive ? "bg-accent-600" : "bg-transparent",
                  ].join(" ")}
                />
              </a>
            );
          })}
        </nav>

        <div className="grid gap-2">
          <Link
            href={PRIMARY_CTA_HREF}
            onClick={onClose}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-600 px-5 py-3 text-[14px] font-semibold text-white shadow-cta transition hover:bg-accent-700"
          >
            {PRIMARY_CTA_LABEL}
            <ChevronRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function ChevronRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

