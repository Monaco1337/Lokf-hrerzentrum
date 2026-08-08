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
import { Suspense } from "react";

import { AutoRefresh } from "@/features/fairtrain-funnel/crm/operations/AutoRefresh";
import { OperationsTopHeader } from "@/features/fairtrain-funnel/crm/operations/OperationsTopHeader";
import { userService } from "@/server/services/UserService";

import { OpsMobileNav } from "./OpsMobileNav";
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
      <div data-ops className="min-h-screen bg-[#0b100e] text-[#e9efeb]">
        {/* Keeps the sticky top bar (Eskalation/HOT/Rückrufe) and every page
            reconciled with the DB automatically, everywhere in the CRM — not
            only on the Dashboard. */}
        <AutoRefresh />

        {/* Sticky top bar — streamed so the shell paints instantly instead of
            blocking on the header's live health counts. */}
        <Suspense fallback={<TopHeaderSkeleton />}>
          <OperationsTopHeader />
        </Suspense>

        {/* Layout body: sidebar + content */}
        <div className="flex">
          {/* Sidebar streamed too: the page skeleton + nav appear immediately
              while the per-user permission/badge query resolves. */}
          <Suspense fallback={<SidebarSkeleton />}>
            <OpsSidebar />
          </Suspense>
          <main className="min-w-0 flex-1">
            {/* Phone navigation — premium colour-tile rail (no burger). Hidden
                from md up where the sidebar/rail takes over. */}
            <Suspense fallback={<MobileNavSkeleton />}>
              <OpsMobileNav />
            </Suspense>
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
 * Instant, layout-shift-free placeholder for the sticky top header while its
 * live health counts stream in. Matches the real header's 60px height.
 */
function TopHeaderSkeleton() {
  return (
    <div className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-[#EEF0F3] bg-white px-4 sm:px-6">
      <div className="h-6 w-40 animate-pulse rounded-lg bg-white/[0.06]" />
      <div className="h-8 w-8 animate-pulse rounded-full bg-white/[0.06]" />
    </div>
  );
}

/**
 * Instant placeholder for the sticky sidebar — matches the responsive rail
 * (76px on tablet) / full (248px on desktop) footprint so there's no layout
 * shift while the per-user permission/badge query resolves.
 */
function SidebarSkeleton() {
  return (
    <aside className="hidden shrink-0 flex-col border-r border-[#EEF0F3] bg-white md:flex sticky top-[60px] h-[calc(100vh-60px)] w-[76px] lg:w-[248px]">
      <div className="flex-1 space-y-2 p-2.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <div className="h-8 w-8 animate-pulse rounded-[10px] bg-white/[0.06]" />
            <div className="hidden h-3.5 w-28 animate-pulse rounded bg-white/[0.04] lg:block" />
          </div>
        ))}
      </div>
    </aside>
  );
}

/** Instant placeholder for the phone rail (matches its height, no layout shift). */
function MobileNavSkeleton() {
  return (
    <div className="md:hidden sticky top-[60px] z-30 border-b border-[#EEF0F3] bg-white">
      <div className="flex gap-1.5 overflow-hidden px-3 py-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 py-1.5">
            <div className="h-9 w-9 animate-pulse rounded-[12px] bg-white/[0.06]" />
            <div className="h-2.5 w-12 animate-pulse rounded bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}
