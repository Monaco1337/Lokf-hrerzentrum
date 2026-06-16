import Link from "next/link";

import {
  ArrowRightIcon,
  ClockIcon,
  ShieldLockIcon,
  StarIcon,
  UsersIcon,
} from "./icons";
import { TrustChips } from "./TrustChips";

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-white">
      <HeroBackdrop />
      <HeroPhotoDesktop />
      <HeroPhotoMobile />

      <div className="relative mx-auto max-w-7xl px-6 pb-10 md:pb-14">
        <div className="max-w-2xl pt-[55svh] md:pt-44 lg:pt-48">
          <div className="flex items-start gap-3 sm:gap-4">
            <span
              aria-hidden
              className="mt-1.5 h-px w-6 shrink-0 bg-accent-600 sm:mt-2 sm:w-10"
            />
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-900 sm:text-xs sm:tracking-[0.22em]">
                Bis zu{" "}
                <span className="text-accent-700">5.600 €</span> mit Zulagen*
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-soft sm:text-xs sm:tracking-[0.22em]">
                Staatlich geförderte Weiterbildung
              </p>
            </div>
          </div>

          <h1
            className="mt-8 font-display text-[clamp(2.25rem,5.6vw,4.75rem)] font-extrabold leading-[1.02] text-navy-950"
            style={{
              letterSpacing: "-0.028em",
              fontFeatureSettings: "'kern' 1, 'liga' 1, 'calt' 1, 'ss01' 1",
              textRendering: "optimizeLegibility",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
            }}
          >
            <span className="block">Dein neuer Weg</span>
            <span className="mt-0.5 block sm:mt-1">
              als{" "}
              <span
                className="whitespace-nowrap bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: "text" }}
              >
                Lokführer
              </span>
              <span className="text-navy-900/45">/in</span>
              <span className="text-navy-900/45">.</span>
            </span>
            <span
              className="mt-3 block font-semibold text-navy-900/80 sm:mt-4"
              style={{
                fontSize: "0.46em",
                lineHeight: 1.2,
                letterSpacing: "-0.012em",
              }}
            >
              Gefördert.{" "}
              <span className="text-navy-900/60">Sicher.</span>{" "}
              <span className="text-navy-900/45">Mit Zukunft.</span>
            </span>
          </h1>

          <p
            className="mt-7 max-w-md text-[15px] font-normal text-ink-soft sm:text-[17px]"
            style={{
              letterSpacing: "0.005em",
              lineHeight: 1.55,
              textWrap: "balance",
            }}
          >
            In wenigen Minuten prüfen, ob du die Voraussetzungen für die
            staatlich geförderte Weiterbildung erfüllst.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
            <Link
              href="/eligibility"
              className={[
                "group relative inline-flex w-full items-center justify-center gap-2 rounded-full",
                "bg-gradient-to-b from-accent-500 to-accent-700",
                "px-8 py-4",
                "text-[15px] font-semibold tracking-tight text-white",
                "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_1px_2px_rgba(15,23,42,0.08),0_18px_38px_-12px_rgba(63,114,72,0.55)]",
                "ring-1 ring-accent-700/30",
                "transition-all duration-[250ms] ease-out",
                "hover:-translate-y-0.5 hover:from-accent-500 hover:to-accent-600 hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_2px_3px_rgba(15,23,42,0.08),0_24px_44px_-12px_rgba(63,114,72,0.65)]",
                "active:translate-y-0 active:scale-[0.985] active:from-accent-700 active:to-accent-800",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2",
                "sm:w-auto sm:px-9 sm:text-base",
              ].join(" ")}
            >
              <span className="whitespace-nowrap">
                Eignung kostenlos prüfen
              </span>
              <span
                aria-hidden
                className="relative ml-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-all duration-300 group-hover:bg-white/20 group-hover:translate-x-0.5"
              >
                <ArrowRightIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>
            </Link>
            <a
              href="#weg"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink/10 bg-white/70 px-6 py-3.5 text-[15px] font-semibold text-ink backdrop-blur-sm transition hover:border-ink/20 hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:w-auto"
            >
              So funktioniert der Weg
            </a>
          </div>
        </div>

        <div className="mt-12 border-t border-ink/10 pt-8 md:mt-20 md:pt-10 lg:mt-24">
          <TrustChips />
          <p className="mt-6 text-[11px] leading-relaxed text-ink-muted">
            *Keine Garantie. Abhängig von Arbeitgeber, Einsatzmodell, Erfahrung und Zulagen.
          </p>

          <div className="mt-7 border-t border-ink/10 pt-7 md:mt-8 md:pt-8">
            <SocialProofStrip />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-surface-subtle/60 to-white"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-hero-glow opacity-90"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-accent-100/40 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-16 -left-32 h-[420px] w-[420px] rounded-full bg-brand-200/40 blur-[140px]"
      />
    </>
  );
}

