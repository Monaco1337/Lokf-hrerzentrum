"use client";
import Link from "next/link";

import { LeadPriority } from "../../types";

interface ResultState {
  status: "loading" | "ok" | "error";
  priority?: LeadPriority;
  message?: string;
}

export interface WhatsAppContact {
  /** Human-readable number shown to the lead, e.g. "+49 170 6620044". */
  display: string;
  /** wa.me id: E.164 digits without "+" or spaces, e.g. "491706620044". */
  waId: string;
}

const WHATSAPP_PREFILL =
  "Hallo, ich habe gerade den Eignungscheck ausgefüllt und habe eine kurze Frage.";

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

export function Step6Result({
  result,
  whatsappContact,
}: {
  result: ResultState;
  whatsappContact?: WhatsAppContact | null | undefined;
}) {
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

          {whatsappContact ? (
            <div className="mx-auto mt-8 max-w-md rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
              <p className="text-sm font-semibold text-navy-950">
                Direkt eine Frage? Schreib uns auf WhatsApp.
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
                Unser Team antwortet dir persönlich – schnell und
                unkompliziert.
              </p>
              <a
                href={`https://wa.me/${whatsappContact.waId}?text=${encodeURIComponent(
                  WHATSAPP_PREFILL,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <WhatsAppIcon />
                WhatsApp starten
              </a>
              <p className="mt-3 text-[12px] font-medium text-ink-soft">
                {whatsappContact.display}
              </p>
            </div>
          ) : null}

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

function WhatsAppIcon() {
  return (
    <svg
      aria-hidden
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.82c2.16 0 4.19.84 5.72 2.37a8.05 8.05 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.09 8.09-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.02 8.02 0 0 1-1.23-4.28c0-4.46 3.63-8.09 8.09-8.09Zm-2.79 4.35c-.15 0-.39.06-.6.28-.2.22-.79.77-.79 1.87 0 1.1.81 2.17.92 2.32.11.15 1.57 2.4 3.81 3.37.53.23.95.37 1.27.47.53.17 1.02.15 1.4.09.43-.06 1.31-.54 1.5-1.06.19-.52.19-.96.13-1.06-.06-.09-.2-.15-.43-.26-.22-.11-1.31-.65-1.51-.72-.2-.07-.35-.11-.5.11-.15.22-.57.72-.7.87-.13.15-.26.17-.48.06-.22-.11-.94-.35-1.79-1.11-.66-.59-1.11-1.32-1.24-1.54-.13-.22-.01-.34.1-.45.1-.1.22-.26.33-.39.11-.13.15-.22.22-.37.07-.15.04-.28-.02-.39-.06-.11-.5-1.21-.68-1.65-.18-.43-.36-.37-.5-.38-.13-.01-.28-.01-.43-.01Z" />
    </svg>
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
