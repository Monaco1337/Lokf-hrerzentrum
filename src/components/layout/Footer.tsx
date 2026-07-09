/**
 * Footer — premium, light editorial close for the landing site.
 *
 * Three vertically-stacked regions on a soft light surface:
 *   1. Final-call ribbon — last conversion anchor with eyebrow + headline
 *      + primary CTA, separated by a hairline rule.
 *   2. Sitemap grid — four columns (brand · programm · standorte · recht).
 *   3. Smallprint row — copyright, tagline, geo-stamp.
 *
 * Light design language:
 *   - Off-white gradient surface with a faint accent glow up top.
 *   - Hairline ink/10 dividers between every region.
 *   - Ink/navy typography; the red CTA stays as the single warm accent.
 */
import type { Route } from "next";
import Link from "next/link";

import { CITIES } from "@/features/knowledge/content/staedte";
import { KNOWLEDGE_NAV } from "@/features/knowledge/routes";

import { Logo } from "../ui/Logo";
import { NAV_LINKS, PRIMARY_CTA_HREF } from "./navConfig";

interface FooterLinkItem {
  href: string;
  label: string;
}

/** Knowledge hubs surfaced in the footer for crawlable internal linking. */
const KNOWLEDGE_FOOTER_LINKS: ReadonlyArray<FooterLinkItem> = KNOWLEDGE_NAV.map(
  (r) => ({ href: r.path, label: r.navLabel ?? r.path }),
);

/** Top cities surfaced sitewide for crawlable internal linking to the cluster. */
const TOP_CITY_SLUGS = [
  "berlin",
  "hamburg",
  "muenchen",
  "koeln",
  "frankfurt",
  "stuttgart",
  "duesseldorf",
  "leipzig",
] as const;

const CITY_FOOTER_LINKS: ReadonlyArray<FooterLinkItem> = TOP_CITY_SLUGS
  .map((slug) => CITIES.find((c) => c.slug === slug))
  .filter((c): c is NonNullable<typeof c> => Boolean(c))
  .map((c) => ({ href: `/staedte/${c.slug}`, label: c.name }));

const LEGAL_LINKS: ReadonlyArray<FooterLinkItem> = [
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/impressum", label: "Impressum" },
  { href: "/agb", label: "AGB" },
];

