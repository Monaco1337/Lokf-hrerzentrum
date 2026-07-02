"use client";
/**
 * Batch "Erstkontakt per E-Mail" — lets an operator select existing leads and
 * send the transactional upload-request email to all of them at once. Already
 * contacted leads are skipped server-side.
 */
import { useMemo, useState, useTransition } from "react";

import { sendFirstContactBatch } from "@/server/actions/firstContact";

export interface BatchLead {
  id: string;
  name: string;
  email: string | null;
}

interface Props {
  open: boolean;
  leads: ReadonlyArray<BatchLead>;
  onClose: () => void;
}

export function BatchFirstContactModal({ open, leads, onClose }: Props) {
  const contactable = useMemo(
    () => leads.filter((l) => Boolean(l.email && l.email.includes("@"))),
    [leads],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { sent: number; skipped: number; failed: number } | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const allSelected =
    contactable.length > 0 && selected.size === contactable.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === contactable.length
        ? new Set()
        : new Set(contactable.map((l) => l.id)),
    );
  }

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await sendFirstContactBatch({ leadIds: [...selected] });
      if (!res.ok) {
        setError(res.message);
        setConfirming(false);
        return;
      }
      setResult(res.data);
      setConfirming(false);
      setSelected(new Set());
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-ink/[0.07] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-navy-950">
              Erstkontakt an ausgewählte Leads
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Nur Leads mit gültiger E-Mail. Bereits kontaktierte Leads werden
              übersprungen.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-ink-muted transition hover:bg-surface-subtle hover:text-ink"
            aria-label="Schließen"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        {result ? (
          <div className="space-y-4 px-5 py-6">
            <p className="text-sm text-ink">
              Versand abgeschlossen.
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <ResultTile label="Gesendet" value={result.sent} tone="emerald" />
              <ResultTile label="Übersprungen" value={result.skipped} tone="slate" />
              <ResultTile label="Fehler" value={result.failed} tone="red" />
            </div>
            <div className="flex justify-end">
              <button type="button" className="btn-primary h-10 px-4" onClick={onClose}>
                Schließen
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-ink/[0.06] px-5 py-2.5">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-ink/20"
                  disabled={contactable.length === 0}
                />
                Alle auswählen ({contactable.length})
              </label>
              <span className="text-xs font-medium text-ink-muted">
                {selected.size} ausgewählt
              </span>
            </div>

            <ul className="flex-1 overflow-y-auto px-2 py-2">
              {contactable.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-ink-muted">
                  Keine Leads mit gültiger E-Mail in der aktuellen Ansicht.
                </li>
              ) : (
                contactable.map((l) => (
                  <li key={l.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-surface-subtle">
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggle(l.id)}
                        className="rounded border-ink/20"
                      />
                      <span className="flex-1 truncate font-medium text-ink">
                        {l.name}
                      </span>
                      <span className="truncate text-xs text-ink-muted">
                        {l.email}
                      </span>
                    </label>
                  </li>
                ))
              )}
            </ul>

            {error ? (
              <p className="px-5 py-2 text-sm text-danger">{error}</p>
            ) : null}

            <footer className="border-t border-ink/[0.07] px-5 py-3">
              {confirming ? (
                <div className="space-y-3">
                  <p className="text-sm text-ink">
                    Es werden {selected.size} Leads kontaktiert. Bereits
                    kontaktierte Leads werden übersprungen.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="h-10 rounded-xl border border-ink/10 px-4 text-sm font-medium text-ink transition hover:bg-surface-subtle"
                      onClick={() => setConfirming(false)}
                      disabled={pending}
                    >
                      Abbrechen
                    </button>
                    <button
                      type="button"
                      className="btn-primary h-10 px-4"
                      onClick={run}
                      disabled={pending}
                    >
                      {pending ? "Wird gesendet…" : "Jetzt senden"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="btn-primary h-10 px-4 disabled:opacity-50"
                    disabled={selected.size === 0}
                    onClick={() => setConfirming(true)}
                  >
                    Erstkontakt an {selected.size} senden
                  </button>
                </div>
              )}
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function ResultTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "slate" | "red";
}) {
  const styles = {
    emerald: "bg-emerald-50 text-emerald-700",
    slate: "bg-surface-subtle text-ink-soft",
    red: "bg-red-50 text-red-700",
  }[tone];
  return (
    <div className={["rounded-xl px-3 py-3", styles].join(" ")}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}
