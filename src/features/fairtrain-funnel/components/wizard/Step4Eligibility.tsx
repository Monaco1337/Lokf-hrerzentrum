"use client";
/**
 * Step 4 — Agentur & Dokumente
 *
 * UNEMPLOYED: zeigt Agentur-Block + Dokumenten-Upload.
 * EMPLOYED:   zeigt nur den Dokumenten-Upload.
 *
 * Alle Eingaben sind optional. Lebenslauf-/Interview-Felder werden bewusst
 * NICHT mehr abgefragt: Fairtrain erstellt den Lebenslauf nach dem ersten
 * Kontakt selbst, damit der Funnel hier nicht ausgebremst wird.
 */
import { FunnelPath } from "../../types";
import { DocumentUploader } from "../form/DocumentUploader";
import { Field } from "../form/Field";
import { TextInput } from "../form/Inputs";
import { ArrowRightIcon } from "../landing/icons";
import { WizardShell } from "./WizardShell";
import { STEP_TITLES, TOTAL_STEPS } from "./constants";
import type { StepProps } from "./types";

export function Step4Eligibility({ state, patch, onNext, onPrev }: StepProps) {
  const isUnemployed = state.funnelPath === FunnelPath.UNEMPLOYED;

  function submit() {
    onNext();
  }

  return (
    <WizardShell
      step={3}
      total={TOTAL_STEPS}
      titles={STEP_TITLES}
      title={isUnemployed ? "Agentur & Dokumente" : "Dokumente"}
      description={
        isUnemployed
          ? "Für deinen Antrag bei der Agentur für Arbeit. Alles optional – du kannst es später per Magic-Link nachreichen."
          : "Optional – du kannst Dokumente auch später nachreichen."
      }
      footer={
        <>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:text-ink"
            onClick={onPrev}
          >
            Zurück
          </button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
            <button
              type="button"
              onClick={submit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-5 py-3 text-sm font-semibold text-ink-soft shadow-sm transition hover:border-ink/20 hover:text-ink sm:w-auto"
            >
              Überspringen
            </button>
            <button
              type="button"
              onClick={submit}
              className="btn-cta-lg w-full justify-center sm:w-auto"
            >
              Weiter
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </>
      }
    >
      {isUnemployed ? (
        <>
          <SectionTitle>Agentur für Arbeit</SectionTitle>
          <div className="grid gap-x-5 gap-y-5 md:grid-cols-2">
            <Field
              id="agencyCity"
              label="Zuständige Agentur"
              optional
              helper={`z. B. "Jobcenter Berlin Mitte".`}
            >
              <TextInput
                id="agencyCity"
                placeholder="Jobcenter…"
                value={state.agencyCity}
                onChange={(e) => patch({ agencyCity: e.target.value })}
              />
            </Field>
            <Field
              id="agencyCustomerNumber"
              label="BG-/Kundennummer"
              optional
              helper="Findest du im Bescheid."
            >
              <TextInput
                id="agencyCustomerNumber"
                placeholder="z. B. 1234A56789"
                value={state.agencyCustomerNumber}
                onChange={(e) =>
                  patch({ agencyCustomerNumber: e.target.value })
                }
              />
            </Field>
            <Field
              id="agencyCaseWorker"
              label="Sachbearbeiter (für Vollmacht)"
              optional
              colSpan={2}
            >
              <TextInput
                id="agencyCaseWorker"
                placeholder="Vorname Nachname"
                value={state.agencyCaseWorker}
                onChange={(e) => patch({ agencyCaseWorker: e.target.value })}
              />
            </Field>
          </div>
          <Divider />
        </>
      ) : null}

      <SectionTitle>Dokumente</SectionTitle>
      <p className="mb-5 max-w-2xl text-[13.5px] leading-relaxed text-ink-soft">
        Erst Kategorie wählen, dann Datei hochladen.
        <span className="block text-ink-muted">
          Keine Dokumente zur Hand? Kein Problem – du kannst diesen Schritt
          überspringen.
        </span>
      </p>

      <DocumentUploader
        leadDraftId={state.draftId}
        values={state.uploadedFiles}
        onAdd={(ref) =>
          patch({ uploadedFiles: [...state.uploadedFiles, ref] })
        }
        onRemove={(id) =>
          patch({
            uploadedFiles: state.uploadedFiles.filter((f) => f.id !== id),
          })
        }
      />
    </WizardShell>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-navy-900">
      {children}
    </h3>
  );
}

function Divider() {
  return <hr className="my-8 border-ink/5" />;
}
