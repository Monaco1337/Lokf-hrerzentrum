"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  FileTextIcon,
  ShieldLockIcon,
  TrainIcon,
  UsersIcon,
} from "./icons";

type Step = {
  step: string;
  title: string;
  body: string;
  icon: React.ReactNode;
};

const STEPS: ReadonlyArray<Step> = [
  {
    step: "01",
    title: "Eignungscheck",
    body:
      "In wenigen Minuten prüfen, ob die Grundvoraussetzungen erfüllt sind.",
    icon: <CheckIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
  {
    step: "02",
    title: "Beratung & Plan",
    body: "Wir besprechen deine Situation und legen den passenden Weg fest.",
    icon: <UsersIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
  {
    step: "03",
    title: "Unterlagen vorbereiten",
    body:
      "Begründung, Lebenslauf, Maßnahme- und Eignungsangebote — wir stellen die Mappe mit dir zusammen.",
    icon: <FileTextIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
  {
    step: "04",
    title: "Termin bei der Agentur",
    body:
      "Du gehst vorbereitet mit vollständiger Mappe in das Gespräch bei Agentur oder Jobcenter.",
    icon: <CalendarIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
  {
    step: "05",
    title: "Bildungsgutschein",
    body:
      "Bei positiver Entscheidung des Amts wird die Förderung bewilligt.",
    icon: <ShieldLockIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
  {
    step: "06",
    title: "Start der Weiterbildung",
    body:
      "15 Monate Vollzeit in Berlin oder Saalfeld — mit Begleitung bis zum Abschluss.",
    icon: <TrainIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
];

export function HowItWorksSection() {
  return (
    <section id="weg" className="bg-surface-subtle">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24 lg:py-28">
        <SectionHeader />

        <div className="mt-14 lg:mt-16">
          <HowItWorksMobileCarousel steps={STEPS} />

          <ol className="mt-0 hidden gap-5 sm:grid-cols-2 md:grid md:grid-cols-3 md:gap-6 lg:grid-cols-6 lg:gap-4">
            {STEPS.map((s, i) => (
              <StepCard key={s.step} step={s} index={i} total={STEPS.length} />
            ))}
          </ol>
        </div>

        <div className="mt-12 flex justify-center md:mt-14">
          <Link
            href="/eligibility"
            className="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink shadow-sm transition hover:border-ink/20 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Eignung kostenlos prüfen
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function HowItWorksMobileCarousel({ steps }: { steps: ReadonlyArray<Step> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((i: number) => {
    const root = scrollRef.current;
    if (!root) return;
    const slide = root.querySelector<HTMLElement>(`[data-step-slide="${i}"]`);
    slide?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const slides = root.querySelectorAll<HTMLElement>("[data-step-slide]");
    if (slides.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (!top) return;
        const i = Number((top as HTMLElement).dataset.stepSlide);
        if (!Number.isNaN(i)) setIndex(i);
      },
      { root, threshold: [0.65, 0.85, 1] },
    );

    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [steps.length]);

  return (
    <div
      className="relative md:hidden"
      aria-roledescription="Karussell"
      aria-label="Ablauf zur geförderten Weiterbildung"
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
        {steps.map((s, i) => (
          <div
            key={s.step}
            data-step-slide={i}
            className="w-full shrink-0 snap-center snap-always"
          >
            <StepCardMobile step={s} active={i === index} />
          </div>
        ))}
      </div>

      <div
        className="mt-7 flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Karussell-Navigation"
      >
        {steps.map((s, i) => (
          <button
            key={s.step}
            type="button"
            role="tab"
            aria-label={`Schritt ${s.step}: ${s.title}`}
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
          Ablauf
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
        Dein Weg zur{" "}
        <span
          className="bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 bg-clip-text text-transparent"
          style={{ WebkitBackgroundClip: "text" }}
        >
          geförderten Weiterbildung
        </span>
      </h2>
    </div>
  );
}

function StepCardMobile({ step, active }: { step: Step; active: boolean }) {
  return (
    <article
      className={[
        "flex h-full w-full min-h-[240px] flex-col items-center rounded-2xl border bg-white p-6 text-center shadow-sm transition-all duration-300",
        active ? "border-ink/15 shadow-premium" : "border-ink/10",
      ].join(" ")}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-700">
        Schritt {step.step}
      </span>

      <span
        className={[
          "relative mt-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-accent-600 shadow-sm ring-1 transition-colors duration-300",
          active ? "ring-accent-200" : "ring-ink/10",
        ].join(" ")}
      >
        <span className="relative">{step.icon}</span>
      </span>

      <h3
        className="mt-4 text-[15px] font-bold leading-snug text-ink"
        style={{ letterSpacing: "-0.01em" }}
      >
        {step.title}
      </h3>

      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
    </article>
  );
}

function StepCard({
  step,
  index,
  total,
}: {
  step: Step;
  index: number;
  total: number;
}) {
  const isLast = index === total - 1;

  return (
    <li className="relative">
      {!isLast ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-2.5 top-[68px] z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-ink/10 bg-white text-accent-600 shadow-sm lg:flex"
        >
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </span>
      ) : null}

      <article className="group relative flex h-full flex-col items-center rounded-2xl border border-ink/10 bg-white p-6 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-premium">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-700">
          Schritt {step.step}
        </span>

        <span className="relative mt-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-accent-600 shadow-sm ring-1 ring-ink/10 transition-colors duration-300 group-hover:ring-accent-200">
          <span
            aria-hidden
            className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-accent-100/0 via-accent-100/0 to-accent-100/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
          <span className="relative">{step.icon}</span>
        </span>

        <h3
          className="mt-4 text-[15px] font-bold leading-snug text-ink"
          style={{ letterSpacing: "-0.01em" }}
        >
          {step.title}
        </h3>

        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          {step.body}
        </p>
      </article>
    </li>
  );
}
