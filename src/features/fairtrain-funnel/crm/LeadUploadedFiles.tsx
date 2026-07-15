"use client";
/**
 * LeadUploadedFiles — high-end gallery of the documents an applicant uploaded.
 *
 * Images render as real thumbnails; PDFs get a document tile. Clicking any file
 * opens the in-browser preview (zoom / print / download) via DocumentViewerModal
 * — no need to leave the page or download first.
 */
import { useState } from "react";

import type { UploadedFileEntry } from "../types";
import { DocumentViewerModal } from "./workspace/DocumentViewerModal";

const KIND_LABEL: Record<string, string> = {
  CV: "Lebenslauf",
  CERTIFICATE: "Zeugnis",
  ID: "Ausweis",
  OTHER: "Sonstiges",
};

function isImage(mimeType: string, name: string): boolean {
  return mimeType.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(name);
}
function isPdf(mimeType: string, name: string): boolean {
  return mimeType === "application/pdf" || /\.pdf$/i.test(name);
}

interface ViewerTarget {
  fileId: string;
  fileName: string;
  mimeType: string | null;
}

export function LeadUploadedFiles({
  files,
}: {
  files: ReadonlyArray<UploadedFileEntry>;
}) {
  const [viewer, setViewer] = useState<ViewerTarget | null>(null);

  if (files.length === 0) {
    return (
      <p className="text-sm text-ink-muted">Noch keine Dateien hochgeladen.</p>
    );
  }

  return (
    <>
      {viewer ? (
        <DocumentViewerModal
          fileId={viewer.fileId}
          fileName={viewer.fileName}
          mimeType={viewer.mimeType}
          onClose={() => setViewer(null)}
        />
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {files.map((f) => {
          const url = `/api/crm/files/${f.id}`;
          const img = isImage(f.mimeType, f.originalName);
          const pdf = isPdf(f.mimeType, f.originalName);
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={() =>
                  setViewer({
                    fileId: f.id,
                    fileName: f.originalName,
                    mimeType: f.mimeType,
                  })
                }
                className="group block w-full overflow-hidden rounded-xl border border-ink/10 bg-white text-left transition hover:border-ink/25 hover:shadow-[0_10px_30px_-16px_rgba(15,23,42,0.25)]"
                title="Vorschau öffnen"
              >
                <div className="relative flex h-36 items-center justify-center overflow-hidden bg-surface-muted">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={f.originalName}
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  ) : (
                    <FileGlyph pdf={pdf} />
                  )}
                  <span className="absolute right-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {pdf ? "PDF" : img ? "Bild" : "Datei"}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent py-2 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Vorschau öffnen
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink" title={f.originalName}>
                      {f.originalName}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-muted">
                      {KIND_LABEL[f.kind] ?? f.kind} · {formatBytes(f.sizeBytes)} ·{" "}
                      {f.uploadedAt.toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <a
                    href={url}
                    download={f.originalName}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 rounded-md border border-ink/10 p-1.5 text-ink-muted transition hover:border-ink/25 hover:text-ink"
                    title="Herunterladen"
                    aria-label="Herunterladen"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                      <path d="M12 3v12" />
                      <path d="m7 10 5 5 5-5" />
                      <path d="M5 21h14" />
                    </svg>
                  </a>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function FileGlyph({ pdf }: { pdf: boolean }) {
  return (
    <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-accent-700 ring-1 ring-accent-100">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        {pdf ? <path d="M8 15h1.5a1.5 1.5 0 0 0 0-3H8v6" /> : null}
      </svg>
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
