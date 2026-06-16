"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CapIcon,
  ClockIcon,
  ShieldIcon,
  TrendingUpIcon,
  UsersIcon,
} from "./icons";

type Reason = {
  title: string;
  body: string;
  icon: React.ReactNode;
};

const REASONS: ReadonlyArray<Reason> = [
  {
    title: "Krisensicherer Beruf",
    body: "Mobilität wird immer gebraucht – ein Beruf mit Zukunft.",
    icon: <ShieldIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
  {
    title: "Verantwortung",
    body: "Du bewegst Menschen sicher ans Ziel – jeden Tag.",
    icon: <UsersIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
  {
    title: "Klare Qualifikation",
    body: "Mit einer anerkannten Weiterbildung steigst du professionell ein.",
    icon: <CapIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
  {
    title: "Langfristige Perspektiven",
    body: "Gute Übernahmechancen und Entwicklungsmöglichkeiten.",
    icon: <TrendingUpIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
  {
    title: "Schichtdienst (realistisch)",
    body: "Der Beruf erfordert Schichtdienst – wir bereiten dich darauf vor.",
    icon: <ClockIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
];

export function BenefitsSection() {
  return (
    <section id="warum" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24 lg:py-28">
        <SectionHeader />

        <div className="mt-14 lg:mt-16">
          <BenefitsMobileCarousel reasons={REASONS} />

          <div className="hidden gap-5 sm:grid-cols-2 md:grid md:grid-cols-3 md:gap-6 lg:grid-cols-5">
            {REASONS.map((r) => (
              <ReasonCard key={r.title} reason={r} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitsMobileCarousel({ reasons }: { reasons: ReadonlyArray<Reason> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((i: number) => {
    const root = scrollRef.current;
    if (!root) return;
    const slide = root.querySelector<HTMLElement>(`[data-benefit-slide="${i}"]`);
    slide?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const slides = root.querySelectorAll<HTMLElement>("[data-benefit-slide]");
    if (slides.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (!top) return;
        const i = Number((top as HTMLElement).dataset.benefitSlide);
        if (!Number.isNaN(i)) setIndex(i);
      },
      { root, threshold: [0.65, 0.85, 1] },
    );

    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [reasons.length]);

  return (
    <div
      className="relative md:hidden"
      aria-roledescription="Karussell"
      aria-label="Gründe, Lokführer zu werden"
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
        {reasons.map((r, i) => (
          <div
            key={r.title}
            data-benefit-slide={i}
            className="w-full shrink-0 snap-center snap-always"
          >
            <ReasonCard reason={r} active={i === index} />
          </div>
        ))}
      </div>

      <div
        className="mt-7 flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Karussell-Navigation"
      >
        {reasons.map((r, i) => (
          <button
            key={r.title}
            type="button"
            role="tab"
            aria-label={`${r.title} anzeigen`}
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

function SectionHeader() {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-3">
        <span aria-hidden className="h-px w-8 bg-accent-600" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-navy-900">
          Karriere
        </span>
        <span aria-hidden className="h-px w-8 bg-accent-600" />
      </div>

      <h2
        className="mt-5 font-display text-3xl font-extrabold text-navy-950 sm:text-4xl md:text-[2.75rem]"
        style={{
          letterSpacing: "-0.026em",
          lineHeight: 1.08,
          fontFeatureSettings: "'kern' 1, 'liga' 1, 'calt' 1, 'ss01' 1",
          textWrap: "balance",
        }}
      >
        Warum{" "}
        <span
          className="bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 bg-clip-text text-transparent"
          style={{ WebkitBackgroundClip: "text" }}
        >
          Lokführer
        </span>{" "}
        werden?
      </h2>
    </div>
  );
}

function ReasonCard({
  reason: r,
  active = false,
}: {
  reason: Reason;
  active?: boolean;
}) {
  return (
    <article
      className={[
        "group relative flex h-full w-full min-h-[220px] flex-col items-center rounded-2xl border bg-gradient-to-b from-white to-surface-subtle/60 p-7 text-center shadow-sm transition-all duration-300",
        active
          ? "border-ink/15 shadow-premium"
          : "border-ink/10",
        "md:hover:-translate-y-1 md:hover:border-ink/20 md:hover:shadow-premium",
      ].join(" ")}
    >
      <span
        className={[
          "relative inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-accent-600 shadow-sm ring-1 transition-colors duration-300",
          active ? "ring-accent-200" : "ring-ink/10",
          "md:group-hover:ring-accent-200",
        ].join(" ")}
      >
        <span
          aria-hidden
          className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-accent-100/0 via-accent-100/0 to-accent-100/40 opacity-0 transition-opacity duration-300 md:group-hover:opacity-100"
        />
        <span className="relative">{r.icon}</span>
      </span>

      <h3
        className="mt-6 text-base font-bold leading-snug text-ink"
        style={{ letterSpacing: "-0.01em" }}
      >
        {r.title}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.body}</p>
    </article>
  );
}
