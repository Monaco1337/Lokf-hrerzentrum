"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { ArrowRightIcon, CheckIcon } from "./icons";

type ChecklistItem = {
  title: string;
  body: string;
};

const ITEMS: ReadonlyArray<ChecklistItem> = [
  {
    title: "Persönliche Begründung",
    body: "Warum du genau diese Weiterbildung machen willst.",
  },
  {
    title: "Lebenslauf",
    body: "Falls beim Amt noch nicht hinterlegt.",
  },
  {
    title: "Einstellungszusage",
    body: "Deine Übernahmegarantie nach bestandener Prüfung.",
  },
  {
    title: "Angebot für die Maßnahme",
    body: "Offizielles Kostenangebot für die Weiterbildung.",
  },
  {
    title: "Maßnahmebogen",
    body: "Inklusive AZAV-Zertifizierungsnachweis.",
  },
  {
    title: "Angebot psychologischer Eignungstest",
    body: "Vorab-Test minimiert das Risiko eines Abbruchs.",
  },
  {
    title: "Angebot medizinische Tauglichkeit",
    body: "Ärztliche Untersuchung für die Lokführertätigkeit.",
  },
];

export function ChecklistSection() {
  return (
    <section id="checkliste" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24 lg:py-28">
        <SectionHeader />

        <div className="mt-10">
          <ChecklistMobileCarousel items={ITEMS} />

          <div className="mx-auto hidden max-w-3xl md:block">
            <ChecklistCard items={ITEMS} />
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-xl text-center text-[13px] leading-relaxed text-ink-muted">
          Alle Unterlagen werden mit dir gemeinsam erstellt — keine Vorleistung
          erforderlich.
        </p>

        <div className="mt-7 flex justify-center">
          <Link
            href="/eignungscheck"
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

function SectionHeader() {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-3">
        <span aria-hidden className="h-px w-8 bg-accent-600" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-navy-900">
          Unterlagen-Mappe
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
        Was du für den{" "}
        <span
          className="bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 bg-clip-text text-transparent"
          style={{ WebkitBackgroundClip: "text" }}
        >
          Termin
        </span>{" "}
        brauchst
      </h2>

      <p
        className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-[17px]"
        style={{ textWrap: "balance" }}
      >
        Deine vollständige Mappe für die Agentur für Arbeit oder das Jobcenter.
      </p>

      <p
        className="mx-auto mt-4 max-w-lg font-display text-[clamp(1.125rem,4.2vw,1.375rem)] font-bold leading-snug tracking-tight"
        style={{
          letterSpacing: "-0.022em",
          fontFeatureSettings: "'kern' 1, 'liga' 1, 'calt' 1, 'ss01' 1",
          textWrap: "balance",
        }}
      >
        <span
          className="bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 bg-clip-text text-transparent"
          style={{ WebkitBackgroundClip: "text" }}
        >
          Wir bereiten alles mit dir gemeinsam vor.
        </span>
      </p>
    </div>
  );
}

function ChecklistMobileCarousel({ items }: { items: ReadonlyArray<ChecklistItem> }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((i: number) => {
    const root = scrollRef.current;
    if (!root) return;
    const slide = root.querySelector<HTMLElement>(`[data-checklist-slide="${i}"]`);
    slide?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const slides = root.querySelectorAll<HTMLElement>("[data-checklist-slide]");
    if (slides.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visible[0]?.target;
        if (!top) return;
        const i = Number((top as HTMLElement).dataset.checklistSlide);
        if (!Number.isNaN(i)) setIndex(i);
      },
      { root, threshold: [0.65, 0.85, 1] },
    );

    slides.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items.length]);

  return (
    <div
      className="relative md:hidden"
      aria-roledescription="Karussell"
      aria-label="Unterlagen für den Termin"
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
        {items.map((item, i) => (
          <div
            key={item.title}
            data-checklist-slide={i}
            className="w-full shrink-0 snap-center snap-always"
          >
            <ChecklistItemCard item={item} active={i === index} />
          </div>
        ))}
      </div>

      <div
        className="mt-7 flex items-center justify-center gap-2"
        role="tablist"
        aria-label="Karussell-Navigation"
      >
        {items.map((item, i) => (
          <button
            key={item.title}
            type="button"
            role="tab"
            aria-label={item.title}
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

function ChecklistItemCard({
  item,
  active = false,
}: {
  item: ChecklistItem;
  active?: boolean;
}) {
  return (
    <article
      className={[
        "flex h-full w-full min-h-[200px] flex-col rounded-2xl border bg-gradient-to-b from-white to-surface-subtle/50 p-7 shadow-sm transition-all duration-300",
        active ? "border-ink/15 shadow-premium" : "border-ink/10",
      ].join(" ")}
    >
      <h3
        className="text-[18px] font-bold leading-snug text-ink"
        style={{ letterSpacing: "-0.014em" }}
      >
        {item.title}
      </h3>

      <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ink-soft">
        {item.body}
      </p>
    </article>
  );
}

function ChecklistCard({ items }: { items: ReadonlyArray<ChecklistItem> }) {
  return (
    <div className="rounded-3xl border border-ink/10 bg-gradient-to-b from-white to-surface-subtle/50 p-6 shadow-card sm:p-8">
      <ul className="divide-y divide-ink/5">
        {items.map((item) => (
          <li
            key={item.title}
            className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
          >
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700 ring-1 ring-accent-200">
              <CheckIcon className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <div className="min-w-0">
              <p
                className="text-[15px] font-semibold text-ink"
                style={{ letterSpacing: "-0.005em" }}
              >
                {item.title}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
                {item.body}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
