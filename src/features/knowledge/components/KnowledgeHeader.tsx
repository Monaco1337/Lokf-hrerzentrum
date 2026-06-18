/**
 * Slim, content-first header for the knowledge platform.
 *
 * Unlike the landing Navbar (hash-anchored, client, scroll-aware), this header
 * is a server component with real internal links between hubs — exactly the
 * crawlable internal-linking surface the knowledge graph needs. Brand mark
 * links home; a single accent CTA routes to the eligibility check.
 */
import type { Route } from "next";
import Link from "next/link";

import { Logo } from "@/components/ui/Logo";

import { KNOWLEDGE_NAV } from "../routes";

export function KnowledgeHeader({ activePath }: { activePath?: string }) {
  return (
    <header className="sticky top-0 z-50 border-b border-ink/[0.07] bg-white/80 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/65">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link href="/" aria-label="Lokführerzentrum.de Startseite" className="inline-flex shrink-0">
          <Logo variant="compact" className="h-8 w-auto" />
        </Link>

        <nav aria-label="Wissensnavigation" className="hidden items-center gap-1 md:flex">
          {KNOWLEDGE_NAV.map((r) => {
            const active = activePath === r.path;
            return (
              <Link
                key={r.path}
                href={r.path as Route}
                aria-current={active ? "page" : undefined}
                className={[
                  "rounded-full px-3.5 py-2 text-[13.5px] font-medium transition-colors",
                  active
                    ? "bg-ink/[0.05] text-ink"
                    : "text-ink-soft hover:bg-ink/[0.04] hover:text-ink",
                ].join(" ")}
              >
                {r.navLabel}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/eligibility"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent-600 px-4 py-2 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_18px_-8px_rgba(63,114,72,0.45)] ring-1 ring-accent-700/15 transition-all duration-200 hover:-translate-y-px hover:bg-accent-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
        >
          Eignung prüfen
        </Link>
      </div>

      {/* Mobile nav row — horizontal scroll, real links */}
      <nav
        aria-label="Wissensnavigation (mobil)"
        className="flex items-center gap-1 overflow-x-auto border-t border-ink/[0.05] px-5 py-2 md:hidden"
      >
        {KNOWLEDGE_NAV.map((r) => {
          const active = activePath === r.path;
          return (
            <Link
              key={r.path}
              href={r.path as Route}
              aria-current={active ? "page" : undefined}
              className={[
                "whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                active ? "bg-ink/[0.05] text-ink" : "text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              {r.navLabel}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
