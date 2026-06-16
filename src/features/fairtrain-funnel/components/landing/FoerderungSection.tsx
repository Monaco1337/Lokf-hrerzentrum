"use client";

import Link from "next/link";

import { ArrowRightIcon, ShieldIcon, TrendingUpIcon } from "./icons";
import { type FoerderungPfad, PfadCard } from "./FoerderungCards";

const PFADE: ReadonlyArray<FoerderungPfad> = [
  {
    kicker: "Arbeitssuchend",
    title: "Du bist aktuell arbeitslos oder arbeitssuchend?",
    body:
      "Hauptweg über die Agentur für Arbeit oder das Jobcenter. Wir bereiten die komplette Antrags-Mappe mit dir vor — du gehst nicht allein in den Termin.",
    points: [
      "Hauptweg über Agentur für Arbeit / Jobcenter",
      "Bildungsgutschein kann Kosten übernehmen — Entscheidung trifft das Amt",
      "Komplette Antrags-Mappe gemeinsam mit dir",
    ],
    icon: <ShieldIcon className="h-6 w-6" strokeWidth={1.7} />,
    accent: "red",
  },
  {
    kicker: "Berufstätig",
    title: "Du bist aktuell beschäftigt?",
    body:
      "Ein Wechsel ist möglich — mit einem geordneten Weg ohne voreilige Kündigung. Wir prüfen individuell und diskret, welcher Förderweg bei dir realistisch ist.",
    points: [
      "Wechsel ohne voreilige Kündigung",
      "Förderwege individuell geprüft (Agentur, Rententräger, Berufsgenossenschaft)",
      "100 % diskret — Arbeitgeber erfährt nichts ohne deine Zustimmung",
    ],
    icon: <TrendingUpIcon className="h-6 w-6" strokeWidth={1.7} />,
    accent: "navy",
  },
];

export function FoerderungSection() {
  return (
    <section id="foerderung" className="bg-surface-subtle">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24 lg:py-28">
        <SectionHeader />

        <div className="mx-auto mt-14 flex max-w-5xl flex-col gap-4 md:mt-14 md:grid md:grid-cols-2 md:gap-7 lg:mt-16">
          {PFADE.map((p) => (
            <PfadCard key={p.title} pfad={p} />
          ))}
        </div>

        <CTABar />

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-ink-muted">
          Ein Anspruch auf einen Bildungsgutschein besteht nicht automatisch.
          Die Entscheidung trifft ausschließlich die Agentur für Arbeit.
        </p>
      </div>
    </section>
  );
}

function SectionHeader() {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="inline-flex items-center gap-3">
        <span aria-hidden className="h-px w-8 bg-accent-600" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-navy-900">
          Förderung
        </span>
        <span aria-hidden className="h-px w-8 bg-accent-600" />
      </div>

      <h2
        className="mt-6 font-display text-[clamp(1.875rem,3.4vw,3rem)] font-extrabold text-navy-950"
        style={{
          letterSpacing: "-0.028em",
          lineHeight: 1.05,
          fontFeatureSettings: "'kern' 1, 'liga' 1, 'calt' 1, 'ss01' 1",
          textWrap: "balance",
        }}
      >
        Förderung &{" "}
        <span
          className="bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 bg-clip-text text-transparent"
          style={{ WebkitBackgroundClip: "text" }}
        >
          Bildungsgutschein
        </span>
      </h2>

      <p className="mt-5 text-base leading-relaxed text-ink-soft sm:text-[17px]">
        Egal ob du arbeitssuchend oder mitten im Job bist — wir prüfen mit dir,
        welche Förderung realistisch ist.
      </p>
    </div>
  );
}

function CTABar() {
  return (
    <>
      <CTABarMobile />
      <CTABarDesktop />
    </>
  );
}

function CTABarMobile() {
  return (
    <div className="mt-10 flex md:hidden">
      <Link
        href="/eligibility"
        className="group/cta relative inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 text-[15px] font-semibold tracking-tight text-white shadow-cta transition-all duration-200 hover:shadow-cta-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60 focus-visible:ring-offset-2 active:scale-[0.99]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity duration-300 group-hover/cta:opacity-100"
        />
        <span className="relative">Check starten</span>
        <ArrowRightIcon className="relative h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
      </Link>
    </div>
  );
}

function CTABarDesktop() {
  return (
    <div className="mt-14 hidden justify-center md:flex lg:mt-16">
      <Link
        href="/eligibility"
        className="group/cta relative inline-flex h-14 items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 px-9 text-[15px] font-semibold tracking-tight text-white shadow-cta transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cta-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60 focus-visible:ring-offset-2"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 opacity-0 transition-opacity duration-300 group-hover/cta:opacity-100"
        />
        <span className="relative">Eignungscheck starten</span>
        <ArrowRightIcon className="relative h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
      </Link>
    </div>
  );
}
