"use client";
import { useState, useTransition } from "react";

import { scheduleFollowUp } from "@/server/actions/scheduleFollowUp";

export function FollowUpScheduler({
  leadId,
  initialWhen,
}: {
  leadId: string;
  initialWhen: Date | null;
}) {
  const [when, setWhen] = useState<string>(
    initialWhen ? initialWhen.toISOString().slice(0, 16) : "",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(clear: boolean) {
    setError(null);
    startTransition(async () => {
      const iso = clear || !when ? null : new Date(when).toISOString();
      const res = await scheduleFollowUp({ leadId, when: iso });
      if (!res.ok) setError(res.message);
      else if (clear) setWhen("");
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label" htmlFor="followup">Rückrufdatum / Reminder</label>
        <input
          id="followup"
          type="datetime-local"
          className="input"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={() => save(false)}
          disabled={pending || !when}
        >
          {pending ? "Speichern …" : "Speichern"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => save(true)}
          disabled={pending}
        >
          Entfernen
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
