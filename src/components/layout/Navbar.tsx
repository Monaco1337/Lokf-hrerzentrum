"use client";
/**
 * Navbar — fixed, scroll-aware navigation for the Lokführerzentrum.de site.
 *
 * Behaviour:
 *  - Always present at the top so brand + nav + primary CTA stay one click
 *    away. The hero state is *transparent* (no background, no shadow): the
 *    hero's own composition handles legibility (white plate left, top
 *    dissolve) so the bar feels glued to the photograph rather than
 *    floating on a tile.
 *  - Once the trigger section (see `NAVBAR_SCROLL_TRIGGER_ID`) reaches the
 *    top edge of the viewport, the bar transitions into a frosted glass
 *    with a hairline shadow and shrinks 1 rem in height for the in-page
 *    state.
 *  - The active landing section is detected via IntersectionObserver and
 *    marked with a small accent dot under the matching link.
 *  - Mobile: logo left · Eignungscheck + menu right. Drawer via <MobileNavbar />.
 *
 * Cooperates with body padding via FairtrainLandingPage's hero top padding.
 */
import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "../ui/Logo";
import { MobileNavbar } from "./MobileNavbar";
import {
  NAV_LINKS,
  NAVBAR_SCROLL_TRIGGER_ID,
  NAVBAR_TOP_OFFSET,
  PRIMARY_CTA_HREF,
} from "./navConfig";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Decide whether the frosted state applies. The trigger section's top edge
  // crossing below the navbar height = "we left the hero". Fall back to 70vh
  // scroll until the trigger mounts (rare; covers SSR hydration race).
  useEffect(() => {
    const trigger = document.getElementById(NAVBAR_SCROLL_TRIGGER_ID);
    const onScroll = () => {
      if (trigger) {
        setScrolled(trigger.getBoundingClientRect().top <= NAVBAR_TOP_OFFSET);
      } else {
        setScrolled(window.scrollY > window.innerHeight * 0.7);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Active section indicator using IntersectionObserver.
  useEffect(() => {
    const sections = NAV_LINKS
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  // Auto-close drawer at desktop breakpoint.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <header
      style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 60 }}
      className={[
        "transition-[background-color,box-shadow,backdrop-filter] duration-500",
        "ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        scrolled
          ? "bg-white/80 shadow-[0_1px_0_0_rgba(15,23,42,0.06),0_14px_28px_-22px_rgba(15,23,42,0.20)] backdrop-blur-xl supports-[backdrop-filter]:bg-white/65"
          : "bg-transparent shadow-none",
      ].join(" ")}
    >
      <div
        className={[
          "mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 transition-[height] duration-300 sm:px-6 md:grid md:grid-cols-3 md:gap-2",
          scrolled ? "h-16" : "h-20",
        ].join(" ")}
      >
        {/* Left: icon logo (mobile) · compact logo (desktop) */}
        <div className="flex min-w-0 shrink-0 items-center justify-start">
          <Link
            href="/"
            aria-label="Lokführerzentrum.de Startseite"
            className="inline-flex md:hidden"
          >
            <Logo
              variant="icon"
              className={[
                "w-auto transition-[height] duration-300",
                scrolled ? "h-10" : "h-11",
              ].join(" ")}
            />
          </Link>

          <Link
            href="/"
            aria-label="Lokführerzentrum.de Startseite"
            className="hidden md:inline-flex"
          >
            <Logo
              variant="compact"
              className={[
                "w-auto transition-[height] duration-300",
                scrolled ? "h-9" : "h-11",
              ].join(" ")}
            />
          </Link>
        </div>

        {/* Center: desktop nav only */}
        <div className="hidden items-center justify-center md:flex">
          <nav className="flex items-center gap-1" aria-label="Hauptnavigation">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.id}
                href={`#${l.id}`}
                active={activeId === l.id}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right: CTA + menu (mobile) · CTA (desktop) */}
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
          <Link
            href={PRIMARY_CTA_HREF}
            className={[
              "group inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full",
              "bg-accent-600 px-4 py-2",
              "text-[13px] font-semibold tracking-tight text-white",
              "shadow-[0_1px_2px_rgba(15,23,42,0.06),0_8px_18px_-8px_rgba(63,114,72,0.45)]",
              "ring-1 ring-accent-700/15",
              "transition-all duration-[250ms] ease-out",
              "hover:-translate-y-px hover:bg-accent-500 hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_10px_22px_-8px_rgba(63,114,72,0.55)]",
              "active:scale-[0.98] active:bg-accent-700",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2",
              "sm:gap-2 sm:px-5 sm:py-2.5 sm:text-[13.5px]",
            ].join(" ")}
          >
            <span className="whitespace-nowrap">Check starten</span>
            <ArrowRightIcon className="hidden h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 sm:block" />
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-controls="site-mobile-menu"
            aria-label={mobileOpen ? "Menü schließen" : "Menü öffnen"}
            className={[
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full md:hidden",
              "border border-ink/10 bg-white/90 text-navy-900 shadow-sm backdrop-blur-sm",
              "transition-all duration-200",
              "hover:border-navy-200 hover:bg-white hover:shadow-md",
              "active:scale-[0.97]",
              mobileOpen ? "border-navy-200 bg-navy-50 text-navy-950" : "",
            ].join(" ")}
          >
            {mobileOpen ? (
              <CloseIcon className="h-[18px] w-[18px]" strokeWidth={2} />
            ) : (
              <HamburgerIcon className="h-[18px] w-[18px]" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      <MobileNavbar
        id="site-mobile-menu"
        open={mobileOpen}
        activeId={activeId}
        onClose={() => setMobileOpen(false)}
      />
    </header>
  );
}

// ---- subcomponents --------------------------------------------------------

interface NavLinkProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
}

function NavLink({ href, active, children }: NavLinkProps) {
  return (
    <a
      href={href}
      className={[
        "group relative inline-flex items-center px-3 py-2 text-[13.5px] font-medium transition focus:outline-none",
        active ? "text-navy-950" : "text-ink-soft hover:text-ink",
      ].join(" ")}
    >
      <span className="relative">
        {children}
        <span
          aria-hidden
          className={[
            "pointer-events-none absolute -bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent-600 transition-all duration-300",
            active
              ? "scale-100 opacity-100"
              : "scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-60",
          ].join(" ")}
        />
      </span>
    </a>
  );
}

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function HamburgerIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