/**
 * Desktop & Tablet hero photo — full-bleed magazine spread.
 *
 * The photograph spans the entire viewport width and stays razor-sharp; no
 * global filter, no blur, no saturation drop is applied to the image itself.
 * Text legibility is achieved by two *localized* white plates that mask
 * specific regions only:
 *
 *   1. A vertical plate on the left ~58 % of the viewport — solid white
 *      through the headline column, fading to transparent around mid-screen
 *      so the right half of the photograph remains untouched.
 *   2. A horizontal plate at the bottom that fades the image to white before
 *      it can ever meet the trust strip below, so the lower edge looks like
 *      a clean magazine layout, not a clipped photograph.
 *
 * Both plates are pure white-on-transparent gradients — they reveal the
 * underlying surface, they don't tint or soften the image.
 */
function HeroPhotoDesktop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden md:block"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/hero-desktop.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[60%_42%]"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        width={1024}
        height={576}
      />
      {/* Left legibility plate — solid white under the headline column,
          fades to transparent around mid-viewport. */}
      <div className="absolute inset-y-0 left-0 w-[58%] bg-gradient-to-r from-white via-white via-[48%] to-transparent" />
      {/* Top dissolve so the floating navbar lands on consistent values. */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/35 to-transparent" />
      {/* Bottom dissolve so the trust strip below sits on clean white,
          not on cropped imagery. */}
      <div className="absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-t from-white from-55% to-transparent" />
    </div>
  );
}

/**
 * Mobile hero photo — "magazine split".
 *
 * The image stays full-bleed and razor-sharp; legibility is achieved by a
 * *hard* split between photo and text, not by veiling the image:
 *   - Top tint stays minimal (just disambiguates the floating navbar).
 *   - The lower ~55% of the viewport is a **solid white floor**. Only the
 *     top ~5 % of that floor is a hairline gradient that hands the eye off
 *     to the photo above. No global filter, no soft blur, no veil — the
 *     people and the ICE on the upper half remain untouched.
 *
 * Content above (`pt-[55svh]`) lands well inside the solid white area, so
 * every line of copy sits on pure white at full contrast.
 */
function HeroPhotoMobile() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[100svh] overflow-hidden md:hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero/hero-mobile.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-[center_32%]"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        width={486}
        height={1024}
      />
      {/* Top tint — keeps the navbar logo + CTA readable without dimming the image */}
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/40 to-transparent" />
      {/* Solid white text floor with a hairline (~5 % of plate height)
          transition only at its top edge. */}
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-white from-92% to-transparent" />
    </div>
  );
}

type SocialProof =
  | { kind: "rating"; rating: string; stars: number; sub: string }
  | { kind: "icon"; icon: React.ReactNode; title: string; sub: string };

const SOCIAL_PROOF: ReadonlyArray<SocialProof> = [
  {
    kind: "rating",
    rating: "4,9 / 5",
    stars: 5,
    sub: "über 1.200 Bewertungen",
  },
  {
    kind: "icon",
    icon: <ShieldLockIcon className="h-5 w-5" strokeWidth={1.7} />,
    title: "DSGVO-konform",
    sub: "Deine Daten sind sicher",
  },
  {
    kind: "icon",
    icon: <UsersIcon className="h-5 w-5" strokeWidth={1.7} />,
    title: "100 % unverbindlich",
    sub: "Keine Verpflichtung",
  },
  {
    kind: "icon",
    icon: <ClockIcon className="h-5 w-5" strokeWidth={1.7} />,
    title: "In wenigen Minuten",
    sub: "zum Ergebnis",
  },
];

function SocialProofStrip() {
  return (
    <ul
      className="
        grid grid-cols-1 gap-x-6 gap-y-5
        sm:grid-cols-2
        lg:grid-cols-4 lg:gap-x-0 lg:divide-x lg:divide-ink/10
      "
    >
      {SOCIAL_PROOF.map((item, i) => (
        <li
          key={i}
          className="flex items-center gap-3.5 lg:px-4 lg:first:pl-0 lg:last:pr-0 xl:px-6"
        >
          {item.kind === "rating" ? (
            <>
              <span className="flex shrink-0 items-center gap-0.5 text-accent-600">
                {Array.from({ length: item.stars }).map((_, idx) => (
                  <StarIcon key={idx} className="h-4 w-4" />
                ))}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-ink">
                  {item.rating} <span className="text-ink-soft">Sterne</span>
                </p>
                <p className="mt-1 text-xs leading-snug text-ink-muted">
                  {item.sub}
                </p>
              </div>
            </>
          ) : (
            <>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent-600 ring-1 ring-ink/10">
                {item.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-snug text-ink">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-snug text-ink-muted">
                  {item.sub}
                </p>
              </div>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

