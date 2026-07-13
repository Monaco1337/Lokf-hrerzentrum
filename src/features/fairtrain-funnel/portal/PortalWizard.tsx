"use client";
/**
 * Applicant self-service wizard (public). Token-scoped: every persisting call
 * sends only the opaque token + form values — never a lead id. Document uploads
 * go through the real, durable upload pipeline (see PortalDocumentsStep).
 */
import { useState, useTransition } from "react";

import {
  type PortalContext,
  type PortalDocumentStatus,
  type PortalFormValues,
} from "../types";
import { savePortalForm, submitPortalForm } from "@/server/actions/portal";
import {
  AGENCY_OPTIONS,
  EMPLOYMENT_OPTIONS,
  SelectField,
  TextAreaField,
  TextField,
  YesNoField,
} from "./PortalFields";
import { PortalDocumentsStep } from "./PortalDocumentsStep";

type DocView = NonNullable<PortalContext["documents"]>[number] & {
  fileName?: string | null;
};

const STEPS: ReadonlyArray<{ title: string; subtitle: string }> = [
  { title: "Willkommen", subtitle: "Dein persönlicher Bewerberbereich" },
  { title: "Persönliche Daten", subtitle: "Wie heißt du?" },
  { title: "Kontakt & Verfügbarkeit", subtitle: "Wie erreichen wir dich?" },
  { title: "Förderstatus", subtitle: "Agentur für Arbeit / Jobcenter" },
  { title: "Qualifikation", subtitle: "Führerschein & Hinweise" },
  { title: "Dokumente", subtitle: "Lade deine Unterlagen hoch" },
  { title: "Prüfung & Absenden", subtitle: "Bitte kontrolliere deine Angaben" },
  { title: "Geschafft", subtitle: "Vielen Dank!" },
];

