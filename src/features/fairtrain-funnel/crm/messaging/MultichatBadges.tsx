"use client";

/**
 * Shared status pills + date formatters for the Multichat work surface. Kept in
 * one place so the conversation list, thread header and action panel all render
 * the exact same vocabulary (Apple-style: soft, rounded, light, green accents).
 */
import {
  EMPLOYMENT_BUCKET_LABEL,
  type EmploymentBucket,
  WORK_STATUS_LABEL,
  WORK_STATUS_TONE,
  type WorkStatus,
} from "@/features/fairtrain-funnel/messaging/types";
import {
  CONTACT_STATE_LABEL,
  CONTACT_STATE_TONE,
  ContactState,
} from "@/features/fairtrain-funnel/contactState";

export const MULTICHAT_TIME = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const MULTICHAT_DATE = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Relative "vor X" label for last activity, falling back to a short date. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then) || then <= 0) return "—";
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `vor ${days} Tg.`;
  return MULTICHAT_DATE.format(new Date(iso));
}

type Tone =
  | "emerald"
  | "amber"
  | "sky"
  | "violet"
  | "rose"
  | "slate"
  | "indigo"
  | "blue"
  | "teal";

const TONE_CLASS: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  rose: "bg-rose-50 text-rose-700 ring-rose-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
};

function Pill({
  tone,
  children,
  dot,
}: {
  tone: Tone;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONE_CLASS[tone]}`}
    >
      {dot ? (
        <span
          aria-hidden
          className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
        />
      ) : null}
      {children}
    </span>
  );
}

/** The single "Bearbeitungsstatus" badge shown on every chat. */
export function WorkStatusPill({ status }: { status: WorkStatus }) {
  return (
    <Pill tone={WORK_STATUS_TONE[status]} dot>
      {WORK_STATUS_LABEL[status]}
    </Pill>
  );
}

const BUCKET_TONE: Record<EmploymentBucket, Tone> = {
  job_seeking: "blue",
  employed: "emerald",
  other: "violet",
};

export function EmploymentBucketPill({ bucket }: { bucket: EmploymentBucket }) {
  return <Pill tone={BUCKET_TONE[bucket]}>{EMPLOYMENT_BUCKET_LABEL[bucket]}</Pill>;
}

export function ContactStatePill({ state }: { state: ContactState }) {
  if (state === ContactState.NONE) return null;
  return (
    <Pill tone={CONTACT_STATE_TONE[state] as Tone}>
      {CONTACT_STATE_LABEL[state]}
    </Pill>
  );
}

export function FunnelPhasePill({
  phase,
  label,
}: {
  phase: string;
  label: string;
}) {
  if (!phase || phase === "none") return null;
  return <Pill tone="indigo">{label}</Pill>;
}
