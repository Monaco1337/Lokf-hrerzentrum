"use client";
/**
 * PortalDocumentsStep — real, high-end drag & drop document upload for the
 * applicant portal.
 *
 * Each checklist item gets its own drop area (drag & drop OR click to browse).
 * Files are uploaded immediately through the token-scoped `uploadPortalDocument`
 * Server Action and stored durably in Postgres. Once a document is uploaded the
 * card flips to a confirmation row with a "Ersetzen" action.
 */
import { useMemo, useState } from "react";

import { uploadPortalDocument } from "@/server/actions/portal";

import { FileDropzone, type UploadedFileRef } from "../components/form/FileDropzone";
import type { PortalContext, PortalDocumentKind } from "../types";

type DocView = NonNullable<PortalContext["documents"]>[number] & {
  fileName?: string | null;
};

export function PortalDocumentsStep({
  token,
  docs,
  completion,
  onUploaded,
}: {
  token: string;
  docs: DocView[];
  completion: number;
  onUploaded: (
    kind: PortalDocumentKind,
    fileName: string | null,
    completionPercent: number,
  ) => void;
}) {
  const [replacing, setReplacing] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 ring-1 ring-brand-100">
        Pflichtunterlagen vollständig: <strong>{completion}%</strong>
      </div>

      {docs.map((d) => {
        const done = d.status === "UPLOADED" || d.status === "APPROVED";
        const isReplacing = replacing[d.kind] ?? false;

        return (
          <div
            key={d.kind}
            className="rounded-xl border border-ink/10 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-ink">
                {d.label}
                {d.required ? (
                  <span className="ml-1 text-rose-500">*</span>
                ) : null}
              </p>
              {done && !isReplacing ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <CheckIcon className="h-3.5 w-3.5" />
                  {d.status === "APPROVED" ? "Freigegeben" : "Hochgeladen"}
                </span>
              ) : null}
            </div>

            {done && !isReplacing ? (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileIcon className="h-5 w-5 shrink-0 text-emerald-600" />
                  <span className="truncate text-sm text-ink">
                    {d.fileName ?? "Dokument hochgeladen"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setReplacing((p) => ({ ...p, [d.kind]: true }))
                  }
                  className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800"
                >
                  Ersetzen
                </button>
              </div>
            ) : (
              <div className="mt-3">
                <DropzoneForKind
                  token={token}
                  kind={d.kind}
                  label={d.label}
                  onUploaded={(fileName, pct) => {
                    setReplacing((p) => ({ ...p, [d.kind]: false }));
                    onUploaded(d.kind, fileName, pct);
                  }}
                />
                {isReplacing ? (
                  <button
                    type="button"
                    onClick={() =>
                      setReplacing((p) => ({ ...p, [d.kind]: false }))
                    }
                    className="mt-2 text-xs font-medium text-ink-muted hover:text-ink"
                  >
                    Abbrechen
                  </button>
                ) : null}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-xs text-ink-muted">
        * Pflichtunterlage. Erlaubt: PDF, PNG, JPG, WEBP · max. 15 MB. Deine
        Dateien werden verschlüsselt und DSGVO-konform gespeichert.
      </p>
    </div>
  );
}

function DropzoneForKind({
  token,
  kind,
  label,
  onUploaded,
}: {
  token: string;
  kind: PortalDocumentKind;
  label: string;
  onUploaded: (fileName: string | null, completionPercent: number) => void;
}) {
  // FileDropzone drives its own uploading/error UI; we don't keep a value list
  // here because a successful upload flips the parent card to the "done" view.
  const uploadHandler = useMemo(
    () =>
      async (file: File): Promise<UploadedFileRef> => {
        const fd = new FormData();
        fd.set("token", token);
        fd.set("kind", kind);
        fd.set("file", file);
        const res = await uploadPortalDocument(fd);
        if (!res.ok) throw new Error(res.message);
        if (!res.data.ok) throw new Error("Upload fehlgeschlagen");
        onUploaded(res.data.fileName ?? file.name, res.data.completionPercent);
        return {
          id: res.data.fileId ?? `${kind}-${Date.now()}`,
          kind: "OTHER",
          originalName: res.data.fileName ?? file.name,
          sizeBytes: file.size,
          mimeType: file.type,
        };
      },
    [token, kind, onUploaded],
  );

  return (
    <FileDropzone
      kind="OTHER"
      values={[]}
      onAdd={() => {}}
      onRemove={() => {}}
      contextLabel={label}
      uploadHandler={uploadHandler}
    />
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function FileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z" />
    </svg>
  );
}
