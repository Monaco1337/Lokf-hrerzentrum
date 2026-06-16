"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CheckIcon,
  EuroIcon,
  PinIcon,
  ShieldIcon,
  UsersIcon,
} from "./icons";

type TrustItem = { icon: React.ReactNode; title: string; sub: string };

const TRUST_ITEMS: ReadonlyArray<TrustItem> = [
  {
    icon: <ShieldIcon className="h-5 w-5" strokeWidth={1.7} />,
    title: "Staatlich gefördert",
    sub: "Weiterbildung möglich",
  },
  {
    icon: <EuroIcon className="h-5 w-5" strokeWidth={1.7} />,
    title: "Bis zu 5.600 €",
    sub: "monatlich inkl. Zulagen",
  },
  {
    icon: <PinIcon className="h-5 w-5" strokeWidth={1.7} />,
    title: "Berlin oder Saalfeld",
    sub: "Zwei Standorte",
  },
  {
    icon: <UsersIcon className="h-5 w-5" strokeWidth={1.7} />,
    title: "Persönliche Begleitung",
    sub: "bis zum Bildungsgutschein",
  },
  {
    icon: <CheckIcon className="h-5 w-5" strokeWidth={1.8} />,
    title: "Keine Verpflichtung",
    sub: "durch den Check",
  },
];

const AUTO_MS = 4200;

export function TrustChips() {
  return (
    <>
      <div className="md:hidden">
        <TrustChipsMobileSlider items={TRUST_ITEMS} />
      </div>

      <ul
        className="
          hidden
          md:grid md:grid-cols-3 md:gap-x-6 md:gap-y-6
          lg:grid-cols-5 lg:gap-x-0 lg:divide-x lg:divide-ink/10
        "
      >
        {TRUST_ITEMS.map((t) => (
          <TrustChipItem key={t.title} item={t} className="lg:px-4 lg:first:pl-0 lg:last:pr-0 xl:px-5" />
        ))}
      </ul>
    </>
  );
}

function TrustChipsMobileSlider({ items }: { items: ReadonlyArray<TrustItem> }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (next: number) => {
      const len = items.length;
      setIndex(((next % len) + len) % len);
    },
    [items.length],
  );

  useEffect(() => {
    if (paused) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, AUTO_MS);

    return () => window.clearInterval(id);
  }, [paused, items.length]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Vertrauensmerkmale"
    >
      <div className="overflow-hidden">
        <ul
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
          aria-live="polite"
        >
          {items.map((t, i) => (
            <li
              key={t.title}
              className="w-full shrink-0 px-0.5"
              aria-hidden={i !== index}
            >
              <TrustChipItem item={t} className="rounded-2xl border border-ink/5 bg-white/60 px-1 py-1 backdrop-blur-sm" />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2">
        {items.map((t, i) => (
          <button
            key={t.title}
            type="button"
            aria-label={`${t.title} anzeigen`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => goTo(i)}
            className={[
              "h-1.5 rounded-full transition-all duration-300",
              i === index
                ? "w-6 bg-accent-600"
                : "w-1.5 bg-ink/20 hover:bg-ink/35",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

function TrustChipItem({
  item: t,
  className = "",
}: {
  item: TrustItem;
  className?: string;
}) {
  return (
    <div className={["flex items-center gap-3.5", className].join(" ")}>
      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent-600 ring-1 ring-ink/10">
        {t.icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug text-ink">{t.title}</p>
        <p className="mt-1 text-xs leading-snug text-ink-muted">{t.sub}</p>
      </div>
    </div>
  );
}
