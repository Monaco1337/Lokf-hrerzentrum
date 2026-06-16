"use client";

import Link from "next/link";
import { useState } from "react";

import { ArrowRightIcon, CapIcon, ChevronDownIcon, TrainIcon, UsersIcon } from "./icons";

type Audience = {
  id: string;
  title: string;
  subtitle: string;
  points: ReadonlyArray<string>;
  icon: React.ReactNode;
};

const AUDIENCES: ReadonlyArray<Audience> = [
  {
    id: "arbeitssuchend",
    title: "Arbeitslos oder arbeitssuchend",
    subtitle: "Hauptweg über die Agentur für Arbeit oder das Jobcenter.",
    points: [
      "Förderchance über Agentur für Arbeit / Jobcenter",
      "Bildungsgutschein kann Kosten übernehmen — Entscheidung trifft das Amt",
      "Wir begleiten dich von der Eignung bis zum Termin",
    ],
    icon: <UsersIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
  {
    id: "beschaeftigt",
    title: "Aktuell beschäftigt",
    subtitle: "Wechsel ist möglich — ohne voreiliges Kündigen.",
    points: [
      "Geordneter Übergang ohne Lücke im Lebenslauf",
      "Förderung wird individuell geprüft",
      "Wir zeigen dir den sicheren Weg",
    ],
    icon: <CapIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
  {
    id: "quereinsteiger",
    title: "Quereinsteiger mit Wechselwunsch",
    subtitle: "Auch ohne Bahnerfahrung möglich.",
    points: [
      "Mindestalter 20, anerkannter Abschluss, B2-Sprachniveau",
      "Körperliche & psychologische Eignung werden vor Start geprüft",
      "Tests und Unterlagen organisieren wir mit dir",
    ],
    icon: <TrainIcon className="h-6 w-6" strokeWidth={1.7} />,
  },
];

export function AudienceSection() {
  return (
    <section id="zielgruppen" className="bg-surface-subtle/40">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-24 lg:py-28">
        <SectionHeader />

        <div className="mt-14 flex flex-col gap-3 md:mt-16 md:grid md:grid-cols-3 md:gap-6">
          {AUDIENCES.map((a) => (
            <AudienceCard key={a.id} audience={a} />
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-[13px] leading-relaxed text-ink-muted">
          Persönliche Voraussetzungen werden im Eignungscheck geprüft. Förderung
          ist abhängig von deiner Situation und der Entscheidung der Agentur für
          Arbeit bzw. des Jobcenters.
        </p>

        <div className="mt-8 flex justify-center">
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

function SectionHeader() {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <div className="inline-flex items-center gap-3">
        <span aria-hidden className="h-px w-8 bg-accent-600" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-navy-900">
          Zielgruppen
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
        Für wen ist die{" "}
        <span
          className="bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 bg-clip-text text-transparent"
          style={{ WebkitBackgroundClip: "text" }}
        >
          Weiterbildung
        </span>{" "}
        geeignet?
      </h2>

      <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-soft sm:text-[17px]">
        Drei typische Ausgangslagen — wir prüfen mit dir, welche zu dir passt.
      </p>
    </div>
  );
}

function AudienceCard({ audience: a }: { audience: Audience }) {
  return (
    <>
      <AudienceCardMobile audience={a} />
      <AudienceCardDesktop audience={a} />
    </>
  );
}

function AudienceCardMobile({ audience: a }: { audience: Audience }) {
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm md:hidden">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-accent-600 shadow-sm ring-1 ring-ink/10">
        {a.icon}
      </span>

      <h3
        className="mt-4 text-[17px] font-bold leading-snug text-ink"
        style={{ letterSpacing: "-0.012em" }}
      >
        {a.title}
      </h3>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`audience-${a.id}-details`}
        className="mt-3 flex w-full min-h-[44px] items-center justify-between gap-3 rounded-xl py-1 text-left transition-colors hover:bg-surface-subtle/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:ring-offset-2"
      >
        <span className="flex-1 text-sm leading-relaxed text-ink-soft">
          {a.subtitle}
        </span>
        <span
          aria-hidden
          className={[
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-600 ring-1 ring-accent-100 transition-transform duration-300",
            open ? "rotate-180 bg-accent-100" : "",
          ].join(" ")}
        >
          <ChevronDownIcon className="h-4 w-4" strokeWidth={2.2} />
        </span>
      </button>

      <div
        id={`audience-${a.id}-details`}
        className={[
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
        aria-hidden={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="space-y-2.5 border-t border-ink/5 pt-4">
            {a.points.map((p) => (
              <li
                key={p}
                className="flex items-start gap-2.5 text-sm text-ink-soft"
              >
                <span
                  aria-hidden
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600"
                />
                <span className="leading-relaxed">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function AudienceCardDesktop({ audience: a }: { audience: Audience }) {
  return (
    <article className="group relative hidden h-full flex-col rounded-2xl border border-ink/10 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-premium md:flex">
      <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white text-accent-600 shadow-sm ring-1 ring-ink/10 transition-colors duration-300 group-hover:ring-accent-200">
        <span aria-hidden className="relative">
          {a.icon}
        </span>
      </span>

      <h3
        className="mt-5 text-lg font-bold leading-snug text-ink"
        style={{ letterSpacing: "-0.012em" }}
      >
        {a.title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        {a.subtitle}
      </p>

      <ul className="mt-5 space-y-2.5 border-t border-ink/5 pt-5">
        {a.points.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-sm text-ink-soft">
            <span
              aria-hidden
              className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600/80"
            />
            <span className="leading-relaxed">{p}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
