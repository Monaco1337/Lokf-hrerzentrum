"use client";
/**
 * CallLogPanel — document a call against the lead.
 *
 * Top half: outcome picker + note + next-step + optional callback date.
 * Bottom half: chronological list of prior call entries (rendered by
 * CallLogList, server-supplied initial data).
 */
import { useState, useTransition } from "react";

import { logCall } from "@/server/actions/logCall";

import {
  CALL_OUTCOME_LABEL,
  CallOutcome,
  type CallLogEntry,
} from "../../types";

import { CallLogList } from "./CallLogList";

const OUTCOMES: ReadonlyArray<CallOutcome> = [
  CallOutcome.ATTEMPT_NO_ANSWER,
  CallOutcome.TALKED,
  CallOutcome.INTERESTED,
  CallOutcome.NOT_INTERESTED,
  CallOutcome.CALLBACK_SCHEDULED,
  CallOutcome.APPOINTMENT_SET,
  CallOutcome.NOT_ELIGIBLE,
  CallOutcome.CLOSED,
];

export function CallLogPanel({
  leadId,
  initial,
  canTrack,
}: {
  leadId: string;
  initial: ReadonlyArray<CallLogEntry>;
  canTrack: boolean;
}) {
  const [entries, setEntries] = useState<CallLogEntry[]>([...initial]);
  const [outcome, setOutcome] = useState<CallOutcome>(CallOutcome.TALKED);
  const [note, setNote] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [callbackAt, setCallbackAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsCallback =
    outcome === CallOutcome.CALLBACK_SCHEDULED ||
    outcome === CallOutcome.APPOINTMENT_SET;

  function submit() {
    setError(null);
    const callbackIso = callbackAt
      ? new Date(callbackAt).toISOString()
      : "";
    startTransition(async () => {
      const res = await logCall({
        leadId,
        outcome,
        note: note || "",
        nextStep: nextStep || "",
        callbackAt: callbackIso || "",
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      // Optimistically prepend the entry — server already validated.
      const now = new Date();
      const newEntry: CallLogEntry = {
        id: res.data.id,
        leadId,
        user: { id: "me", name: "Du", role: "ADMIN", avatar: null },
        outcome,
        note: note || null,
        nextStep: nextStep || null,
        callbackAt: callbackIso ? new Date(callbackIso) : null,
        durationSeconds: null,
        createdAt: now,
      };
      setEntries((cur) => [newEntry, ...cur]);
      setNote("");
      setNextStep("");
      setCallbackAt("");
    });
  }

  if (!canTrack) {
    return <CallLogList entries={entries} />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2.5">
        <label className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-muted">
          Anrufergebnis
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {OUTCOMES.map((o) => {
            const active = outcome === o;
            return (
              <button
                key={o}
                type="button"
                onClick={() => setOutcome(o)}
                className={[
                  "flex min-h-[38px] min-w-0 items-center rounded-lg border px-2.5 py-1.5 text-left text-[11.5px] font-medium leading-tight transition [overflow-wrap:anywhere] hyphens-auto",
                  active
                    ? "border-brand-600 bg-brand-50 text-brand-900 shadow-sm"
                    : "border-ink/10 bg-white text-ink-soft hover:border-ink/20 hover:text-ink",
                ].join(" ")}
              >
                {CALL_OUTCOME_LABEL[o]}
              </button>
            );
          })}
        </div>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Gesprächsnotiz (optional) — was wurde besprochen?"
        className="input"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          maxLength={500}
          placeholder="Nächster Schritt (optional)"
          className="input"
        />
        <input
          type="datetime-local"
          value={callbackAt}
          onChange={(e) => setCallbackAt(e.target.value)}
          className={["input", needsCallback ? "" : ""].join(" ")}
          aria-label="Rückruftermin"
        />
      </div>
      {error ? (
        <p className="text-[12px] text-danger">{error}</p>
      ) : null}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          onClick={() => submit()}
          className="btn-primary"
        >
          {pending ? "Speichern…" : "Anruf dokumentieren"}
        </button>
      </div>

      <CallLogList entries={entries} />
    </div>
  );
}