const LOCATIONS: ReadonlyArray<{ city: string; sub: string }> = [
  { city: "Saalfeld", sub: "inkl. Unterkunft" },
  { city: "Berlin", sub: "in der Hauptstadt" },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-white to-surface-subtle text-ink-soft">
      {/* Decorative accent glow at the top edge — very subtle on light */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[460px] w-[820px] -translate-x-1/2 rounded-full bg-accent-500/[0.06] blur-[180px]"
      />
      {/* Hairline brand line at the very top */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent"
      />

      <FinalCtaRibbon />
      <SitemapGrid />
      <SmallprintRow />
    </footer>
  );
}

// ---- final CTA ribbon -----------------------------------------------------

function FinalCtaRibbon() {
  return (
    <section
      aria-label="Bereit für den Eignungscheck"
      className="relative border-b border-ink/10"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-6 py-14 md:flex-row md:items-end md:justify-between md:gap-10 md:px-10 md:py-16">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent-600">
            Bereit für den nächsten Schritt?
          </p>
          <h2
            className="mt-3 font-display text-[30px] font-extrabold leading-[1.05] tracking-tight text-navy-950 md:text-[40px]"
            style={{ letterSpacing: "-0.02em", textWrap: "balance" }}
          >
            Prüfe deine Eignung —{" "}
            <span className="text-ink-muted">in unter 3 Minuten.</span>
          </h2>
          <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-soft">
            Kostenlos. Unverbindlich. DSGVO-konform. Du bekommst eine ehrliche
            Einschätzung und einen klaren nächsten Schritt.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 md:items-end">
          <Link
            href={PRIMARY_CTA_HREF}
            className={[
              "group inline-flex items-center justify-center gap-2 rounded-full",
              "bg-gradient-to-b from-accent-500 to-accent-700 px-7 py-3.5",
              "text-[14.5px] font-semibold tracking-tight text-white",
              "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_1px_2px_rgba(15,23,42,0.4),0_20px_40px_-14px_rgba(63,114,72,0.55)]",
              "ring-1 ring-accent-700/40",
              "transition-all duration-[250ms] ease-out",
              "hover:-translate-y-0.5 hover:from-accent-500 hover:to-accent-600",
              "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_2px_3px_rgba(15,23,42,0.4),0_26px_48px_-14px_rgba(63,114,72,0.65)]",
              "active:translate-y-0 active:scale-[0.985] active:from-accent-700 active:to-accent-800",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
            ].join(" ")}
          >
            <span className="whitespace-nowrap">Eignung kostenlos prüfen</span>
            <span
              aria-hidden
              className="relative ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-all duration-300 group-hover:bg-white/20 group-hover:translate-x-0.5"
            >
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </span>
          </Link>
          <p className="text-center text-[11.5px] tracking-tight text-ink-muted md:text-right">
            Kostenlos · Unverbindlich · DSGVO-konform
          </p>
        </div>
      </div>
    </section>
  );
}

// ---- sitemap grid ---------------------------------------------------------

function SitemapGrid() {
  return (
    <div className="relative mx-auto max-w-7xl px-6 pt-14 md:px-10 md:pt-20">
      <div className="grid gap-12 md:grid-cols-12 md:gap-10">
        {/* Brand voice */}
        <div className="md:col-span-4">
          <Link
            href="/"
            aria-label="Lokführerzentrum.de Startseite"
            className="inline-flex"
          >
            <Logo variant="full" className="h-11 w-auto" />
          </Link>
          <p className="mt-6 max-w-md text-[14.5px] leading-relaxed text-ink-soft">
            Premium-Plattform für die geförderte Lokführer-Weiterbildung. Wir
            begleiten dich persönlich vom Eignungscheck bis zum
            Bildungsgutschein — Standorte Berlin und Saalfeld.
          </p>

          <a
            href="mailto:foerderung@xn--lokfhrerzentrum-2vb.de"
            className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-ink/10 bg-white px-4 py-2.5 text-[13.5px] font-medium text-navy-900 shadow-sm transition hover:border-ink/20 hover:bg-surface-subtle"
          >
            <MailGlyph className="h-4 w-4 text-accent-600" />
            foerderung@lokführerzentrum.de
          </a>
        </div>

        {/* Programm */}
        <FooterColumn className="md:col-span-2" title="Programm">
          {NAV_LINKS.map((l) => (
            <FooterLink key={l.id} href={`#${l.id}`}>
              {l.label}
            </FooterLink>
          ))}
          <li>
            <Link
              href="/eignungscheck"
              className="inline-flex items-center text-[13.5px] text-ink-soft transition hover:text-navy-950"
            >
              Eignungscheck
            </Link>
          </li>
          {KNOWLEDGE_FOOTER_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href as Route}
                className="inline-flex items-center text-[13.5px] text-ink-soft transition hover:text-navy-950"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </FooterColumn>

        {/* Städte (SEO cluster) */}
        <FooterColumn className="md:col-span-2" title="Städte">
          {CITY_FOOTER_LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href as Route}
                className="inline-flex items-center text-[13.5px] text-ink-soft transition hover:text-navy-950"
              >
                {l.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/staedte"
              className="inline-flex items-center font-semibold text-accent-700 transition hover:text-accent-800"
            >
              Alle Städte →
            </Link>
          </li>
        </FooterColumn>

        {/* Standorte */}
        <FooterColumn className="md:col-span-2" title="Standorte">
          {LOCATIONS.map((l) => (
            <li key={l.city}>
              <a
                href="#standorte"
                className="group inline-flex flex-col text-[13.5px] text-ink-soft transition hover:text-navy-950"
              >
                <span className="font-semibold text-navy-900">{l.city}</span>
                <span className="text-[12px] text-ink-muted group-hover:text-ink-soft">
                  {l.sub}
                </span>
              </a>
            </li>
          ))}
        </FooterColumn>

        {/* Legal */}
        <FooterColumn className="md:col-span-2" title="Vertrauen & Recht">
          {LEGAL_LINKS.map((l) => (
            <FooterLink key={l.href} href={l.href}>
              {l.label}
            </FooterLink>
          ))}
          <li>
            <span className="inline-flex items-center gap-2 text-[13px] text-ink-soft">
              <ShieldIcon className="h-3.5 w-3.5 text-emerald-600" />
              DSGVO-konform · Hosting EU
            </span>
          </li>
          <li>
            <span className="inline-flex items-center gap-2 text-[13px] text-ink-soft">
              <CheckIcon className="h-3.5 w-3.5 text-emerald-600" />
              Geprüfter Bildungsträger
            </span>
          </li>
        </FooterColumn>
      </div>
    </div>
  );
}

// ---- smallprint row -------------------------------------------------------

function SmallprintRow() {
  return (
    <div className="relative mx-auto mt-14 max-w-7xl px-6 pb-10 md:mt-20 md:px-10 md:pb-12">
      <div className="flex flex-col items-start justify-between gap-3 border-t border-ink/10 pt-6 text-[12px] text-ink-muted md:flex-row md:items-center">
        <span>
          © {new Date().getFullYear()} Lokführerzentrum.de · Alle Rechte
          vorbehalten.
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-1 w-1 rounded-full bg-accent-500"
          />
          <span className="tracking-tight">
            Dein Einstieg. Deine Zukunft. Dein Weg.
          </span>
        </span>
      </div>
    </div>
  );
}

// ---- helpers --------------------------------------------------------------

interface FooterColumnProps {
  className?: string;
  title: string;
  children: React.ReactNode;
}

function FooterColumn({ className, title, children }: FooterColumnProps) {
  return (
    <div className={className}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-muted">
        {title}
      </h3>
      <ul className="mt-5 space-y-3">{children}</ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <a
        href={href}
        className="inline-flex items-center text-[13.5px] text-ink-soft transition hover:text-navy-950"
      >
        {children}
      </a>
    </li>
  );
}

// ---- icons ----------------------------------------------------------------

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ShieldIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function MailGlyph(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
