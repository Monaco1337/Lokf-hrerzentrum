"use client";
/**
 * High-end FAQ section.
 *
 * Layout:
 *   - Two-column on md+ (intro sticky on the left, accordion on the right).
 *   - Each Q is its own subtle card with a plus-to-cross toggle.
 *   - Multi-open behaviour: visitors land on a fully *collapsed* list — the
 *     section reads as a calm, scannable menu of headlines. Any number of
 *     items can be opened independently; opening one never closes another.
 *   - Smooth height transition via the grid-template-rows 0fr → 1fr trick.
 *   - Answers in this file mirror FAQ_JSON_LD on the home page; keep them in sync.
 */
import { useState } from "react";

const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Muss ich arbeitslos sein, um teilnehmen zu können?",
    a: "Nein. Arbeitslose, arbeitssuchende und Beschäftigte können teilnehmen. Der Förderweg unterscheidet sich je nach Situation — wir prüfen das individuell mit dir.",
  },
  {
    q: "Was ist ein Bildungsgutschein?",
    a: "Ein Gutschein der Agentur für Arbeit oder des Jobcenters, der die Kosten einer zertifizierten Weiterbildung übernehmen kann. Die Entscheidung trifft der zuständige Sachbearbeiter im persönlichen Termin.",
  },
  {
    q: "Wer entscheidet über die Förderung?",
    a: "Ausschließlich die Agentur für Arbeit bzw. das Jobcenter — basierend auf deiner persönlichen Situation und den vorgelegten Unterlagen. Wir bereiten dich auf den Termin vor und stellen die komplette Mappe mit dir zusammen.",
  },
  {
    q: "Was passiert nach dem Eignungscheck?",
    a: "Du bekommst eine kurze Rückmeldung. Bei guter Eignung melden wir uns persönlich und besprechen die nächsten Schritte mit dir.",
  },
  {
    q: "Welche Unterlagen brauche ich für den Termin?",
    a: "Persönliche Begründung, Lebenslauf, Einstellungszusage, Maßnahme-Angebot, Maßnahmebogen sowie Angebote für den psychologischen Eignungstest und die medizinische Tauglichkeitsuntersuchung. Alles erstellen wir gemeinsam mit dir — du musst nichts allein vorbereiten.",
  },
  {
    q: "Kann ich teilnehmen, wenn ich noch arbeite?",
    a: "Ja. Es gibt einen geordneten Weg ohne voreilige Kündigung. Wir zeigen dir, wann und wie der Wechsel zur Weiterbildung am sichersten funktioniert.",
  },
  {
    q: "Wie lange dauert die Weiterbildung?",
    a: "15 Monate in Vollzeit, davon ca. 3 Monate praktische Fahrausbildung.",
  },
  {
    q: "Gibt es eine Garantie auf Förderung?",
    a: "Nein. Die Bewilligung kann niemand garantieren — die Entscheidung liegt ausschließlich bei der Agentur für Arbeit oder dem Jobcenter. Wir maximieren mit dir die Chancen durch beste Vorbereitung.",
  },
  {
    q: "Werden meine Daten geschützt?",
    a: "Ja. Wir verarbeiten deine Angaben ausschließlich zur Eignungsprüfung und zur Vorbereitung deines Förderantrags. Sensible Angaben werden getrennt gespeichert und nur zur Eignungsbeurteilung verwendet.",
  },
];

