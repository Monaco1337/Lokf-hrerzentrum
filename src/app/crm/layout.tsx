/**
 * CRM Operations Center shell — Premium Light layout.
 *
 * Anatomy:
 *  - top header (sticky): brand mark, search, status pill, user menu
 *  - left sidebar (sticky): 17 sections from the operations spec
 *  - main content: light canvas (#F6F7F9), responsive to mobile
 *
 * The whole tree carries `data-ops` so the global `.ops-*` utilities in
 * `globals.css` take effect, while the public marketing site keeps its
 * own visual identity. The /crm/login route renders raw (no chrome) —
 * same as before.
 */
import { headers } from "next/headers";
import Link from "next/link";

import { AutoRefresh } from "@/features/fairtrain-funnel/crm/operations/AutoRefresh";
import { OperationsTopHeader } from "@/features/fairtrain-funnel/crm/operations/OperationsTopHeader";
import { userService } from "@/server/services/UserService";

import { OpsShellProvider } from "./OpsShellProvider";
import { OpsSidebar } from "./OpsSidebar";

// The CRM is auth-gated and reads per-request state (cookies, headers) plus the
// DB on every render. It must never be statically prerendered at build time
// (no DB is reachable during `next build` / on Vercel), so force dynamic.
export const dynamic = "force-dynamic";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Bootstrap seeding runs on every render as a convenience, but it is a DB
  // write and must NEVER take down the whole CRM shell. A transient DB hiccup
  // (cold start, pool exhaustion) here previously bubbled up as an uncaught
  // server exception -> white screen. Degrade gracefully instead; the seeded
  // admins already exist in steady state, and any real DB outage will surface
  // as a controlled error boundary further down the tree.
  try {
    await userService.ensureBootstrapAdmins();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[crm-layout] ensureBootstrapAdmins failed (non-fatal)", err);
  }

  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname.startsWith("/crm/login")) {
    return <>{children}</>;
  }

  return (
    <OpsShellProvider>
      <div data-ops className="min-h-screen bg-[#F6F7F9] text-[#111827]">
        {/* Keeps the sticky top bar (Eskalation/HOT/Rückrufe) and every page
            reconciled with the DB automatically, everywhere in the CRM — not
            only on the Dashboard. */}
        <AutoRefresh />

        {/* Sticky top bar */}
        <OperationsTopHeader />

        {/* Layout body: sidebar + content */}
        <div className="flex">
          <OpsSidebar />
          <main className="min-w-0 flex-1">
            {/* Mobile section nav */}
            <MobileSectionNav />
            <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
              {children}
            </div>
          </main>
        </div>
      </div>
    </OpsShellProvider>
  );
}

/**
 * Mobile fallback for the 17-section sidebar — the sidebar itself hides
 * below `lg` to preserve usable canvas space on tablets and phones.
 * Renders a horizontally scrollable chip strip with the top 8 destinations.
 */
function MobileSectionNav() {
  const items: Array<{ href: string; label: string }> = [
    { href: "/crm", label: "Dashboard" },
    { href: "/crm/leads", label: "Leads" },
    { href: "/crm/pipeline", label: "Pipeline" },
    { href: "/crm/multichat", label: "Multichat" },
    { href: "/crm/communication", label: "Kommunikation" },
    { href: "/crm/unterlagen", label: "Bewerberakte" },
    { href: "/crm/bildungsgutschein", label: "Bildungsgutscheine" },
    { href: "/crm/agenturtermine", label: "Termine" },
  ];
  return (
    <nav className="lg:hidden border-b border-[#EEF0F3] bg-white">
      <ul className="flex gap-1 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((i) => (
          <li key={i.href} className="shrink-0">
            <Link
              href={i.href as never}
              className="rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#374151] transition hover:bg-[#F9FAFB] hover:text-[#111827]"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
