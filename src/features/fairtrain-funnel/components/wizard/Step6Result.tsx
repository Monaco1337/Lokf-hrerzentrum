"use client";
import Link from "next/link";

import { LeadPriority } from "../../types";

interface ResultState {
  status: "loading" | "ok" | "error";
  priority?: LeadPriority;
  message?: string;
}

interface Variant {
  badge: string;
  badgeClass: string;
  title: string;
  body: string;
  emphasis: "positive" | "neutral" | "negative";
}

const VARIANTS: Record<LeadPriority, Variant> = {
  HOT: {
    badge: "Sehr gute Voraussetzungen",
    badgeClass: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    title: "Sehr gute Voraussetzungen.",
    body: "Deine Angaben passen sehr gut. Wir melden uns kurzfristig persönlich, um die nächsten Schritte mit dir zu besprechen.",
    emphasis: "positive",
  },
  WARM: {
    badge: "Interessante Voraussetzungen",
    badgeClass: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    title: "Deine Angaben sehen interessant aus.",
    body: "Wir prüfen deinen Fall sorgfältig und melden uns mit einer Einschätzung der nächsten Schritte.",
    emphasis: "neutral",
  },
  COLD: {
    badge: "Bedingt geeignet",
    badgeClass: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    title: "Wir prüfen, ob ein Weg möglich ist.",
    body: "Auf Basis deiner Angaben prüfen wir individuell, ob ein Förderweg umsetzbar ist und welche Alternativen sich anbieten.",
    emphasis: "neutral",
  },
  BLOCKED: {
    badge: "Aktuell nicht teilnahmefähig",
    badgeClass: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
    title: "Aktuell ist eine direkte Teilnahme wahrscheinlich nicht möglich.",
    body: "Auf Basis deiner Angaben sehen wir aktuell Ausschlussgründe. Wir prüfen alternative Optionen und melden uns gegebenenfalls.",
    emphasis: "negative",
  },
};

export function Step6Result({ result }: { result: ResultState }) {
  if (result.status === "loading") {
    return (
      <div className="bg-gradient-to-b from-surface-subtle via-white to-surface-subtle/60">
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <Spinner />
          <p className="mt-4 text-base font-medium text-ink-soft">
            Wir prüfen deine Angaben …
          </p>
        </div>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="bg-gradient-to-b from-surface-subtle via-white to-surface-subtle/60">
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <h2 className="font-display text-2xl font-extrabold text-navy-950">
            Da ist etwas schiefgegangen.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            {result.message ?? "Bitte versuche es in einem Moment erneut."}
          </p>
          <Link
            href="/eignungscheck"
            className="btn-cta mt-7 inline-flex"
          >
            Erneut versuchen
          </Link>
        </div>
      </div>
    );
  }

  const variant = VARIANTS[result.priority ?? LeadPriority.WARM];

  return (
    <div className="bg-gradient-to-b from-surface-subtle via-white to-surface-subtle/60">
      <div className="mx-auto max-w-2xl px-6 py-20 md:py-24">
        <div className="relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-8 text-center shadow-premium sm:p-10">
          <div
            aria-hidden
            className={[
              "pointer-events-none absolute inset-x-0 top-0 h-1.5",
              variant.emphasis === "positive"
                ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600"
                : variant.emphasis === "negative"
                  ? "bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600"
                  : "bg-gradient-to-r from-accent-500 via-accent-600 to-accent-700",
            ].join(" ")}
          />
          <span
            className={[
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
              variant.badgeClass,
            ].join(" ")}
          >
            {variant.badge}
          </span>
          <h2
            className="mt-5 font-display text-[1.6rem] font-extrabold leading-tight text-navy-950 sm:text-[1.875rem]"
            style={{ letterSpacing: "-0.025em" }}
          >
            {variant.title}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
            {variant.body}
          </p>

          <div className="mx-auto mt-8 flex max-w-md flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-navy-950 shadow-sm transition hover:border-ink/20"
            >
              Zurück zur Startseite
            </Link>
          </div>

          <p className="mx-auto mt-8 max-w-md text-[11px] leading-relaxed text-ink-muted">
            Du erhältst zusätzlich eine Bestätigung per E-Mail. Bei Fragen sind
            wir per WhatsApp oder Mail für dich erreichbar.
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      aria-hidden
      className="mx-auto h-8 w-8 animate-spin text-accent-600"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={3}
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </svg>
  );
}
