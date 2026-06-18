/**
 * TrustBlock — E-E-A-T footer shown on every knowledge page (via KnowledgeShell).
 * Surfaces who publishes, how it is checked and when it was updated, with links
 * to the methodology, editorial and about pages.
 */
import type { Route } from "next";
import Link from "next/link";

const LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/methodik", label: "Methodik & Quellen" },
  { href: "/redaktion", label: "Redaktion & Prüfung" },
  { href: "/ueber-uns", label: "Über uns" },
];

export function TrustBlock({ updated = "2026" }: { updated?: string }) {
  return (
    <aside className="mt-14 rounded-2xl border border-ink/[0.07] bg-white/70 p-5 text-[13px] text-ink-soft shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1.5 font-semibold text-navy-950">
          <span aria-hidden className="text-emerald-600">
            ✓
          </span>
          Geprüfte Fachinformation
        </span>
        <span className="text-ink-muted">·</span>
        <span>
          Erstellt und fachlich geprüft von der Redaktion von Lokführerzentrum.de
        </span>
        <span className="text-ink-muted">·</span>
        <span>
          Zuletzt aktualisiert: <strong className="font-semibold text-ink">{updated}</strong>
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href as Route}
            className="font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            {l.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
