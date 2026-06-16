"use client";
/**
 * Accordion of K.O. criteria.
 *
 * Each item is a `<details>` element with a Ja/Nein selector inside. Native
 * disclosure semantics ensure keyboard / a11y for free. Items can flag a
 * negative-as-blocking state which renders a friendly warning below the
 * selector.
 */
import { useId } from "react";

import { ChevronDownIcon } from "../landing/icons";
import { YesNo } from "./YesNo";

export interface KoQuestion {
  id: string;
  title: string;
  body: string;
  /** When set to `true`, this question's expected positive answer is "Ja".
   *  When set to `false`, the expected answer is "Nein". */
  expected: boolean;
  warningIfWrong?: string;
}

export interface KoAccordionProps {
  questions: ReadonlyArray<KoQuestion>;
  answers: Record<string, boolean | null>;
  onChange: (id: string, value: boolean) => void;
  /** ID of the currently expanded item. Pass `null` to collapse all. */
  openId: string | null;
  onOpen: (id: string | null) => void;
  showErrors?: boolean;
}

export function KoAccordion({
  questions,
  answers,
  onChange,
  openId,
  onOpen,
  showErrors,
}: KoAccordionProps) {
  return (
    <ul className="space-y-3">
      {questions.map((q, idx) => {
        const value = answers[q.id] ?? null;
        const isAnswered = value !== null;
        const isBlocking = isAnswered && value !== q.expected;
        const missing = showErrors && !isAnswered;
        const isOpen = openId === q.id;
        return (
          <li key={q.id}>
            <KoItem
              question={q}
              index={idx + 1}
              value={value}
              onChange={(v) => onChange(q.id, v)}
              isAnswered={isAnswered}
              isBlocking={isBlocking}
              missing={missing ?? false}
              isOpen={isOpen}
              onToggle={() => onOpen(isOpen ? null : q.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}

interface KoItemProps {
  question: KoQuestion;
  index: number;
  value: boolean | null;
  onChange: (v: boolean) => void;
  isAnswered: boolean;
  isBlocking: boolean;
  missing: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

function KoItem({
  question,
  index,
  value,
  onChange,
  isAnswered,
  isBlocking,
  missing,
  isOpen,
  onToggle,
}: KoItemProps) {
  const labelId = useId();
  const contentId = useId();
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-2xl border bg-white transition-shadow",
        missing
          ? "border-accent-300 ring-1 ring-accent-100"
          : isBlocking
            ? "border-accent-300 ring-1 ring-accent-100"
            : isAnswered
              ? "border-emerald-300/60 ring-1 ring-emerald-100"
              : "border-ink/10",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className="flex w-full items-center gap-4 px-5 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-200 sm:px-6"
      >
        <span
          aria-hidden
          className={[
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ring-1 transition-colors",
            missing
              ? "bg-accent-50 text-accent-700 ring-accent-200"
              : isBlocking
                ? "bg-accent-50 text-accent-700 ring-accent-200"
                : isAnswered
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-surface-subtle text-ink ring-ink/10",
          ].join(" ")}
        >
          {isAnswered && !isBlocking ? (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="m5 13 4 4L19 7" />
            </svg>
          ) : (
            index
          )}
        </span>

        <span
          id={labelId}
          className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-navy-950 sm:text-[16px]"
        >
          {question.title}
        </span>

        <ChevronDownIcon
          className={[
            "ml-auto h-5 w-5 shrink-0 text-ink-muted transition-transform duration-300",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {isOpen ? (
        <div
          id={contentId}
          className="border-t border-ink/5 bg-surface-subtle/40 px-5 pb-5 pt-5 sm:px-6"
        >
          <p className="mb-4 text-[14px] leading-relaxed text-ink-soft">
            {question.body}
          </p>

          <YesNo
            name={question.id}
            value={value}
            onChange={onChange}
            ariaLabelledBy={labelId}
            hasError={missing}
          />

          {isBlocking && question.warningIfWrong ? (
            <p className="mt-4 flex items-start gap-2 rounded-xl border border-accent-200/60 bg-accent-50/60 px-4 py-3 text-[13px] leading-relaxed text-accent-800">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 h-4 w-4 shrink-0"
              >
                <path d="M12 9v4M12 17h.01" />
                <path d="m10.3 3.5-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.5l-8-14a2 2 0 0 0-3.4 0Z" />
              </svg>
              <span>{question.warningIfWrong}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
