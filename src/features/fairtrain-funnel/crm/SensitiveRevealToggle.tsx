"use client";
import { useState, useTransition } from "react";

import { revealSensitive } from "@/server/actions/revealSensitive";

import type { SensitiveAnswersData } from "../types";

export function SensitiveRevealToggle({ leadId }: { leadId: string }) {
  const [data, setData] = useState<SensitiveAnswersData | null | undefined>(
    undefined,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reveal() {
    setError(null);
    startTransition(async () => {
      const res = await revealSensitive({ leadId });
      if (!res.ok) setError(res.message);
      else setData(res.data);
    });
  }

  if (data === undefined) {
    return (
      <div>
        <p className="text-sm text-ink-soft">
          Sensible Eignungsantworten werden nur auf Anforderung angezeigt.
          Jeder Aufruf wird im AuditLog protokolliert.
        </p>
        <button
          type="button"
          className="btn-secondary mt-3"
          onClick={reveal}
          disabled={pending}
        >
          {pending ? "Lade …" : "Sensible Angaben anzeigen"}
        </button>
        {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      </div>
    );
  }

  if (data === null) {
    return (
      <p className="text-sm text-ink-muted">
        Keine sensiblen Angaben vorhanden.
      </p>
    );
  }

  return (
    <dl className="space-y-1 text-sm">
      <Row label="MPU-Thema" value={data.hasMpuIssue ? "Ja" : "Nein"} />
      <Row label="Ausschlussgründe" value={data.hasDrugIssue ? "Ja" : "Nein"} />
      {data.notesSensitive ? (
        <Row label="Hinweis" value={data.notesSensitive} />
      ) : null}
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-40 text-ink-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
