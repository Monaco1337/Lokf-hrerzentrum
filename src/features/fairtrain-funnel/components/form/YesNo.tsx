"use client";
/**
 * Large Ja/Nein selector tuned for thumbs and clarity.
 *
 * The component is controlled - the parent owns `value` and `onChange`.
 */
import { CheckIcon } from "../landing/icons";

export interface YesNoProps {
  name: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
  /** Visual tone of the "selected" state. Default: "accent" (red). */
  tone?: "accent" | "navy";
  yesLabel?: string;
  noLabel?: string;
  ariaLabelledBy?: string;
  hasError?: boolean;
}

export function YesNo({
  name,
  value,
  onChange,
  tone = "accent",
  yesLabel = "Ja",
  noLabel = "Nein",
  ariaLabelledBy,
  hasError,
}: YesNoProps) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={ariaLabelledBy}
      className="grid grid-cols-2 gap-2 sm:gap-3"
    >
      <ChoiceButton
        name={name}
        selected={value === true}
        onClick={() => onChange(true)}
        tone={tone}
        intent="positive"
        hasError={hasError}
        label={yesLabel}
      />
      <ChoiceButton
        name={name}
        selected={value === false}
        onClick={() => onChange(false)}
        tone={tone}
        intent="negative"
        hasError={hasError}
        label={noLabel}
      />
    </div>
  );
}

interface ChoiceButtonProps {
  name: string;
  label: string;
  selected: boolean;
  intent: "positive" | "negative";
  tone: "accent" | "navy";
  onClick: () => void;
  hasError?: boolean | undefined;
}

function ChoiceButton({
  name,
  label,
  selected,
  intent,
  tone,
  onClick,
  hasError,
}: ChoiceButtonProps) {
  const isAccent = tone === "accent";
  const selectedClasses = isAccent
    ? "border-accent-300 bg-accent-50/70 text-accent-800 ring-2 ring-accent-100 shadow-sm"
    : "border-navy-300 bg-navy-50/80 text-navy-900 ring-2 ring-navy-100 shadow-sm";
  const idleClasses =
    "border-ink/10 bg-white text-ink hover:border-ink/20 hover:bg-surface-subtle/60";

  return (
    <button
      type="button"
      role="radio"
      name={name}
      aria-checked={selected}
      onClick={onClick}
      className={[
        "group relative flex items-center justify-center gap-2 rounded-xl border px-4 py-3.5 text-[15px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-accent-200 focus:ring-offset-1",
        selected ? selectedClasses : idleClasses,
        hasError && !selected ? "border-accent-300" : "",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={[
          "inline-flex h-5 w-5 items-center justify-center rounded-full border transition",
          selected
            ? isAccent
              ? "border-accent-600 bg-accent-600 text-white"
              : "border-navy-700 bg-navy-700 text-white"
            : "border-ink/20 bg-white text-transparent group-hover:border-ink/30",
        ].join(" ")}
      >
        {intent === "positive" ? (
          <CheckIcon className="h-3 w-3" strokeWidth={3} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </span>
      {label}
    </button>
  );
}
