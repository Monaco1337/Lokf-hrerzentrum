"use client";
import type { ReactNode } from "react";

interface StepperProps {
  step: number;
  total: number;
  titles: ReadonlyArray<string>;
}

export function Stepper({ step, total, titles }: StepperProps) {
  const completion = Math.min(1, step / Math.max(1, total - 1));
  return (
    <div>
      {/* progress bar */}
      <div className="relative mx-auto h-1 max-w-3xl overflow-hidden rounded-full bg-ink/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent-600 via-accent-700 to-accent-800 transition-all duration-500"
          style={{ width: `${completion * 100}%` }}
        />
      </div>

      {/* steps */}
      <ol className="mx-auto mt-5 grid max-w-4xl grid-cols-2 gap-2 text-[11px] font-medium sm:grid-cols-3 md:grid-cols-6 md:gap-3">
        {Array.from({ length: total }, (_, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <li
              key={i}
              className="flex items-center gap-2 rounded-full px-2 py-1.5 sm:px-2.5"
            >
              <span
                className={[
                  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 transition",
                  active
                    ? "bg-accent-600 text-white ring-accent-600 shadow-sm"
                    : done
                      ? "bg-accent-50 text-accent-700 ring-accent-100"
                      : "bg-white text-ink-muted ring-ink/10",
                ].join(" ")}
              >
                {done ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="m5 13 4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={[
                  "truncate text-[11px] uppercase tracking-[0.12em] sm:text-[12px]",
                  active
                    ? "font-semibold text-navy-950"
                    : done
                      ? "text-navy-800"
                      : "text-ink-muted",
                ].join(" ")}
              >
                {titles[i]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface ShellProps {
  title: string;
  description?: string;
  eyebrow?: string;
  children: ReactNode;
  footer: ReactNode;
  step: number;
  total: number;
  titles: ReadonlyArray<string>;
}

export function WizardShell({
  title,
  description,
  eyebrow,
  children,
  footer,
  step,
  total,
  titles,
}: ShellProps) {
  return (
    <div className="bg-gradient-to-b from-surface-subtle via-white to-surface-subtle/60">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 md:py-14">
        <Stepper step={step} total={total} titles={titles} />

        <div className="relative mt-8 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-premium md:mt-10">
          {/* subtle backdrop accent at top right */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-accent-100/40 blur-3xl"
          />

          <div className="relative px-6 pt-8 sm:px-10 sm:pt-10">
            {eyebrow ? (
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-700">
                <span aria-hidden className="h-px w-6 bg-accent-600" />
                {eyebrow}
              </span>
            ) : null}
            <h2
              className="mt-3 font-display text-[1.625rem] font-extrabold leading-tight text-navy-950 sm:text-[2rem]"
              style={{ letterSpacing: "-0.025em" }}
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
                {description}
              </p>
            ) : null}
          </div>

          <div className="relative px-6 pb-8 pt-7 sm:px-10 sm:pb-10">
            {children}
          </div>

          <div className="relative flex flex-col-reverse gap-3 border-t border-ink/5 bg-surface-subtle/40 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            {footer}
          </div>
        </div>

        <p className="mx-auto mt-5 max-w-3xl text-center text-[11px] leading-relaxed text-ink-muted">
          Deine Angaben werden verschlüsselt übertragen und DSGVO-konform
          gespeichert. Du kannst deine Einwilligung jederzeit widerrufen.
        </p>
      </div>
    </div>
  );
}
