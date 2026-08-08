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
  emerald: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25",
  amber: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  sky: "bg-sky-500/15 text-sky-300 ring-sky-500/25",
  violet: "bg-violet-500/15 text-violet-300 ring-violet-500/25",
  rose: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  slate: "bg-white/[0.06] text-[#aab4ae] ring-white/[0.1]",
  indigo: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/25",
  blue: "bg-blue-500/15 text-blue-300 ring-blue-500/25",
  teal: "bg-teal-500/15 text-teal-300 ring-teal-500/25",
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
