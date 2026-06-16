"use client";
/**
 * Premium input primitives used by the wizard.
 *
 * They are intentionally plain HTML elements forwarded to react-hook-form via
 * `register`. No internal state is held here so the parent always owns the
 * source of truth.
 */
import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { inputClasses } from "./Field";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ hasError, className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={[inputClasses(hasError), className ?? ""].join(" ").trim()}
        {...rest}
      />
    );
  },
);

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ hasError, className, rows = 4, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        className={[
          inputClasses(hasError),
          "resize-y leading-relaxed",
          className ?? "",
        ]
          .join(" ")
          .trim()}
        {...rest}
      />
    );
  },
);

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ hasError, className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={[
            inputClasses(hasError),
            "appearance-none pr-10",
            className ?? "",
          ]
            .join(" ")
            .trim()}
          {...rest}
        >
          {children}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    );
  },
);