export function PortalWizard({
  token,
  context,
}: {
  token: string;
  context: PortalContext;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<PortalFormValues>(context.form ?? {});
  const [docs, setDocs] = useState<DocView[]>(context.documents ?? []);
  const [completion, setCompletion] = useState(context.completionPercent ?? 0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof PortalFormValues>(k: K, v: PortalFormValues[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const str = (k: keyof PortalFormValues) => (form[k] as string | undefined) ?? "";

  const persist = () =>
    new Promise<void>((resolve) => {
      startTransition(async () => {
        await savePortalForm({ token, form });
        resolve();
      });
    });

  const goNext = async () => {
    setError(null);
    if (step >= 1 && step <= 4) await persist();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const markUploaded = (kind: DocView["kind"], fileName: string | null) =>
    setDocs((ds) =>
      ds.map((d) =>
        d.kind === kind
          ? { ...d, status: "UPLOADED" as PortalDocumentStatus, fileName }
          : d,
      ),
    );

  const submit = () =>
    startTransition(async () => {
      const res = await submitPortalForm({ token, form });
      if (res.ok && res.data.ok) {
        setCompletion(res.data.completionPercent);
        setStep(STEPS.length - 1);
      } else {
        setError("Absenden fehlgeschlagen. Bitte versuche es erneut.");
      }
    });

  const meta = STEPS[step]!;
  const isSuccess = step === STEPS.length - 1;
  const progress = Math.round((step / (STEPS.length - 2)) * 100);

  return (
    <div className="mx-auto max-w-xl">
      {!isSuccess ? (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-medium text-ink-muted">
            <span>
              Schritt {step + 1} von {STEPS.length - 1}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-300"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="card p-6 sm:p-8">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
            {meta.subtitle}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            {meta.title}
          </h1>
        </header>

        <div className="space-y-4">{renderStep()}</div>

        {error ? (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">
            {error}
          </p>
        ) : null}

        {!isSuccess ? (
          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0 || pending}
              className="btn-secondary disabled:opacity-40"
            >
              Zurück
            </button>
            {step === 6 ? (
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="btn-primary"
              >
                {pending ? "Wird gesendet…" : "Verbindlich absenden"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={pending}
                className="btn-primary"
              >
                {step === 0 ? "Jetzt starten" : "Weiter"}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4 text-sm text-ink-soft">
            <p>
              Schön, dass du dabei bist. In wenigen Schritten vervollständigst du
              deine Angaben und Unterlagen für deine geförderte
              Lokführer-Weiterbildung.
            </p>
            <ul className="space-y-2">
              {[
                "Deine Daten werden sicher und DSGVO-konform verarbeitet.",
                "Du kannst jederzeit pausieren – dein Fortschritt wird gespeichert.",
                "Es dauert nur wenige Minuten.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <span className="mt-0.5 text-brand-600">✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      case 1:
        return (
          <>
            <TextField label="Vorname" value={str("firstName")} onChange={(v) => set("firstName", v)} />
            <TextField label="Nachname" value={str("lastName")} onChange={(v) => set("lastName", v)} />
          </>
        );
      case 2:
        return (
          <>
            <TextField label="Telefon" value={str("phone")} onChange={(v) => set("phone", v)} type="tel" inputMode="tel" />
            <TextField label="E-Mail" value={str("email")} onChange={(v) => set("email", v)} type="email" inputMode="email" />
            <TextField label="Wohnort" value={str("city")} onChange={(v) => set("city", v)} />
            <TextField
              label="Verfügbarkeit"
              value={str("availability")}
              onChange={(v) => set("availability", v)}
              placeholder="z. B. ab sofort, ab 01.09."
              hint="Wann könntest du mit der Weiterbildung starten?"
            />
          </>
        );
      case 3:
        return (
          <>
            <SelectField
              label="Aktuelle Situation"
              value={str("currentEmploymentStatus")}
              onChange={(v) => set("currentEmploymentStatus", v)}
              options={EMPLOYMENT_OPTIONS}
            />
            <SelectField
              label="Zuständige Stelle"
              value={str("agencyStatus")}
              onChange={(v) => set("agencyStatus", v)}
              options={AGENCY_OPTIONS}
              hint="Wer betreut dich aktuell?"
            />
            <YesNoField
              label="Hast du bereits einen Bildungsgutschein?"
              value={form.hasEducationVoucher}
              onChange={(v) => set("hasEducationVoucher", v)}
            />
          </>
        );
      case 4:
        return (
          <>
            <YesNoField
              label="Hast du einen Führerschein (PKW)?"
              value={form.hasDrivingLicense}
              onChange={(v) => set("hasDrivingLicense", v)}
            />
            <TextAreaField
              label="Hinweise (optional)"
              value={str("notes")}
              onChange={(v) => set("notes", v)}
              placeholder="z. B. Vorerfahrung, Wünsche, offene Fragen"
            />
          </>
        );
      case 5:
        return (
          <PortalDocumentsStep
            token={token}
            docs={docs}
            completion={completion}
            onUploaded={(kind, fileName, pct) => {
              markUploaded(kind, fileName);
              setCompletion(pct);
            }}
          />
        );
      case 6:
        return <ReviewStep form={form} docs={docs} completion={completion} />;
      case 7:
        return (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-ink-soft">
              Vielen Dank! Deine Angaben wurden erfolgreich übermittelt. Dein
              Ansprechpartner meldet sich in Kürze bei dir und prüft deine
              Unterlagen.
            </p>
          </div>
        );
      default:
        return null;
    }
  }
}

function ReviewStep({
  form,
  docs,
  completion,
}: {
  form: PortalFormValues;
  docs: DocView[];
  completion: number;
}) {
  const rows: ReadonlyArray<[string, string]> = [
    ["Name", `${form.firstName ?? ""} ${form.lastName ?? ""}`.trim() || "—"],
    ["Telefon", form.phone || "—"],
    ["E-Mail", form.email || "—"],
    ["Wohnort", form.city || "—"],
    ["Verfügbarkeit", form.availability || "—"],
    ["Zuständige Stelle", form.agencyStatus || "—"],
    ["Bildungsgutschein", form.hasEducationVoucher ? "Ja" : "Nein"],
    ["Führerschein", form.hasDrivingLicense ? "Ja" : "Nein"],
  ];
  const uploaded = docs.filter(
    (d) => d.status === "UPLOADED" || d.status === "APPROVED",
  ).length;
  return (
    <div className="space-y-4">
      <dl className="divide-y divide-ink/5 rounded-xl border border-ink/10">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="text-sm text-ink-muted">{k}</dt>
            <dd className="text-right text-sm font-medium text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-ink-soft">
        Hochgeladene Dokumente: <strong>{uploaded}</strong> · Pflichtunterlagen{" "}
        <strong>{completion}%</strong>
      </div>
      {form.notes ? (
        <div className="rounded-xl border border-ink/10 px-4 py-3 text-sm text-ink-soft">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
            Hinweise
          </span>
          <p className="mt-1">{form.notes}</p>
        </div>
      ) : null}
    </div>
  );
}
