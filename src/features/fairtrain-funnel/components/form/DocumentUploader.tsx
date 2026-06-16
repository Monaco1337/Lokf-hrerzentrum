"use client";
/**
 * DocumentUploader - geführter Premium-Upload-Assistent.
 *
 * Ablauf:
 *   1. Nutzer wählt zuerst die Kategorie (Lebenslauf, Ausweis, Zeugnisse,
 *      Sonstiges) über große Cards.
 *   2. Erst danach wird die Dropzone aktiv und nimmt den `kind` an.
 *   3. Hochgeladene Dateien erscheinen unter der gewählten Kategorie.
 *
 * Vor Auswahl bleibt die Drop-Area passiv (sichtbar, aber deaktiviert), damit
 * der Nutzer den Flow visuell vorab erkennt.
 */
import { useState } from "react";

import {
  UploadedFileKind,
  type UploadedFileKind as UploadedFileKindT,
} from "../../types";
import { FileDropzone, type UploadedFileRef } from "./FileDropzone";

interface CategoryDef {
  kind: UploadedFileKindT;
  label: string;
  /** Short helper shown inside the active dropzone. */
  hint: string;
  icon: React.ReactNode;
}

const CATEGORIES: ReadonlyArray<CategoryDef> = [
  {
    kind: UploadedFileKind.CV,
    label: "Lebenslauf",
    hint: "Dein aktueller oder alter Lebenslauf.",
    icon: <FileTextIcon className="h-5 w-5" />,
  },
  {
    kind: UploadedFileKind.ID,
    label: "Ausweis",
    hint: "Personalausweis oder Reisepass.",
    icon: <IdIcon className="h-5 w-5" />,
  },
  {
    kind: UploadedFileKind.CERTIFICATE,
    label: "Zeugnisse & Nachweise",
    hint: "Schul-, Arbeits-, Sprachzeugnisse oder Bescheinigungen.",
    icon: <CertificateIcon className="h-5 w-5" />,
  },
  {
    kind: UploadedFileKind.OTHER,
    label: "Sonstige Unterlagen",
    hint: "Alles andere, was für deine Bewerbung helfen kann.",
    icon: <FolderIcon className="h-5 w-5" />,
  },
];

export interface DocumentUploaderProps {
  leadDraftId: string;
  values: ReadonlyArray<UploadedFileRef>;
  onAdd: (ref: UploadedFileRef) => void;
  onRemove: (id: string) => void;
}

export function DocumentUploader({
  leadDraftId,
  values,
  onAdd,
  onRemove,
}: DocumentUploaderProps) {
  const [selected, setSelected] = useState<UploadedFileKindT | null>(null);
  const active = selected
    ? CATEGORIES.find((c) => c.kind === selected) ?? null
    : null;

  // Files of the currently active category — keeps the dropzone's list focused.
  const valuesForActive = active
    ? values.filter((v) => v.kind === active.kind)
    : [];

  return (
    <div className="space-y-5">
      {/* Step 1 — Kategorie wählen */}
      <div>
        <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          <StepDot>1</StepDot>
          Kategorie wählen
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => {
            const isSelected = selected === c.kind;
            const count = values.filter((v) => v.kind === c.kind).length;
            return (
              <button
                key={c.kind}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelected(c.kind)}
                className={[
                  "group relative flex w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3.5 text-left transition focus:outline-none focus:ring-2 focus:ring-accent-200 focus:ring-offset-1",
                  isSelected
                    ? "border-accent-300 ring-2 ring-accent-100 shadow-sm"
                    : "border-ink/10 hover:border-ink/20 hover:shadow-sm",
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition-colors",
                    isSelected
                      ? "bg-accent-50 text-accent-700 ring-accent-200"
                      : "bg-white text-ink-soft ring-ink/10",
                  ].join(" ")}
                >
                  {c.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold leading-tight text-navy-950">
                    {c.label}
                  </span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">
                    {c.hint}
                  </span>
                </span>
                {count > 0 ? (
                  <span className="inline-flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2 — Datei hochladen */}
      <div>
        <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          <StepDot>2</StepDot>
          Datei hochladen
        </p>

        {active ? (
          <FileDropzone
            leadDraftId={leadDraftId}
            kind={active.kind}
            contextLabel={active.label}
            values={valuesForActive}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ) : (
          <PassiveDropPlaceholder />
        )}
      </div>

      {/* Übersicht über alle Uploads aller Kategorien */}
      {values.length > 0 ? <UploadSummary values={values} /> : null}
    </div>
  );
}

function StepDot({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent-600 text-[10px] font-bold text-white">
      {children}
    </span>
  );
}

function PassiveDropPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 bg-surface-subtle/40 px-6 py-10 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-ink-muted shadow-sm ring-1 ring-ink/10">
        <LockIcon className="h-4 w-4" />
      </span>
      <p className="text-[13.5px] font-medium text-ink-muted">
        Wähle oben eine Kategorie.
      </p>
    </div>
  );
}

function UploadSummary({
  values,
}: {
  values: ReadonlyArray<UploadedFileRef>;
}) {
  return (
    <p className="rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-3.5 py-2.5 text-[12.5px] font-medium text-emerald-900">
      {values.length} {values.length === 1 ? "Datei" : "Dateien"} hochgeladen
    </p>
  );
}

// ---- icons ----------------------------------------------------------------

function FileTextIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </svg>
  );
}

function IdIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="12" r="2.2" />
      <path d="M14 10h5M14 14h5M5 17h8" />
    </svg>
  );
}

function CertificateIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="9" r="5" />
      <path d="m8.5 13-1.5 7 5-3 5 3-1.5-7" />
    </svg>
  );
}

function FolderIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
