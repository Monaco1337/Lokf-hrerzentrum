"use client";
/**
 * LocationSection - two training locations: Saalfeld first (because of the
 * standout housing benefit), Berlin second.
 *
 * - Mobile: native swipe carousel with dot navigation (no third-party lib).
 * - Desktop: clean 2-column grid.
 * - The location name is shown once in the card body (h3); the redundant
 *   on-image pill was removed. Only the "Inklusive Unterkunft" badge on
 *   Saalfeld remains because it carries new information.
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { CheckIcon } from "./icons";

type Feature = { label: string };

type Location = {
  id: "berlin" | "saalfeld";
  name: string;
  tagline: string;
  image: string;
  imageAlt: string;
  features: ReadonlyArray<Feature>;
  badge: string | null;
};

const LOCATIONS: ReadonlyArray<Location> = [
  {
    id: "saalfeld",
    name: "Saalfeld",
    tagline: "Eisenbahn-Leistungszentrum in Thüringen",
    image: "/locations/saalfeld.jpg",
    imageAlt:
      "Historische Altstadt von Saalfeld an der Saale mit Kirchturm und Thüringer Wald im Hintergrund",
    features: [
      { label: "Kostenfreie möblierte Unterkunft möglich" },
      { label: "Vollzeit mit Mo-/Fr-Anreise (Internat)" },
      { label: "Praxisnahes Bahn-Umfeld" },
      { label: "Nächster Start: 18.05.2026" },
    ],
    badge: "Inklusive Unterkunft",
  },
  {
    id: "berlin",
    name: "Berlin",
    tagline: "Unternehmenssitz & Ausbildungszentrum",
    image: "/locations/berlin.jpg",
    imageAlt:
      "Skyline von Berlin mit Fernsehturm, Berliner Dom und Spree im Abendlicht",
    features: [
      { label: "Moderne Schulungsräume" },
      { label: "Vollzeit Mo–Fr, 08:00–15:15 Uhr" },
      { label: "Zentrale Lage & beste Anbindung" },
      { label: "Nächster Start: 26.10.2026" },
    ],
    badge: null,
  },
];

export function LocationSection() {
  return (
    <section id="standorte" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24 lg:py-28">
        <SectionHeader />

        <div className="mt-14 lg:mt-16">
          <LocationsMobileCarousel locations={LOCATIONS} />

          <div className="mx-auto hidden max-w-5xl grid-cols-2 gap-7 md:grid lg:gap-8">
            {LOCATIONS.map((loc) => (
              <LocationCard key={loc.id} location={loc} />
            ))}
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-[13px] leading-relaxed text-ink-muted">
          Fachpraktische Anteile zusätzlich an den Bahnhöfen Diepholz und
          Augsburg möglich.
        </p>
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
          Standorte
        </span>
        <span aria-hidden className="h-px w-8 bg-accent-600" />
      </div>
      <h2
        className="mt-6 font-display text-[clamp(1.875rem,3.4vw,3rem)] font-extrabold text-navy-950"
        style={{ letterSpacing: "-0.028em", lineHeight: 1.05 }}
      >
        Zwei Standorte –{" "}
        <span
          className="whitespace-nowrap bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 bg-clip-text text-transparent"
          style={{ WebkitBackgroundClip: "text" }}
        >
          eine Chance
        </span>
      </h2>
      <p className="mt-5 text-base leading-relaxed text-ink-soft sm:text-[17px]">
        Du entscheidest, wo du deine Weiterbildung absolvieren möchtest.
        Beide Standorte – ein Ziel: Lokführer.
      </p>
    </div>
  );
}

function LocationsMobileCarousel({
  locations,
}: {
  locations: ReadonlyArray<Location>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((i: number) => {
    const root = scrollRef.current;
    if (!root) return;
    const slide = root.querySelector<HTMLElement>(
      `[data-location-slide="${i}"]`,
    );
    slide?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const slides = root.querySelectorAll<HTMLElement>("[data-location-slide]");
    if (slides.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (!top) return;
        const i = Number((top as HTMLElement).dataset.locationSlide);
        if (!Number.isNaN(i)) setIndex(i);
      },
      { root, threshold: [0.65, 0.85, 1] },
    );

    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [locations.length]);

  return (
    <div
      className="relative md:hidden"
      aria-roledescription="Karussell"
      aria-label="Standorte"
    >
      <div
        ref={scrollRef}
        className={[
          "flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain",
          "scroll-smooth scroll-px-0",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          "touch-pan-x",
        ].join(" ")}
      >
        {locations.map((l, i) => (
          <div
            key={l.id}
            data-location-slide={i}
            className="w-full shrink-0 snap-center snap-always"
          >
            <LocationCard location={l} />
          </div>
        ))}
      </div>

      <div
        className="mt-7 flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Karussell-Navigation"
      >
        {locations.map((l, i) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-label={`${l.name} anzeigen`}
            aria-selected={i === index}
            onClick={() => goTo(i)}
            className={[
              "rounded-full transition-all duration-300 ease-out",
              i === index
                ? "h-2 w-7 bg-accent-600 shadow-[0_0_0_3px_rgba(63,114,72,0.16)]"
                : "h-2 w-2 bg-ink/15 hover:bg-ink/30",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

function LocationCard({ location: l }: { location: Location }) {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm transition-all duration-300 md:hover:-translate-y-1 md:hover:border-ink/20 md:hover:shadow-premium">
      <div className="relative aspect-[16/10] overflow-hidden bg-navy-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={l.image}
          alt={l.imageAlt}
          loading="lazy"
          decoding="async"
          width={1400}
          height={875}
          className="h-full w-full object-cover transition-transform duration-[900ms] ease-out md:group-hover:scale-[1.04]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent"
        />

        {l.badge ? (
          <span className="absolute right-4 top-4 inline-flex items-center rounded-full bg-accent-600 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white shadow-cta">
            {l.badge}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-6 pb-7 pt-6 md:px-7">
        <h3
          className="text-2xl font-bold tracking-tight text-navy-950"
          style={{ letterSpacing: "-0.02em" }}
        >
          {l.name}
        </h3>
        <p className="mt-1 text-sm font-medium text-ink-muted">{l.tagline}</p>

        <ul className="mt-6 space-y-3">
          {l.features.map((f) => (
            <li
              key={f.label}
              className="flex items-start gap-3 text-[15px] leading-snug text-ink-soft"
            >
              <span
                aria-hidden
                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700 ring-1 ring-accent-100"
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              <span>{f.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
