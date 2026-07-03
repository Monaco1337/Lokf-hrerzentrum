"use client";
/**
 * Step 5 — Einverständnis & Absenden
 *
 * DSGVO-compliant consent collection:
 *   - PRIVACY (Art. 6 Abs. 1 lit. a DSGVO) is required
 *   - WHATSAPP and MARKETING are explicitly opt-in
 *   - User-friendly summary above the checkboxes
 *   - Clear withdrawal notice
 */
import { useState } from "react";

import { ConsentType } from "../../types";
import { ArrowRightIcon } from "../landing/icons";
import { WizardShell } from "./WizardShell";
import { STEP_TITLES, TOTAL_STEPS } from "./constants";
import type { StepProps } from "./types";

const ITEMS: ReadonlyArray<{
  key: ConsentType;
  required: boolean;
  label: string;
  description: string;
}> = [
  {
    key: ConsentType.PRIVACY,
    required: true,
    label: "Datenschutzhinweis & Verarbeitung",
    description:
      "Ich willige in die Verarbeitung meiner Angaben zur Eignungsprüfung und zur Vorbereitung des Förderantrags ein. Sensible Angaben (z. B. zu Suchtproblematik) werden getrennt und nur intern gespeichert. Detail in der Datenschutzerklärung.",
  },
  {
    key: ConsentType.EMAIL,
    required: true,
    label: "Kontakt per E-Mail",
    description:
      "Wir dürfen dir die Rückmeldung zur Eignung und wichtige Informationen zur Weiterbildung per E-Mail zusenden.",
  },
  {
    key: ConsentType.WHATSAPP,
    required: true,
    label: "Kontakt per WhatsApp",
    description:
      "Wir dürfen dir die Rückmeldung zur Eignung und einen sicheren Magic-Link für die nächsten Schritte per WhatsApp zusenden.",
  },
  {
    key: ConsentType.PHONE,
    required: true,
    label: "Kontakt per Telefon",
    description:
      "Wir dürfen dich telefonisch kontaktieren, falls Rückfragen zu deiner Anfrage entstehen.",
  },
  {
    key: ConsentType.MARKETING,
    required: false,
    label: "Hinweise zu weiteren Programmen",
    description:
      "Gelegentliche Informationen zu passenden Weiterbildungen oder Standorten. Jederzeit per Klick widerrufbar.",
  },
];

export function Step5Consent({ state, patch, onPrev, onNext }: StepProps) {
  const [showErrors, setShowErrors] = useState(false);

  function toggle(key: ConsentType, value: boolean) {
    patch({ consents: { ...state.consents, [key]: value } });
  }

  const missingRequired = ITEMS.some(
    (item) => item.required && !state.consents[item.key],
  );

  function submit() {
    if (missingRequired) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    onNext();
  }

  return (
    <WizardShell
      step={4}
      total={TOTAL_STEPS}
      titles={STEP_TITLES}
      title="Letzter Schritt: Einverständnis"
      description="Damit wir deine Bewerbung bearbeiten dürfen, brauchen wir kurz dein Einverständnis. Du behältst die volle Kontrolle und kannst jederzeit widerrufen."
      footer={
        <>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:text-ink"
            onClick={onPrev}
          >
            Zurück
          </button>
          <button
            type="button"
            onClick={submit}
            className="btn-cta-lg w-full justify-center sm:w-auto"
          >
            Eignungscheck absenden
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </>
      }
    >
      <ul className="space-y-3">
        {ITEMS.map((item) => {
          const checked = state.consents[item.key];
          const missing = showErrors && item.required && !checked;
          return (
            <li key={item.key}>
              <label
                className={[
                  "flex cursor-pointer items-start gap-4 rounded-2xl border bg-white px-4 py-4 transition sm:px-5",
                  missing
                    ? "border-accent-300 ring-1 ring-accent-100"
                    : checked
                      ? "border-accent-200/70 bg-accent-50/30"
                      : "border-ink/10 hover:border-ink/20",
                ].join(" ")}
              >
                <span className="mt-0.5">
                  <CheckBox
                    checked={checked}
                    onChange={(v) => toggle(item.key, v)}
                    ariaLabel={item.label}
                  />
                </span>
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold text-navy-950">
                    {item.label}
                  </span>
                  <span className="mt-1 block text-[13.5px] leading-relaxed text-ink-soft">
                    {item.description}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {showErrors && missingRequired ? (
        <p className="mt-5 rounded-xl border border-accent-200/60 bg-accent-50/40 px-4 py-3 text-[13px] font-medium text-accent-800">
          Bitte bestätige die markierten Angaben, damit wir deine Bewerbung
          bearbeiten dürfen.
        </p>
      ) : null}

      <div className="mt-8 space-y-2 text-[12px] leading-relaxed text-ink-muted">
        <p>
          Mit dem Absenden bestätigst du, dass deine Angaben wahrheitsgemäß
          sind. Die Datenschutzerklärung findest du im Footer.
        </p>
        <p>
          Deine Rechte nach DSGVO: Auskunft, Berichtigung, Löschung,
          Datenübertragung und Widerruf der Einwilligung – schreib uns einfach
          an{" "}
          <a
            href="mailto:foerderung@xn--lokfhrerzentrum-2vb.de"
            className="font-medium text-ink-soft underline decoration-ink/20 underline-offset-2 transition hover:text-ink hover:decoration-ink/40"
          >
            foerderung@lokführerzentrum.de
          </a>
          .
        </p>
      </div>
    </WizardShell>
  );
}

function CheckBox({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={[
        "inline-flex h-6 w-6 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-accent-200 focus:ring-offset-1",
        checked
          ? "border-accent-600 bg-accent-600 text-white"
          : "border-ink/20 bg-white",
      ].join(" ")}
    >
      {checked ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="m5 13 4 4L19 7" />
        </svg>
      ) : null}
    </span>
  );
}