export function FaqSection() {
  const [openSet, setOpenSet] = useState<ReadonlySet<number>>(
    () => new Set<number>(),
  );

  const toggle = (i: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <section
      id="faq"
      className="relative bg-gradient-to-b from-white via-surface-subtle/50 to-white"
    >
      <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <div className="grid gap-12 md:grid-cols-12 md:items-start lg:gap-16">
          {/* Intro */}
          <div className="md:col-span-5 md:sticky md:top-24 lg:col-span-4">
            <div className="inline-flex items-center gap-3">
              <span aria-hidden className="h-px w-8 bg-accent-600" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-navy-900">
                Antworten auf einen Blick
              </span>
            </div>
            <h2
              className="mt-6 font-display text-3xl font-extrabold leading-[1.05] text-navy-950 md:text-[40px]"
              style={{
                letterSpacing: "-0.028em",
                fontFeatureSettings: "'kern' 1, 'liga' 1, 'calt' 1, 'ss01' 1",
                textWrap: "balance",
              }}
            >
              Häufige{" "}
              <span
                className="bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 bg-clip-text text-transparent"
                style={{ WebkitBackgroundClip: "text" }}
              >
                Fragen
              </span>
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft md:text-[16px]">
              Die wichtigsten Antworten zu Förderung, Ablauf und Voraussetzungen
              — klar und ohne Behörden-Sprache.
            </p>
          </div>

          {/* Accordion + inline typo-CTA */}
          <div className="md:col-span-7 lg:col-span-8">
            <div className="space-y-3">
              {FAQ.map((item, i) => (
                <FaqItem
                  key={item.q}
                  index={i}
                  question={item.q}
                  answer={item.a}
                  isOpen={openSet.has(i)}
                  onToggle={() => toggle(i)}
                />
              ))}
            </div>

            <ContactInlineCta />
          </div>
        </div>
      </div>
    </section>
  );
}

interface FaqItemProps {
  index: number;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FaqItem({ index, question, answer, isOpen, onToggle }: FaqItemProps) {
  const number = (index + 1).toString().padStart(2, "0");
  const panelId = `faq-panel-${index}`;
  const buttonId = `faq-button-${index}`;

  return (
    <div
      className={[
        "rounded-2xl border bg-white transition",
        isOpen
          ? "border-ink/15 shadow-card"
          : "border-ink/10 hover:border-ink/20 hover:shadow-sm",
      ].join(" ")}
    >
      <button
        id={buttonId}
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left md:px-6"
      >
        <span className="flex min-w-0 items-center gap-4">
          <span
            className={[
              "hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tracking-wide ring-1 transition-colors sm:inline-flex",
              isOpen
                ? "bg-navy-950 text-white ring-navy-950"
                : "bg-white text-ink-soft ring-ink/15",
            ].join(" ")}
          >
            {number}
          </span>
          <span className="text-[15.5px] font-semibold leading-snug text-navy-950 md:text-[16.5px]">
            {question}
          </span>
        </span>
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ease-out",
            isOpen
              ? "rotate-45 bg-accent-600 text-white shadow-sm"
              : "bg-surface-subtle text-ink-soft",
          ].join(" ")}
          aria-hidden
        >
          <PlusIcon className="h-4 w-4" />
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={[
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        ].join(" ")}
      >
        <div className="overflow-hidden">
          <div
            className={[
              "px-5 pb-6 pt-0 md:px-6",
              "transition-opacity duration-200",
              isOpen ? "opacity-100" : "opacity-0",
              "sm:pl-[72px] md:pl-[76px]",
            ].join(" ")}
          >
            <p className="text-[14.5px] leading-relaxed text-ink-soft md:text-[15px]">
              {answer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- inline CTA -----------------------------------------------------------

/**
 * Pure typographic CTA — no pill, no card. Sits at the end of the FAQ list
 * and bridges the visitor into the contact form below (#kontakt). The
 * underline is a hairline accent that thickens slightly on hover, plus a
 * subtle arrow lift. Designed to feel editorial, not button-y.
 */
function ContactInlineCta() {
  return (
    <div className="mt-10 flex items-center justify-center md:mt-14 md:justify-start">
      <a
        href="#kontakt"
        className="group inline-flex items-baseline gap-x-2 text-[15.5px] tracking-tight md:text-[16px]"
      >
        <span className="text-ink-soft">Hast du noch Fragen?</span>
        <span
          className={[
            "font-semibold text-navy-950",
            "underline decoration-accent-600/40 decoration-1 underline-offset-[6px]",
            "transition-[color,text-decoration-color] duration-300",
            "group-hover:text-accent-700 group-hover:decoration-accent-600",
          ].join(" ")}
        >
          Nachricht schreiben
        </span>
        <span
          aria-hidden
          className="translate-y-[1px] text-accent-600 transition-transform duration-300 ease-out group-hover:translate-x-0.5"
        >
          →
        </span>
      </a>
    </div>
  );
}

// ---- icons ----------------------------------------------------------------

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

