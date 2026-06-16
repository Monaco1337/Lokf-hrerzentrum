"use client";

import Link from "next/link";

import { Logo } from "@/components/ui/Logo";
import { useOpsShell } from "@/app/crm/OpsShellProvider";

import { LiveClock } from "./LiveClock";

export interface HeaderHealth {
  level: "ok" | "warn" | "crit";
  slaBreached: number;
  hotUnassigned: number;
  callbacksOverdue: number;
  label: string;
  dotClass: string;
}

interface OperationsTopHeaderClientProps {
  health: HeaderHealth;
  demoActive: boolean;
}

function SidebarToggle() {
  const { sidebarCollapsed, toggleSidebar } = useOpsShell();

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className="hidden lg:inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      aria-label={sidebarCollapsed ? "Navigation einblenden" : "Navigation einklappen"}
      title={sidebarCollapsed ? "Navigation einblenden" : "Navigation einklappen"}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {sidebarCollapsed ? (
          <>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16M14 10l3 2-3 2" />
          </>
        ) : (
          <>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16M15 10l-3 2 3 2" />
          </>
        )}
      </svg>
    </button>
  );
}

export function OperationsTopHeaderClient({
  health,
  demoActive,
}: OperationsTopHeaderClientProps) {
  const healthTone =
    health.level === "crit"
      ? "border-[#FECACA] bg-[#FEE2E2] text-[#991B1B]"
      : health.level === "warn"
        ? "border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]"
        : "border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]";

  return (
    <header className="sticky top-0 z-40 h-[60px] border-b border-[#EEF0F3] bg-white/90 shadow-[0_1px_0_0_rgba(15,23,42,0.04)] backdrop-blur-md">
      <div className="flex h-full items-center gap-3 px-4 sm:gap-4 sm:px-5 lg:px-6">
        <SidebarToggle />

        <span
          aria-hidden
          className="hidden h-7 w-px bg-[#E5E7EB] lg:inline-block"
        />

        <Link
          href="/crm"
          className="group flex shrink-0 items-center gap-3 rounded-lg py-1 pr-2 transition hover:opacity-90"
        >
          <Logo variant="compact" className="h-8 w-auto sm:h-9" />
          <span className="hidden flex-col border-l border-[#EEF0F3] pl-3 leading-tight md:flex">
            <span className="text-[11px] font-semibold tracking-[0.14em] text-[#9CA3AF] uppercase">
              Lead-Leitstand
            </span>
            <span className="text-[12px] font-medium text-[#6B7280]">
              Operations Center
            </span>
          </span>
        </Link>

        <span
          aria-hidden
          className="hidden h-7 w-px bg-[#E5E7EB] sm:inline-block"
        />

        <span
          className={[
            "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold sm:inline-flex",
            healthTone,
          ].join(" ")}
          title={`SLA-Verstöße: ${health.slaBreached} · Hot ohne Bearbeiter: ${health.hotUnassigned} · Rückrufe überfällig: ${health.callbacksOverdue}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${health.dotClass}`} />
          {health.label}
        </span>

        <div className="hidden items-center gap-1.5 md:flex">
          {health.slaBreached > 0 && (
            <Link
              href="/crm/leads?sla=1"
              className="ops-chip ops-chip-red transition hover:opacity-90"
            >
              <span className="ops-dot bg-red-500" />
              {health.slaBreached} SLA
            </Link>
          )}
          {health.hotUnassigned > 0 && (
            <Link
              href="/crm/leads?priority=HOT&unassigned=1"
              className="ops-chip ops-chip-orange transition hover:opacity-90"
            >
              <span className="ops-dot bg-orange-500" />
              {health.hotUnassigned} HOT offen
            </Link>
          )}
          {health.callbacksOverdue > 0 && (
            <Link
              href="/crm/sales/followups"
              className="ops-chip ops-chip-amber transition hover:opacity-90"
            >
              <span className="ops-dot bg-amber-500" />
              {health.callbacksOverdue} Rückrufe
            </Link>
          )}
          {health.slaBreached === 0 &&
            health.hotUnassigned === 0 &&
            health.callbacksOverdue === 0 && (
              <span className="ops-chip ops-chip-green">
                <span className="ops-dot bg-emerald-500" />
                Keine Eskalationen
              </span>
            )}
        </div>

        <div className="flex-1" />

        {demoActive && (
          <Link
            href="/crm/settings"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-semibold text-[#92400E] transition hover:bg-[#FDE68A]"
            title="Demo-Modus aktiv — Beispieldaten werden angezeigt. Verwalten unter Einstellungen."
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </span>
            <span className="hidden sm:inline">Demo-Modus</span>
            <span className="sm:hidden">Demo</span>
          </Link>
        )}

        <LiveClock />

        <a
          href="/eignungs-check"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-[12px] font-medium text-[#374151] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#D1D5DB] hover:bg-[#F9FAFB] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          title="Öffentliches Bewerberportal"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 text-[#9CA3AF]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 14 21 3" />
            <path d="M21 9V3h-6" />
            <path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6" />
          </svg>
          <span className="hidden sm:inline">Bewerberportal</span>
        </a>
      </div>
    </header>
  );
}
