"use client";
/**
 * Guided "next step" workflow card for a lead.
 *
 * Replaces the bare status dropdown with a clear recommendation: what to do
 * next, a one-click primary action that advances the status, and a tucked-away
 * list of alternative transitions for edge cases. Speaks plain German only.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateLeadStatus } from "@/server/actions/updateLeadStatus";

import { allowedNextStatuses } from "../statusMachine";
import type { LeadStatus as LeadStatusT } from "../types";
import { STATUS_TONE, WORKFLOW, statusLabel, type WorkflowTone } from "./leadLabels";

interface Props {
  leadId: string;
  currentStatus: LeadStatusT;
  emailSent: boolean;
  whatsappSent: boolean;
}

const TONE_STYLE: Record<
  WorkflowTone,
  { band: string; chip: string; btn: string; ring: string }
> = {
  urgent: {
    band: "from-accent-600 to-accent-500",
    chip: "bg-accent-50 text-accent-700 ring-accent-100",
    btn: "bg-accent-600 hover:bg-accent-700",
    ring: "ring-accent-100",
  },
  active: {
    band: "from-brand-600 to-brand-500",
    chip: "bg-brand-50 text-brand-700 ring-brand-100",
    btn: "bg-brand-600 hover:bg-brand-700",
    ring: "ring-brand-100",
  },
  wait: {
    band: "from-amber-500 to-amber-400",
    chip: "bg-amber-50 text-amber-800 ring-amber-100",
    btn: "bg-amber-600 hover:bg-amber-700",
    ring: "ring-amber-100",
  },
  done: {
    band: "from-emerald-600 to-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    btn: "bg-emerald-600 hover:bg-emerald-700",
    ring: "ring-emerald-100",
  },
  stopped: {
    band: "from-slate-500 to-slate-400",
    chip: "bg-slate-100 text-slate-600 ring-slate-200",
    btn: "bg-slate-600 hover:bg-slate-700",
    ring: "ring-slate-200",
  },
};

export function NextStep({ leadId, currentStatus, emailSent, whatsappSent }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [reason, setReason] = useState("");

  const step = WORKFLOW[currentStatus];
  const tone = TONE_STYLE[step.tone];
  const options = allowedNextStatuses(currentStatus);
  const others = options.filter((o) => o !== step.next);

  function setStatus(to: LeadStatusT, withReason: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await updateLeadStatus({ leadId, toStatus: to, reason: withReason });
      if (!res.ok) setError(res.message);
      else {
        setReason("");
        setShowMore(false);
        router.refresh();
      }
    });
  }

  return (
    <div className={["overflow-hidden rounded-2xl bg-white shadow-premium ring-1", tone.ring].join(" ")}>
      <div className={["h-1.5 bg-gradient-to-r", tone.band].join(" ")} />
      <div className="p-5">
        <div className="flex items-center gap-2">
          <span className={["inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ring-1", tone.chip].join(" ")}>
            Nächster Schritt
          </span>
        </div>
        <h3 className="mt-3 font-display text-lg font-bold tracking-tight text-navy-950">
          {step.headline}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{step.hint}</p>

        {(emailSent || whatsappSent) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {emailSent && <DoneChip label="Begrüßungs-E-Mail versendet" />}
            {whatsappSent && <DoneChip label="WhatsApp versendet" />}
          </div>
        )}

        {step.next ? (
          <button
            type="button"
            onClick={() => setStatus(step.next as LeadStatusT, null)}
            disabled={pending}
            className={[
              "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-card transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0",
              tone.btn,
            ].join(" ")}
          >
            {pending ? "Wird gespeichert …" : step.action}
            {!pending && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        ) : (
          <p className="mt-4 rounded-xl bg-surface-subtle px-4 py-3 text-sm text-ink-muted">
            Endzustand erreicht – keine weiteren Schritte nötig.
          </p>
        )}

        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

        {others.length > 0 && (
          <div className="mt-4 border-t border-ink/5 pt-3">
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="flex w-full items-center justify-between text-[13px] font-medium text-ink-soft transition hover:text-ink"
            >
              <span>Anderer Status</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={["h-4 w-4 transition-transform", showMore ? "rotate-180" : ""].join(" ")}
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {showMore && (
              <div className="mt-3 space-y-3">
                <input
                  className="input"
                  placeholder="Begründung (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {others.map((o) => (
                    <button
                      key={o}
                      type="button"
                      disabled={pending}
                      onClick={() => setStatus(o, reason.trim() || null)}
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition hover:-translate-y-0.5 disabled:opacity-60",
                        STATUS_TONE[o].pill,
                      ].join(" ")}
                    >
                      <span className={["h-1.5 w-1.5 rounded-full", STATUS_TONE[o].dot].join(" ")} />
                      {statusLabel(o)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DoneChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-medium text-emerald-700 ring-1 ring-emerald-100">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {label}
    </span>
  );
}
