"use client";
/**
 * Step 3 — Persönliche Daten
 *
 * Full personal data form: name, contact, birth, address. Validates with the
 * combined Step1Basics + PersonDetails Zod schemas. Errors are inline per
 * field and only revealed after the first submit attempt.
 */
import { useState } from "react";

import {
  PersonDetailsSchema,
  Step1BasicsSchema,
} from "../../forms/schemas";
import { Field } from "../form/Field";
import { TextInput } from "../form/Inputs";
import { ArrowRightIcon } from "../landing/icons";
import { WizardShell } from "./WizardShell";
import { STEP_TITLES, TOTAL_STEPS } from "./constants";
import type { StepProps } from "./types";

export function Step3Location({ state, patch, onNext, onPrev }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function submit() {
    const basics = Step1BasicsSchema.safeParse({
      firstName: state.firstName,
      lastName: state.lastName,
      email: state.email,
      phone: state.phone,
      city: state.city,
    });
    const person = PersonDetailsSchema.safeParse({
      birthDate: state.birthDate || null,
      birthPlace: state.birthPlace || "",
      street: state.street || "",
      houseNumber: state.houseNumber || "",
      postalCode: state.postalCode || null,
      addressCity: state.city || "",
      nationality: state.nationality || "",
    });

    const next: Record<string, string> = {};
    if (!basics.success) {
      for (const issue of basics.error.issues) {
        const path = issue.path[0]?.toString() ?? "form";
        if (!next[path]) next[path] = issue.message;
      }
    }
    if (!person.success) {
      for (const issue of person.error.issues) {
        const path = issue.path[0]?.toString() ?? "form";
        if (!next[path]) next[path] = issue.message;
      }
    }

    setErrors(next);
    if (Object.keys(next).length === 0) {
      onNext();
    }
  }

  return (
    <WizardShell
      step={2}
      total={TOTAL_STEPS}
      titles={STEP_TITLES}
      title="Deine persönlichen Daten"
      description="So können wir dich erreichen und später deine Unterlagen vorbereiten. Alle Angaben sind durch unsere Datenschutz-Erklärung geschützt."
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
            Weiter
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </>
      }
    >
      <SectionTitle>Kontakt</SectionTitle>

      <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
        <Field
          id="firstName"
          label="Vorname"
          required
          error={errors["firstName"]}
        >
          <TextInput
            id="firstName"
            autoComplete="given-name"
            placeholder="Max"
            value={state.firstName}
            hasError={Boolean(errors["firstName"])}
            onChange={(e) => patch({ firstName: e.target.value })}
          />
        </Field>
        <Field
          id="lastName"
          label="Nachname"
          required
          error={errors["lastName"]}
        >
          <TextInput
            id="lastName"
            autoComplete="family-name"
            placeholder="Mustermann"
            value={state.lastName}
            hasError={Boolean(errors["lastName"])}
            onChange={(e) => patch({ lastName: e.target.value })}
          />
        </Field>
        <Field
          id="email"
          label="E-Mail-Adresse"
          required
          helper="Für deine Bestätigung und den Magic-Link."
          error={errors["email"]}
        >
          <TextInput
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="max@beispiel.de"
            value={state.email}
            hasError={Boolean(errors["email"])}
            onChange={(e) => patch({ email: e.target.value })}
          />
        </Field>
        <Field
          id="phone"
          label="Handynummer"
          required
          helper="Optional auch per WhatsApp erreichbar."
          error={errors["phone"]}
        >
          <TextInput
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0151…"
            value={state.phone}
            hasError={Boolean(errors["phone"])}
            onChange={(e) => patch({ phone: e.target.value })}
          />
        </Field>
      </div>

      <Divider />

      <SectionTitle>Geburtsdaten</SectionTitle>

      <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
        <Field
          id="birthDate"
          label="Geburtsdatum"
          required
          helper="TT.MM.JJJJ"
          error={errors["birthDate"]}
        >
          <TextInput
            id="birthDate"
            type="text"
            inputMode="numeric"
            autoComplete="bday"
            placeholder="01.01.1990"
            maxLength={10}
            value={state.birthDate}
            hasError={Boolean(errors["birthDate"])}
            onChange={(e) =>
              patch({ birthDate: maskGermanDate(e.target.value) })
            }
          />
        </Field>
        <Field
          id="birthPlace"
          label="Geburtsort"
          optional
          error={errors["birthPlace"]}
        >
          <TextInput
            id="birthPlace"
            placeholder="München"
            value={state.birthPlace}
            hasError={Boolean(errors["birthPlace"])}
            onChange={(e) => patch({ birthPlace: e.target.value })}
          />
        </Field>
      </div>

      <Divider />

      <SectionTitle>Adresse</SectionTitle>

      <div className="grid gap-x-5 gap-y-5 md:grid-cols-6">
        <div className="md:col-span-4">
          <Field
            id="street"
            label="Straße"
            optional
            error={errors["street"]}
          >
            <TextInput
              id="street"
              autoComplete="address-line1"
              placeholder="Musterstraße"
              value={state.street}
              hasError={Boolean(errors["street"])}
              onChange={(e) => patch({ street: e.target.value })}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field
            id="houseNumber"
            label="Hausnummer"
            optional
            error={errors["houseNumber"]}
          >
            <TextInput
              id="houseNumber"
              placeholder="12a"
              value={state.houseNumber}
              hasError={Boolean(errors["houseNumber"])}
              onChange={(e) => patch({ houseNumber: e.target.value })}
            />
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field
            id="postalCode"
            label="PLZ"
            optional
            error={errors["postalCode"]}
          >
            <TextInput
              id="postalCode"
              inputMode="numeric"
              autoComplete="postal-code"
              placeholder="10115"
              maxLength={5}
              value={state.postalCode}
              hasError={Boolean(errors["postalCode"])}
              onChange={(e) => patch({ postalCode: e.target.value })}
            />
          </Field>
        </div>
        <div className="md:col-span-4">
          <Field id="city" label="Ort" required error={errors["city"]}>
            <TextInput
              id="city"
              autoComplete="address-level2"
              placeholder="Berlin"
              value={state.city}
              hasError={Boolean(errors["city"])}
              onChange={(e) => patch({ city: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </WizardShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-navy-900">
      {children}
    </h3>
  );
}

function Divider() {
  return <hr className="my-8 border-ink/5" />;
}

/**
 * Auto-formats a German date as the user types: 19052026 → 19.05.2026.
 * Strips non-digits, inserts dots after day and month chunks, caps at 8 digits.
 */
function maskGermanDate(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}
