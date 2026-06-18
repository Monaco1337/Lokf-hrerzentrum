"use client";
/** Reusable, mobile-first form primitives for the applicant portal. */
import type { ReactNode } from "react";

export const EMPLOYMENT_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "UNEMPLOYED", label: "Arbeitslos / arbeitssuchend" },
  { value: "EMPLOYED_FULL", label: "Vollzeit beschäftigt" },
  { value: "EMPLOYED_PART", label: "Teilzeit beschäftigt" },
  { value: "MARGINAL", label: "Minijob / geringfügig" },
  { value: "OTHER", label: "Sonstiges" },
];

export const AGENCY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "Agentur für Arbeit", label: "Agentur für Arbeit" },
  { value: "Jobcenter", label: "Jobcenter" },
  { value: "Beides", label: "Beides" },
  { value: "Noch nicht geklärt", label: "Noch nicht geklärt" },
  { value: "Kein Bezug", label: "Kein Bezug" },
];

export function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  inputMode?: "text" | "email" | "tel" | "numeric";
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <input
        className="input"
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <textarea
        className="input min-h-[96px] resize-y"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  hint?: string;
}) {
  return (
    <FieldShell label={label} hint={hint}>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Bitte wählen…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  const opts: ReadonlyArray<{ v: boolean; label: string }> = [
    { v: true, label: "Ja" },
    { v: false, label: "Nein" },
  ];
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {opts.map((o) => {
          const active = value === o.v;
          return (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => onChange(o.v)}
              className={
                "rounded-xl border px-4 py-3 text-sm font-semibold transition " +
                (active
                  ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-200"
                  : "border-ink/15 bg-white text-ink-soft hover:border-ink/30")
              }
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
