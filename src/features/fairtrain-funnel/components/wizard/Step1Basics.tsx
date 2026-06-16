"use client";
/**
 * Step 1 — Eignung (K.O.-Kriterien)
 *
 * Geführtes Accordion: nur EIN Kriterium ist aufgeklappt. Nach jeder Antwort
 * schließt sich das aktuelle Item und das nächste unbeantwortete öffnet
 * automatisch. So klickt der Nutzer linear durch ohne Scroll-Aufwand.
 */
import { useMemo, useState } from "react";

import { KoAccordion, type KoQuestion } from "../form/KoAccordion";
import { ArrowRightIcon } from "../landing/icons";
import { WizardShell } from "./WizardShell";
import type { StepProps } from "./types";
import { STEP_TITLES, TOTAL_STEPS } from "./constants";

const KO_QUESTIONS: ReadonlyArray<KoQuestion> = [
  {
    id: "hasNoKbaDrugEntries",
    title: "Saubere Akte: keine Drogen-/Alkohol-Einträge in Flensburg",
    body: "Wichtig: Bei solchen Einträgen verweigert der Bahnarzt den Lokführerschein.",
    expected: true,
    warningIfWrong:
      "Mit aktiven Einträgen ist die Ausbildung leider nicht möglich.",
  },
  {
    id: "acceptsShiftWork",
    title: "Schichtdienst: Nacht, Wochenende, Feiertag – ok?",
    body: "Züge fahren 24/7. Der Schichtdienst muss dauerhaft für dich passen.",
    expected: true,
    warningIfWrong:
      "Ohne Schichtbereitschaft ist der Beruf nicht möglich.",
  },
  {
    id: "acceptsTravelHotel",
    title: "Bundesweite Einsätze & Hotelübernachtungen – ok?",
    body: "Einsätze oft bundesweit. Hotelkosten zahlt der Arbeitgeber.",
    expected: true,
    warningIfWrong:
      "Ohne Reisebereitschaft sind die Optionen sehr eingeschränkt.",
  },
  {
    id: "acceptsPsychLoad",
    title: "Psychische Belastung zugetraut",
    body: "Sehr selten, aber möglich: Personenschäden. Eine schwere Maschine bremst nicht sofort.",
    expected: true,
    warningIfWrong:
      "Wenn du dir das nicht zutraust, sprich am besten persönlich mit uns.",
  },
];

function nextUnansweredId(
  answers: Record<string, boolean | null>,
  afterIdx: number,
): string | null {
  for (let i = afterIdx + 1; i < KO_QUESTIONS.length; i++) {
    const q = KO_QUESTIONS[i];
    if (!q) continue;
    if (answers[q.id] === null || answers[q.id] === undefined) {
      return q.id;
    }
  }
  // Wrap around to find any earlier unanswered item.
  for (let i = 0; i <= afterIdx; i++) {
    const q = KO_QUESTIONS[i];
    if (!q) continue;
    if (answers[q.id] === null || answers[q.id] === undefined) {
      return q.id;
    }
  }
  return null;
}

export function Step1Basics({ state, patch, onNext, onPrev }: StepProps) {
  const [showErrors, setShowErrors] = useState(false);
  const [openId, setOpenId] = useState<string | null>(
    () => KO_QUESTIONS[0]?.id ?? null,
  );

  const answers = useMemo<Record<string, boolean | null>>(
    () => ({
      hasNoKbaDrugEntries: state.hasNoKbaDrugEntries,
      acceptsShiftWork: state.acceptsShiftWork,
      acceptsTravelHotel: state.acceptsTravelHotel,
      acceptsPsychLoad: state.acceptsPsychLoad,
    }),
    [
      state.hasNoKbaDrugEntries,
      state.acceptsShiftWork,
      state.acceptsTravelHotel,
      state.acceptsPsychLoad,
    ],
  );

  const allAnswered = KO_QUESTIONS.every((q) => answers[q.id] !== null);
  const allPositive = KO_QUESTIONS.every((q) => answers[q.id] === q.expected);
  const hasBlockingNo =
    allAnswered && KO_QUESTIONS.some((q) => answers[q.id] === false);

  function handleChange(id: string, value: boolean) {
    if (id === "hasNoKbaDrugEntries") patch({ hasNoKbaDrugEntries: value });
    if (id === "acceptsShiftWork") patch({ acceptsShiftWork: value });
    if (id === "acceptsTravelHotel") patch({ acceptsTravelHotel: value });
    if (id === "acceptsPsychLoad") patch({ acceptsPsychLoad: value });

    // Auto-advance: build the projected answers map with this new value and
    // open the next still-unanswered item (or close if everything is done /
    // the user just answered "Nein" so they can read the warning).
    const projected = { ...answers, [id]: value };
    const idx = KO_QUESTIONS.findIndex((q) => q.id === id);
    const meta = KO_QUESTIONS[idx];
    const isBlocking = meta ? value !== meta.expected : false;

    if (isBlocking) {
      // Keep the current item open so the warning is visible.
      return;
    }

    const nextId = nextUnansweredId(projected, idx);
    setOpenId(nextId);
  }

  function submit() {
    if (!allAnswered) {
      setShowErrors(true);
      // Open the first unanswered item so the user is guided to it.
      const firstMissing =
        KO_QUESTIONS.find((q) => answers[q.id] === null)?.id ?? null;
      if (firstMissing) setOpenId(firstMissing);
      return;
    }
    setShowErrors(false);
    onNext();
  }

  return (
    <WizardShell
      step={0}
      total={TOTAL_STEPS}
      titles={STEP_TITLES}
      title="Vier Pflichtkriterien für deinen Eignungscheck"
      description="Vier kurze Fragen. Beantworte sie ehrlich – das schützt dich vor unnötigen Wegen."
      footer={
        <>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:text-ink"
            onClick={onPrev}
            disabled
          >
            Zurück
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={hasBlockingNo}
            className="btn-cta-lg w-full justify-center sm:w-auto disabled:cursor-not-allowed disabled:opacity-60"
          >
            Weiter
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </>
      }
    >
      <KoAccordion
        questions={KO_QUESTIONS}
        answers={answers}
        onChange={handleChange}
        openId={openId}
        onOpen={setOpenId}
        showErrors={showErrors}
      />

      {allAnswered && allPositive ? (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/60 px-4 py-3.5 text-[13.5px] leading-relaxed text-emerald-900">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
          >
            <path d="m5 13 4 4L19 7" />
          </svg>
          <span>
            <strong>Stark.</strong> Du erfüllst alle vier Kriterien – weiter geht&apos;s.
          </span>
        </div>
      ) : null}

      {showErrors && !allAnswered ? (
        <p className="mt-5 rounded-xl border border-accent-200/60 bg-accent-50/40 px-4 py-3 text-[13px] font-medium text-accent-800">
          Bitte beantworte alle vier Fragen.
        </p>
      ) : null}
    </WizardShell>
  );
}
