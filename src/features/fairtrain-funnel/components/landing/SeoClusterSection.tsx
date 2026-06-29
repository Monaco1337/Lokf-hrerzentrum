/**
 * SeoClusterSection — the homepage internal-linking hub for the national SEO
 * cluster. Server-rendered (static HTML) so every city, federal state and
 * employer page receives a crawlable link from the site's highest-authority
 * page. This is what makes the programmatic cluster discoverable and rankable.
 *
 * Design follows the landing system: centred section header with accent rules,
 * display headline with an accent-gradient highlight, hairline cards on white.
 */
import type { Route } from "next";
import Link from "next/link";

import { EMPLOYERS } from "@/features/knowledge/content/arbeitgeber";
import { REGIONS } from "@/features/knowledge/content/bundeslaender";
import { CITIES } from "@/features/knowledge/content/staedte";

export function SeoClusterSection() {
  return (
    <section
      id="staedte"
      aria-label="Lokführer werden in deiner Stadt"
      className="relative bg-gradient-to-b from-surface-subtle to-white"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent"
      />
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24 lg:py-28">
        <SectionHeader />

        {/* Cities */}
        <div className="mt-14 lg:mt-16">
          <BlockHeading
            kicker="Städte"
            title="Finde deinen Einstieg vor Ort"
            sub="18 Bahn-Standorte mit lokalen Arbeitgebern, Umschulung und Gehalt."
          />
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CITIES.map((c) => (
              <Link
                key={c.slug}
                href={`/staedte/${c.slug}` as Route}
                className="group flex items-center justify-between gap-2 rounded-2xl border border-ink/10 bg-white px-4 py-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-premium"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <PinGlyph className="h-4 w-4 shrink-0 text-accent-600" />
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-semibold tracking-tight text-navy-950">
                      {c.name}
                    </span>
                    <span className="block truncate text-[12px] text-ink-muted">
                      {c.bundeslandName}
                    </span>
                  </span>
                </span>
                <ArrowGlyph className="h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-600" />
              </Link>
            ))}
          </div>
        </div>

        {/* Federal states */}
        <div className="mt-14">
          <BlockHeading
            kicker="Bundesländer"
            title="Lokführer werden nach Bundesland"
            sub="Regionaler Arbeitsmarkt, Förderung und Arbeitgeber in allen 16 Ländern."
          />
          <div className="mt-6 flex flex-wrap gap-2.5">
            {REGIONS.map((r) => (
              <ChipLink key={r.slug} href={`/regionen/${r.slug}` as Route}>
                {r.name}
              </ChipLink>
            ))}
          </div>
        </div>

        {/* Employers */}
        <div className="mt-14">
          <BlockHeading
            kicker="Arbeitgeber"
            title="Die wichtigsten Bahn-Arbeitgeber"
            sub="Profile, Gehalt, Einsatzgebiete und Bewerbung im Vergleich."
          />
          <div className="mt-6 flex flex-wrap gap-2.5">
            {EMPLOYERS.map((e) => (
              <ChipLink key={e.slug} href={`/arbeitgeber/${e.slug}` as Route}>
                {e.name}
              </ChipLink>
            ))}
          </div>
        </div>

        {/* Index CTAs */}
        <div className="mt-14 grid gap-3 sm:grid-cols-3">
          <IndexCta href="/staedte" title="Alle Städte" sub="Vollständige Standortübersicht" />
          <IndexCta href="/regionen" title="Alle Regionen" sub="16 Bundesländer-Hubs" />
          <IndexCta href="/arbeitgeber" title="Arbeitgebervergleich" sub="Alle Anbieter im Überblick" />
        </div>
      </div>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="flex items-center justify-center gap-3">
        <span aria-hidden className="h-px w-8 bg-accent-600" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-navy-900">
          Bundesweit
        </span>
        <span aria-hidden className="h-px w-8 bg-accent-600" />
      </div>
      <h2
        className="mt-6 font-display text-[clamp(1.875rem,3.4vw,3rem)] font-extrabold text-navy-950"
        style={{ letterSpacing: "-0.028em", lineHeight: 1.05 }}
      >
        Lokführer werden —{" "}
        <span
          className="whitespace-nowrap bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 bg-clip-text text-transparent"
          style={{ WebkitBackgroundClip: "text" }}
        >
          in deiner Stadt
        </span>
      </h2>
      <p className="mt-5 text-base leading-relaxed text-ink-soft sm:text-[17px]">
        Egal wo du startest: Wir zeigen dir Arbeitsmarkt, Umschulung, Förderung
        und Arbeitgeber direkt für deine Region – bundesweit in jeder
        relevanten Stadt.
      </p>
    </div>
  );
}

function BlockHeading({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-700">
        {kicker}
      </p>
      <h3 className="mt-2 font-display text-[20px] font-extrabold tracking-tight text-navy-950 sm:text-[24px]">
        {title}
      </h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{sub}</p>
    </div>
  );
}

function ChipLink({
  href,
  children,
}: {
  href: Route;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-[13.5px] font-medium text-ink-soft shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-200 hover:bg-accent-50/60 hover:text-navy-950"
    >
      {children}
    </Link>
  );
}

function IndexCta({
  href,
  title,
  sub,
}: {
  href: string;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href as Route}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white px-5 py-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-premium"
    >
      <span>
        <span className="block text-[15px] font-semibold tracking-tight text-navy-950">
          {title}
        </span>
        <span className="block text-[12.5px] text-ink-muted">{sub}</span>
      </span>
      <ArrowGlyph className="h-5 w-5 shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-600" />
    </Link>
  );
}

function PinGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function ArrowGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
