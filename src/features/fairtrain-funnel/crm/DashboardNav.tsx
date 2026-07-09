/**
 * Quick-access navigation for the CRM dashboard.
 *
 * A premium tile row that lets the operator jump anywhere in one click:
 * Leads, Anfragen (inbox), Automation and the public Eignungscheck. Lives in
 * its own file so Dashboard.tsx stays under the 300-line guardrail.
 */
import Link from "next/link";
import type { ComponentProps } from "react";

type LinkHref = ComponentProps<typeof Link>["href"];

interface NavTile {
  label: string;
  hint: string;
  href: LinkHref;
  external?: boolean;
  tone: "brand" | "accent" | "indigo" | "emerald";
  icon: React.ReactNode;
}

const TONE: Record<NavTile["tone"], { tile: string; icon: string }> = {
  brand: {
    tile: "hover:border-brand-200 hover:shadow-[0_12px_30px_-16px_rgba(37,99,235,0.45)]",
    icon: "bg-brand-50 text-brand-700 ring-brand-100",
  },
  accent: {
    tile: "hover:border-accent-200 hover:shadow-[0_12px_30px_-16px_rgba(63,114,72,0.4)]",
    icon: "bg-accent-50 text-accent-700 ring-accent-100",
  },
  indigo: {
    tile: "hover:border-indigo-200 hover:shadow-[0_12px_30px_-16px_rgba(79,70,229,0.4)]",
    icon: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  },
  emerald: {
    tile: "hover:border-emerald-200 hover:shadow-[0_12px_30px_-16px_rgba(16,185,129,0.4)]",
    icon: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
};

const TILES: ReadonlyArray<NavTile> = [
  {
    label: "Leads",
    hint: "Pipeline verwalten",
    href: "/crm/leads",
    tone: "brand",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Anfragen",
    hint: "Posteingang Kontaktformular",
    href: "/crm/inquiries",
    tone: "indigo",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    ),
  },
  {
    label: "Automation",
    hint: "Vorlagen & Versand-Logs",
    href: "/crm/automation",
    tone: "accent",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    label: "Eignungscheck",
    hint: "Funnel öffnen (neuer Tab)",
    href: "/eignungscheck",
    external: true,
    tone: "emerald",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
];

export function DashboardNav() {
  return (
    <nav aria-label="Schnellzugriff" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {TILES.map((tile) => {
        const t = TONE[tile.tone];
        const external = tile.external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {};
        return (
          <Link
            key={tile.label}
            href={tile.href}
            {...external}
            className={[
              "group flex items-center gap-4 rounded-2xl border border-ink/10 bg-white p-4 transition",
              "shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:-translate-y-0.5",
              t.tile,
            ].join(" ")}
          >
            <span
              aria-hidden
              className={["inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition group-hover:scale-105", t.icon].join(" ")}
            >
              {tile.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold tracking-tight text-navy-950">
                {tile.label}
              </span>
              <span className="block truncate text-[12.5px] text-ink-muted">
                {tile.hint}
              </span>
            </span>
            <span
              aria-hidden
              className="text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink-soft"
            >
              →
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
