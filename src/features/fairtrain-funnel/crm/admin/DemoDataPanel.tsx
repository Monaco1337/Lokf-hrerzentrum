"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  reseedDemoData,
  resetDemoData,
  seedDemoData,
} from "@/server/actions/demoData";

interface Props {
  isSeeded: boolean;
  counts: Record<string, number>;
  totalEntries: number;
}

const LABELS: Record<string, string> = {
  User: "Demo-Mitarbeiter",
  Lead: "Demo-Leads",
  CallLog: "Anruf-Einträge",
  Note: "Notizen",
  Document: "Dokumente",
  UploadedFile: "Hochgeladene Dateien",
  CommunicationEvent: "Nachrichten (E-Mail/WhatsApp)",
  StatusHistory: "Statusänderungen",
  AuditLog: "Audit-Einträge",
  ContactInquiry: "Kontaktanfragen",
  Task: "Aufgaben",
  AutomationTemplate: "Nachrichtenvorlagen",
  AutomationLog: "Automations-Protokolle",
  MagicLinkToken: "Bewerberlinks",
};

export function DemoDataPanel({ isSeeded, counts, totalEntries }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);

  const ordered = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  const runSeed = () => {
    startTransition(async () => {
      const res = await seedDemoData();
      if (res.ok) {
        setFeedback({
          kind: "ok",
          text: res.data.reused
            ? `Demo-Daten bereits aktiv (${res.data.created} Einträge).`
            : `Demo-Daten geladen — ${res.data.created} Einträge registriert.`,
        });
        router.refresh();
      } else {
        setFeedback({ kind: "err", text: res.message });
      }
    });
  };

  const runReseed = () => {
    if (
      !window.confirm(
        "Demo-Daten werden auf den Ausgangszustand zurückgesetzt: alle vorhandenen Demo-Einträge werden entfernt und frisch neu erzeugt. Echte Daten bleiben unberührt. Fortfahren?",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await reseedDemoData();
      if (res.ok) {
        setFeedback({
          kind: "ok",
          text: `Demo-Daten zurückgesetzt — ${res.data.created} Einträge neu erzeugt.`,
        });
        router.refresh();
      } else {
        setFeedback({ kind: "err", text: res.message });
      }
    });
  };

  const runRemove = () => {
    if (
      !window.confirm(
        "Alle Demo-Daten werden unwiderruflich entfernt. Echte Leads, Mitarbeiter und Einstellungen bleiben unberührt. Fortfahren?",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await resetDemoData();
      if (res.ok) {
        setFeedback({
          kind: "ok",
          text: `${res.data.removed} Demo-Einträge entfernt.`,
        });
        router.refresh();
      } else {
        setFeedback({ kind: "err", text: res.message });
      }
    });
  };

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-navy-950">Demo-Modus</h2>
          <p className="mt-1 max-w-xl text-[13px] text-ink-soft">
            Erzeugt eine realistische Beispielwelt aus Leads, Mitarbeitern,
            Aufgaben, Nachrichten, Vorlagen, Automationen, Terminen, Uploads und
            Dokumenten — sodass jede CRM-Seite befüllt ist. Alle Demo-Daten sind
            eindeutig markiert
            (<code className="rounded bg-surface-muted px-1 py-0.5 text-[11.5px]">[DEMO]</code>,{" "}
            <code className="rounded bg-surface-muted px-1 py-0.5 text-[11.5px]">isDemo</code>)
            und werden separat registriert. Echte Bewerberdaten werden niemals
            berührt und können nicht mit Demo-Daten vermischt werden.
          </p>
        </div>
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
            isSeeded
              ? "bg-accent-50 text-accent-900 ring-accent-200"
              : "bg-surface-muted text-ink-soft ring-ink/10",
          ].join(" ")}
        >
          <span
            aria-hidden
            className={`h-1.5 w-1.5 rounded-full ${isSeeded ? "bg-accent-600" : "bg-ink-muted/50"}`}
          />
          {isSeeded ? "Demo aktiv" : "Demo inaktiv"}
        </span>
      </div>

      {isSeeded && ordered.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ordered.map(([type, count]) => (
            <li
              key={type}
              className="flex items-center justify-between rounded-lg border border-ink/10 bg-surface-subtle/60 px-3 py-2"
            >
              <span className="text-[12px] text-ink-soft">{LABELS[type] ?? type}</span>
              <span className="text-[13px] font-semibold text-navy-950">
                {count}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={runSeed}
          disabled={pending || isSeeded}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Wird ausgeführt…" : "Demo-Daten laden"}
        </button>
        <button
          type="button"
          onClick={runReseed}
          disabled={pending || !isSeeded}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink-soft shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Demo-Daten zurücksetzen
        </button>
        <button
          type="button"
          onClick={runRemove}
          disabled={pending || !isSeeded}
          className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-3.5 py-1.5 text-[13px] font-medium text-ink-soft shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Demo-Daten entfernen
        </button>
        <span className="text-[11.5px] text-ink-muted">
          {totalEntries > 0
            ? `${totalEntries} registrierte Einträge`
            : "Noch keine Demo-Daten registriert"}
        </span>
      </div>

      {feedback && (
        <p
          className={[
            "mt-4 rounded-lg border px-3 py-2 text-[12.5px]",
            feedback.kind === "ok"
              ? "border-accent-200 bg-accent-50 text-accent-900"
              : "border-rose-200 bg-rose-50 text-rose-700",
          ].join(" ")}
        >
          {feedback.text}
        </p>
      )}
    </section>
  );
}
