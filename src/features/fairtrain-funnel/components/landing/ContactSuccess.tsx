"use client";
import { ArrowRightIcon, CheckIcon } from "./icons";

export function SuccessPanel({ onReset }: { onReset: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent-200/50 bg-white p-8 shadow-card">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-50/60 via-white to-white"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent-100/45 blur-3xl"
      />
      <div className="relative flex flex-col items-start">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-600 text-white shadow-cta">
          <CheckIcon className="h-5 w-5" />
        </span>
        <h3
          className="mt-5 text-[1.375rem] font-bold leading-snug tracking-tight text-navy-950"
          style={{ letterSpacing: "-0.02em" }}
        >
          Nachricht ist bei uns.
        </h3>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-ink-soft">
          Danke! Wir melden uns persönlich – in der Regel innerhalb eines
          Werktags – mit einer klaren Antwort.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent-700 transition hover:text-accent-800"
        >
          Weitere Nachricht senden
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
