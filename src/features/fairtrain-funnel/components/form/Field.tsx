"use client";
/**
 * Field - the canonical wrapper for every form input in the wizard.
 *
 * Renders a label above the input, an optional helper hint below, and an error
 * message that takes priority over the helper when present. Designed to look
 * premium on light backgrounds and to give big, friendly tap targets.
 */
import type { ReactNode } from "react";

export interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  helper?: string | undefined;
  error?: string | undefined;
  children: ReactNode;
  /** Span 1 or 2 columns inside a 2-column form grid (default 1). */
  colSpan?: 1 | 2;
}

export function Field({
  id,
  label,
  required,
  optional,
  helper,
  error,
  children,
  colSpan = 1,
}: FieldProps) {
  return (
    <div className={colSpan === 2 ? "md:col-span-2" : undefined}>
      <label
        htmlFor={id}
        className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-navy-900"
      >
        <span>{label}</span>
        {required ? (
          <span aria-hidden className="text-accent-600">
            *
          </span>
        ) : null}
        {optional ? (
          <span className="text-[10px] font-medium tracking-normal text-ink-muted normal-case">
            optional
          </span>
        ) : null}
      </label>

      {children}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-[12px] font-medium text-accent-700"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-px h-3.5 w-3.5 shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
        </p>
      ) : helper ? (
        <p
          id={`${id}-helper`}
          className="mt-1.5 text-[12px] leading-relaxed text-ink-muted"
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Tailwind input classes shared across TextInput/Textarea/Select/DateInput.
 * Exported so custom inputs can stay visually consistent.
 */
export const baseInputClass = [
  "w-full",
  "rounded-xl",
  "border border-ink/10",
  "bg-white",
  "px-4 py-3",
  "text-[15px] text-ink placeholder:text-ink-muted/65",
  "shadow-sm",
  "transition",
  "outline-none",
  "focus:border-accent-300 focus:ring-2 focus:ring-accent-100",
  "disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:text-ink-muted",
].join(" ");

export const errorInputClass = [
  "border-accent-300",
  "ring-2 ring-accent-100",
].join(" ");

export function inputClasses(hasError?: boolean): string {
  return [baseInputClass, hasError ? errorInputClass : ""].join(" ").trim();
}
