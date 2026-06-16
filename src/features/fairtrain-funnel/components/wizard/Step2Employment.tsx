"use client";
/**
 * Step 2 — Pfad & Standort
 *
 * Two big card-style choices for the funnel path, then a 3-option location
 * selector. Both decisions are big buttons (thumb-friendly).
 */
import { useState } from "react";

import {
  EmploymentStatus,
  FunnelPath,
  PreferredLocation,
} from "../../types";
import { Field } from "../form/Field";
import { Select } from "../form/Inputs";
import {
  ArrowRightIcon,
  PinIcon,
  ShieldIcon,
  TrendingUpIcon,
} from "../landing/icons";
import { WizardShell } from "./WizardShell";
import { STEP_TITLES, TOTAL_STEPS } from "./constants";
import type { StepProps } from "./types";

const EMPLOYMENT_LABELS: Record<EmploymentStatus, string> = {
  UNEMPLOYED: "Arbeitssuchend",
  EMPLOYED_FULL: "Vollzeit",
  EMPLOYED_PART: "Teilzeit",
  MARGINAL: "Minijob",
  OTHER: "Andere",
};

const LOCATION_OPTIONS: ReadonlyArray<{
  value: PreferredLocation;
  label: string;
  body: string;
}> = [
  {
    value: PreferredLocation.BERLIN,
    label: "Berlin",
    body: "Für Berlin & Umland.",
  },
  {
    value: PreferredLocation.SAALFELD,
    label: "Saalfeld",
    body: "Inkl. freier Unterkunft.",
  },
  {
    value: PreferredLocation.UNDECIDED,
    label: "Egal",
    body: "Wir empfehlen dir einen.",
  },
];

export function Step2Employment({ state, patch, onNext, onPrev }: StepProps) {
  const [showErrors, setShowErrors] = useState(false);

  function submit() {
    if (!state.funnelPath || !state.employmentStatus || !state.preferredLocation) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    onNext();
  }

  // Auto-pick employmentStatus when path is set to UNEMPLOYED
  function pickPath(p: FunnelPath) {
    const next: Partial<typeof state> = { funnelPath: p };
    if (p === FunnelPath.UNEMPLOYED) {
      next.employmentStatus = EmploymentStatus.UNEMPLOYED;
    } else if (state.employmentStatus === EmploymentStatus.UNEMPLOYED) {
      next.employmentStatus = "";
    }
    patch(next);
  }

  return (
    <WizardShell
      step={1}
      total={TOTAL_STEPS}
      titles={STEP_TITLES}
      title="Deine Situation & dein Standort"
      description="Daraus ergibt sich dein Förderweg."
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
      {/* Funnel path */}
      <fieldset>
        <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Aktuell bin ich
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <PathCard
            selected={state.funnelPath === FunnelPath.UNEMPLOYED}
            onClick={() => pickPath(FunnelPath.UNEMPLOYED)}
            icon={<ShieldIcon className="h-5 w-5" />}
            title="Arbeitssuchend"
            body="Förderung über die Agentur für Arbeit."
          />
          <PathCard
            selected={state.funnelPath === FunnelPath.EMPLOYED}
            onClick={() => pickPath(FunnelPath.EMPLOYED)}
            icon={<TrendingUpIcon className="h-5 w-5" />}
            title="Beschäftigt"
            body="Förderung möglich, z. B. bei Branchenwechsel."
          />
        </div>
      </fieldset>

      {/* Employment status (only if employed funnel chosen) */}
      {state.funnelPath === FunnelPath.EMPLOYED ? (
        <div className="mt-6">
          <Field
            id="employmentStatus"
            label="Beschäftigungsstatus"
            required
            helper="Für die passende Begründung."
            error={
              showErrors && !state.employmentStatus
                ? "Bitte wählen."
                : undefined
            }
          >
            <Select
              id="employmentStatus"
              value={state.employmentStatus}
              onChange={(e) =>
                patch({ employmentStatus: e.target.value as EmploymentStatus })
              }
              hasError={showErrors && !state.employmentStatus}
            >
              <option value="">Bitte wählen…</option>
              {(Object.entries(EMPLOYMENT_LABELS) as [
                EmploymentStatus,
                string,
              ][])
                .filter(([k]) => k !== EmploymentStatus.UNEMPLOYED)
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
      ) : null}

      {/* Location */}
      <fieldset className="mt-7">
        <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Standort
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {LOCATION_OPTIONS.map((opt) => (
            <LocationCard
              key={opt.value}
              selected={state.preferredLocation === opt.value}
              onClick={() => patch({ preferredLocation: opt.value })}
              title={opt.label}
              body={opt.body}
            />
          ))}
        </div>
      </fieldset>

      {showErrors && (!state.funnelPath || !state.preferredLocation) ? (
        <p className="mt-4 rounded-xl border border-accent-200/60 bg-accent-50/40 px-4 py-2.5 text-[13px] font-medium text-accent-800">
          Bitte beide Optionen wählen.
        </p>
      ) : null}
    </WizardShell>
  );
}

interface PathCardProps {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
}

function PathCard({ selected, onClick, icon, title, body }: PathCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "group relative flex w-full items-start gap-3.5 rounded-2xl border bg-white p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-accent-200 focus:ring-offset-1 sm:p-5",
        selected
          ? "border-accent-300 ring-2 ring-accent-100 shadow-sm"
          : "border-ink/10 hover:border-ink/20 hover:shadow-sm",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors",
          selected
            ? "bg-accent-50 text-accent-700 ring-accent-200"
            : "bg-white text-ink-soft ring-ink/10 group-hover:text-navy-700",
        ].join(" ")}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 pr-7">
        <p
          className="text-[15.5px] font-bold leading-snug text-navy-950"
          style={{ letterSpacing: "-0.01em" }}
        >
          {title}
        </p>
        <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">
          {body}
        </p>
      </div>
      <span
        aria-hidden
        className={[
          "absolute right-4 top-4 inline-flex h-5 w-5 items-center justify-center rounded-full border transition",
          selected
            ? "border-accent-600 bg-accent-600 text-white"
            : "border-ink/15 bg-white",
        ].join(" ")}
      >
        {selected ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="m5 13 4 4L19 7" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

function LocationCard({
  selected,
  onClick,
  title,
  body,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        "group relative flex w-full items-center gap-3 rounded-2xl border bg-white p-3.5 text-left transition focus:outline-none focus:ring-2 focus:ring-accent-200 focus:ring-offset-1",
        selected
          ? "border-accent-300 ring-2 ring-accent-100 shadow-sm"
          : "border-ink/10 hover:border-ink/20 hover:shadow-sm",
      ].join(" ")}
    >
      <span
        className={[
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition",
          selected
            ? "bg-accent-50 text-accent-700 ring-accent-200"
            : "bg-white text-ink-muted ring-ink/10",
        ].join(" ")}
      >
        <PinIcon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-bold leading-tight text-navy-950">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-ink-soft">
          {body}
        </span>
      </span>
    </button>
  );
}
