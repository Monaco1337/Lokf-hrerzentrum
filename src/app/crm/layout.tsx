/**
 * CRM Operations Center shell — Dark Executive layout.
 *
 * Anatomy:
 *  - top header (sticky): brand mark, search, status pill, user menu
 *  - left sidebar (sticky): 17 sections from the operations spec
 *  - main content: dark canvas (#050505), responsive to mobile
 *
 * The whole tree carries `data-ops` so the global `.ops-*` utilities in
 * `globals.css` take effect, while the public marketing site keeps its
 * light theme. The /crm/login route renders raw (no chrome) — same as before.
 */
import { headers } from "next/headers";
import Link from "next/link";

import { OperationsTopHeader } from "@/features/fairtrain-funnel/crm/operations/OperationsTopHeader";
import { userService } from "@/server/services/UserService";

import { OpsSidebar } from "./OpsSidebar";

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await userService.ensureBootstrapAdmins();

  const pathname = (await headers()).get("x-pathname") ?? "";
  if (pathname.startsWith("/crm/login")) {
    return <>{children}</>;
  }

  return (
    <div data-ops className="min-h-screen bg-[#050505] text-zinc-100">
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
  );
}

/**
 * Mobile fallback for the 17-section sidebar — the sidebar itself hides
 * below `lg` to preserve usable canvas space on tablets and phones.
 * Renders a horizontally scrollable chip strip with the top 8 destinations.
 */
function MobileSectionNav() {
  const items: Array<{ href: string; label: string }> = [
    { href: "/crm", label: "Leitstand" },
    { href: "/crm/leads", label: "Leads" },
    { href: "/crm/pipeline", label: "Pipeline" },
    { href: "/crm/sales/dialer", label: "Anrufcenter" },
    { href: "/crm/tasks", label: "Aufgaben" },
    { href: "/crm/unterlagen", label: "Unterlagen" },
    { href: "/crm/bildungsgutschein", label: "Bildungsgutschein" },
    { href: "/crm/agenturtermine", label: "Termine" },
  ];
  return (
    <nav className="lg:hidden border-b border-white/[0.06] bg-[#0a0a0b]">
      <ul className="flex gap-1 overflow-x-auto px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((i) => (
          <li key={i.href} className="shrink-0">
            <Link
              href={i.href as never}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
            >
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
