"use client";
import { ArrowRightIcon } from "./icons";

export interface ContactFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
  privacyAccepted: boolean;
  company: string;
}

export type ContactStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; id: string }
  | { kind: "error"; message: string };

export interface ContactCardProps {
  values: ContactFormState;
  errors: Partial<Record<keyof ContactFormState, string>>;
  isLoading: boolean;
  status: ContactStatus;
  onChange: <K extends keyof ContactFormState>(
    key: K,
    val: ContactFormState[K],
  ) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  messageRemaining: number;
}

export function ContactCard(props: ContactCardProps) {
  const {
    values,
    errors,
    isLoading,
    status,
    onChange,
    onSubmit,
    messageRemaining,
  } = props;

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-6 shadow-card md:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-accent-100/40 blur-3xl"
      />

      {status.kind === "error" && (
        <div
          role="alert"
          className="relative mb-5 rounded-xl border border-accent-200 bg-accent-50/70 px-4 py-3 text-[13.5px] text-accent-800"
        >
          {status.message}
        </div>
      )}

      <div className="relative grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Vorname"
          name="firstName"
          autoComplete="given-name"
          value={values.firstName}
          onChange={(v) => onChange("firstName", v)}
          error={errors.firstName}
          required
        />
        <Field
          label="Nachname"
          name="lastName"
          autoComplete="family-name"
          value={values.lastName}
          onChange={(v) => onChange("lastName", v)}
          error={errors.lastName}
          required
        />
        <Field
          label="E-Mail"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={values.email}
          onChange={(v) => onChange("email", v)}
          error={errors.email}
          required
        />
        <Field
          label="Telefon"
          type="tel"
          name="phone"
          autoComplete="tel"
          inputMode="tel"
          optional
          value={values.phone}
          onChange={(v) => onChange("phone", v)}
          error={errors.phone}
        />
      </div>

      <div className="relative mt-4">
        <label
          htmlFor="contact-message"
          className="mb-1.5 flex items-center justify-between text-[12.5px] font-semibold tracking-tight text-navy-900"
        >
          <span>
            Deine Nachricht
            <span aria-hidden className="ml-1 text-accent-600">
              *
            </span>
          </span>
          <span className="text-[11px] font-medium text-ink-muted">
            {messageRemaining} Zeichen
          </span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          maxLength={2000}
          required
          value={values.message}
          onChange={(e) => onChange("message", e.target.value)}
          placeholder="Womit können wir dir helfen?"
          className={[
            "w-full resize-none rounded-xl border bg-white px-4 py-3 text-[14.5px] leading-relaxed text-ink shadow-sm transition placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-accent-500/30",
            errors.message
              ? "border-accent-300 focus:border-accent-500"
              : "border-ink/15 hover:border-ink/25 focus:border-accent-500",
          ].join(" ")}
        />
        {errors.message && (
          <p className="mt-1.5 text-[12px] font-medium text-accent-700">
            {errors.message}
          </p>
        )}
      </div>

      {/*
        Honeypot. Intentionally NOT named "company"/"organization" and without a
        semantic label, so browser autofill & password managers never fill it
        for real users (which would falsely trip the spam guard). Bots that fill
        every field still get caught server-side.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden opacity-0"
      >
        <input
          id="contact-confirm-field"
          type="text"
          name="confirm_field"
          tabIndex={-1}
          autoComplete="off"
          value={values.company}
          onChange={(e) => onChange("company", e.target.value)}
        />
      </div>

      <div className="relative mt-5">
        <label className="flex items-start gap-3 text-[13px] leading-relaxed text-ink-soft">
          <input
            type="checkbox"
            name="privacyAccepted"
            checked={values.privacyAccepted}
            onChange={(e) => onChange("privacyAccepted", e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink/25 text-accent-600 focus:ring-accent-500/40"
            required
          />
          <span>
            Ich habe die{" "}
            <a
              href="/datenschutz"
              className="font-semibold text-navy-900 underline-offset-2 hover:underline"
            >
              Datenschutzhinweise
            </a>{" "}
            gelesen und bin einverstanden, dass meine Angaben zur Beantwortung
            meiner Anfrage verarbeitet werden.
          </span>
        </label>
        {errors.privacyAccepted && (
          <p className="mt-1.5 text-[12px] font-medium text-accent-700">
            {errors.privacyAccepted}
          </p>
        )}
      </div>

      <div className="relative mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-ink-muted">
          Antwortzeit:{" "}
          <span className="font-semibold text-navy-900">≤ 1 Werktag</span>
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="group/cta relative inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-accent-600 via-accent-700 to-accent-800 px-7 text-[14.5px] font-semibold tracking-tight text-white shadow-cta transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cta-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
        >
          <span className="relative">
            {isLoading ? "Wird gesendet…" : "Nachricht senden"}
          </span>
          {!isLoading && (
            <ArrowRightIcon className="relative h-4 w-4 transition-transform duration-200 group-hover/cta:translate-x-0.5" />
          )}
        </button>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  type?: string | undefined;
  autoComplete?: string | undefined;
  inputMode?: "email" | "tel" | "text" | "numeric" | undefined;
  required?: boolean | undefined;
  optional?: boolean | undefined;
}

function Field({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  autoComplete,
  inputMode,
  required,
  optional,
}: FieldProps) {
  const id = `contact-${name}`;
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-2 text-[12.5px] font-semibold tracking-tight text-navy-900"
      >
        <span>{label}</span>
        {required && (
          <span aria-hidden className="text-accent-600">
            *
          </span>
        )}
        {optional && (
          <span className="text-[11px] font-medium text-ink-muted">
            (optional)
          </span>
        )}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode}
        required={required}
        className={[
          "h-12 w-full rounded-xl border bg-white px-4 text-[14.5px] text-ink shadow-sm transition placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-accent-500/30",
          error
            ? "border-accent-300 focus:border-accent-500"
            : "border-ink/15 hover:border-ink/25 focus:border-accent-500",
        ].join(" ")}
      />
      {error && (
        <p className="mt-1.5 text-[12px] font-medium text-accent-700">
          {error}
        </p>
      )}
    </div>
  );
}

export { SuccessPanel } from "./ContactSuccess";
