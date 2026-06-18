/**
 * Reusable editorial content blocks for knowledge pages. Styled to the brand
 * design system (ink/accent/surface tokens, hairline borders, soft shadows) so
 * every page reads as one premium publication.
 */
import type { Route } from "next";
import Link from "next/link";

import type { GuideStep, QA, RelatedLink } from "../types";

/** Small uppercase eyebrow label. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-700">
      {children}
    </p>
  );
}

/** Section heading with an optional kicker. */
export function SectionHeading({
  id,
  kicker,
  children,
}: {
  id?: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5" {...(id ? { id } : {})}>
      {kicker ? <Eyebrow>{kicker}</Eyebrow> : null}
      <h2 className="mt-2 font-display text-[22px] font-extrabold leading-tight tracking-tight text-navy-950 sm:text-[26px]">
        {children}
      </h2>
    </div>
  );
}

/**
 * Prose wrapper — applies readable defaults to raw paragraph/list content via
 * arbitrary child selectors (no typography plugin dependency).
 */
export function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="space-y-4 text-[15.5px] leading-[1.7] text-ink-soft">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

/** A bordered surface card used to frame grouped content. */
export function Panel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl border border-ink/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-7",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

/** Highlighted note (info / tip). */
export function Callout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-accent-200/70 bg-accent-50/60 p-5">
      <p className="text-[13.5px] font-semibold text-accent-800">{title}</p>
      <div className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">
        {children}
      </div>
    </div>
  );
}

/** Numbered step list (pairs with howToSchema). */
export function StepList({ steps }: { steps: GuideStep[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li
          key={i}
          className="flex gap-4 rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-950 text-[14px] font-bold text-white">
            {i + 1}
          </span>
          <div>
            <p className="text-[15px] font-semibold text-navy-950">{s.title}</p>
            <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
              {s.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Accessible FAQ list (pairs with faqSchema). */
export function FaqList({ items }: { items: QA[] }) {
  return (
    <div className="divide-y divide-ink/[0.07] overflow-hidden rounded-2xl border border-ink/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {items.map((qa, i) => (
        <details key={i} className="group p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-navy-950 marker:hidden">
            {qa.question}
            <span
              aria-hidden
              className="shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
            {qa.answer}
          </p>
        </details>
      ))}
    </div>
  );
}

/** Grid of internal related-content links (internal-linking surface). */
export function RelatedGrid({
  title,
  links,
}: {
  title: string;
  links: RelatedLink[];
}) {
  return (
    <section aria-label={title}>
      <SectionHeading>{title}</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href as Route}
            className="group rounded-2xl border border-ink/[0.07] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-ink/15 hover:shadow-[0_12px_28px_-12px_rgba(15,23,42,0.18)]"
          >
            <p className="flex items-center justify-between gap-3 text-[15px] font-semibold text-navy-950">
              {l.title}
              <span
                aria-hidden
                className="text-ink-muted transition-transform duration-200 group-hover:translate-x-0.5"
              >
                →
              </span>
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
              {l.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Conversion block routing to the eligibility check. */
export function CtaBlock({
  title = "Prüfe deine Eignung — kostenlos & unverbindlich",
  body = "In wenigen Minuten klären, ob du die Voraussetzungen für die geförderte Umschulung zum Lokführer erfüllst.",
}: {
  title?: string;
  body?: string;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-ink/[0.07] bg-gradient-to-br from-navy-950 to-navy-800 p-7 text-white sm:p-9">
      <h2 className="font-display text-[22px] font-extrabold leading-tight tracking-tight sm:text-[26px]">
        {title}
      </h2>
      <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-white/75">
        {body}
      </p>
      <Link
        href="/eligibility"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-500 px-7 py-3.5 text-[14.5px] font-semibold text-white shadow-[0_18px_38px_-12px_rgba(63,114,72,0.6)] ring-1 ring-accent-400/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-900"
      >
        Eignung kostenlos prüfen
        <span aria-hidden>→</span>
      </Link>
      <p className="mt-3 text-[12px] text-white/55">
        Kostenlos · Unverbindlich · DSGVO-konform
      </p>
    </section>
  );
}
