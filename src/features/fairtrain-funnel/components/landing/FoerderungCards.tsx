"use client";
/**
 * Mobile/Desktop card variants for the Förderung section.
 *
 * - Mobile: accordion (subtitle + chevron, bullets collapse).
 * - Desktop: full card with bullets always visible.
 *
 * Extracted from FoerderungSection.tsx to keep that file under the
 * 300-line guardrail.
 */
import { useState } from "react";

import { CheckIcon, ChevronDownIcon, SparkleIcon } from "./icons";

export type FoerderungPfad = {
  kicker: string;
  title: string;
  body: string;
  points: ReadonlyArray<string>;
  icon: React.ReactNode;
  accent: "red" | "navy";
};

export function PfadCard({ pfad }: { pfad: FoerderungPfad }) {
  return (
    <>
      <PfadCardMobile pfad={pfad} />
      <PfadCardDesktop pfad={pfad} />
    </>
  );
}

function PfadCardMobile({ pfad: p }: { pfad: FoerderungPfad }) {
  const [open, setOpen] = useState(false);
  const isRed = p.accent === "red";
  const detailsId = `foerderung-${p.kicker.toLowerCase()}-details`;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-6 shadow-sm md:hidden">
      <div
        aria-hidden
        className={[
          "pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full blur-3xl",
          isRed ? "bg-accent-100/55" : "bg-navy-200/45",
        ].join(" ")}
      />

      <div className="relative flex flex-col">
        <div className="flex items-center gap-3">
          <span
            className={[
              "inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm ring-1",
              isRed
                ? "text-accent-600 ring-accent-100"
                : "text-navy-700 ring-navy-100",
            ].join(" ")}
          >
            {p.icon}
          </span>

          <span
            className={[
              "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ring-1",
              isRed
                ? "bg-accent-50 text-accent-700 ring-accent-100"
                : "bg-navy-50 text-navy-700 ring-navy-100",
            ].join(" ")}
          >
            {p.kicker}
          </span>
        </div>

        <h3
          className="mt-5 text-[1.1875rem] font-bold leading-snug tracking-tight text-navy-950"
          style={{ letterSpacing: "-0.02em", textWrap: "balance" }}
        >
          {p.title}
        </h3>

        <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
          {p.body}
        </p>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={detailsId}
          className="mt-5 flex w-full min-h-[44px] items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white/70 px-4 py-2.5 text-left transition-colors hover:border-ink/20 hover:bg-surface-subtle/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:ring-offset-2"
        >
          <span className="text-[13px] font-semibold tracking-tight text-navy-900">
            {open ? "Weniger anzeigen" : "Was das für dich bedeutet"}
          </span>
          <span
            aria-hidden
            className={[
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 transition-transform duration-300",
              isRed
                ? "bg-accent-50 text-accent-600 ring-accent-100"
                : "bg-navy-50 text-navy-700 ring-navy-100",
              open ? "rotate-180" : "",
            ].join(" ")}
          >
            <ChevronDownIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
        </button>

        <div
          id={detailsId}
          className={[
            "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          ].join(" ")}
          aria-hidden={!open}
        >
          <div className="min-h-0 overflow-hidden">
            <ul className="space-y-3 pt-5">
              {p.points.map((pt) => (
                <li
                  key={pt}
                  className="flex items-start gap-3 text-[14.5px] leading-snug text-ink"
                >
                  <span
                    aria-hidden
                    className={[
                      "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1",
                      isRed
                        ? "bg-accent-50 text-accent-700 ring-accent-100"
                        : "bg-navy-50 text-navy-700 ring-navy-100",
                    ].join(" ")}
                  >
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft">
          <SparkleIcon
            className={[
              "h-3.5 w-3.5",
              isRed ? "text-accent-600" : "text-navy-700",
            ].join(" ")}
          />
          Klingt nach dir? Lass es uns kurz prüfen.
        </p>
      </div>
    </article>
  );
}

function PfadCardDesktop({ pfad: p }: { pfad: FoerderungPfad }) {
  const isRed = p.accent === "red";
  return (
    <article className="group relative hidden h-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:shadow-premium md:flex md:p-8">
      <div
        aria-hidden
        className={[
          "pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full blur-3xl transition-opacity duration-500",
          isRed
            ? "bg-accent-100/55 opacity-100"
            : "bg-navy-200/45 opacity-100",
        ].join(" ")}
      />

      <div className="relative flex flex-col">
        <div className="flex items-center gap-3">
          <span
            className={[
              "inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm ring-1 transition-colors duration-300",
              isRed
                ? "text-accent-600 ring-accent-100 group-hover:ring-accent-200"
                : "text-navy-700 ring-navy-100 group-hover:ring-navy-200",
            ].join(" ")}
          >
            {p.icon}
          </span>

          <span
            className={[
              "inline-flex items-center rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ring-1",
              isRed
                ? "bg-accent-50 text-accent-700 ring-accent-100"
                : "bg-navy-50 text-navy-700 ring-navy-100",
            ].join(" ")}
          >
            {p.kicker}
          </span>
        </div>

        <h3
          className="mt-7 text-[1.25rem] font-bold leading-snug tracking-tight text-navy-950 md:text-[1.375rem]"
          style={{ letterSpacing: "-0.02em", textWrap: "balance" }}
        >
          {p.title}
        </h3>

        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          {p.body}
        </p>

        <ul className="mt-6 space-y-3 border-t border-ink/5 pt-6">
          {p.points.map((pt) => (
            <li
              key={pt}
              className="flex items-start gap-3 text-[15px] leading-snug text-ink"
            >
              <span
                aria-hidden
                className={[
                  "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1",
                  isRed
                    ? "bg-accent-50 text-accent-700 ring-accent-100"
                    : "bg-navy-50 text-navy-700 ring-navy-100",
                ].join(" ")}
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              <span>{pt}</span>
            </li>
          ))}
        </ul>

        <p className="mt-7 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft">
          <SparkleIcon
            className={[
              "h-3.5 w-3.5",
              isRed ? "text-accent-600" : "text-navy-700",
            ].join(" ")}
          />
          Klingt nach dir? Lass es uns kurz prüfen.
        </p>
      </div>
    </article>
  );
}
