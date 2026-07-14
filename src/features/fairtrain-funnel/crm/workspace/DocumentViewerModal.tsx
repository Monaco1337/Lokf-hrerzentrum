"use client";
/**
 * DocumentViewerModal — in-browser preview for an uploaded applicant document.
 *
 * - PDFs render in an embedded viewer (native browser controls + our print).
 * - Images render with zoom in/out/reset.
 * - Download and Print work for both.
 *
 * Bytes are streamed from the authenticated CRM route `/api/crm/files/[id]`,
 * so nothing is inlined and no public URL is ever exposed.
 */
import { useEffect, useRef, useState } from "react";

export interface DocumentViewerModalProps {
  fileId: string;
  fileName: string;
  mimeType: string | null;
  onClose: () => void;
}

function isImageFile(mimeType: string | null, fileName: string): boolean {
  if (mimeType) return mimeType.startsWith("image/");
  return /\.(png|jpe?g|webp|gif)$/i.test(fileName);
}

function isPdfFile(mimeType: string | null, fileName: string): boolean {
  if (mimeType) return mimeType === "application/pdf";
  return /\.pdf$/i.test(fileName);
}

export function DocumentViewerModal({
  fileId,
  fileName,
  mimeType,
  onClose,
}: DocumentViewerModalProps) {
  const url = `/api/crm/files/${fileId}`;
  const isImage = isImageFile(mimeType, fileName);
  const isPdf = isPdfFile(mimeType, fileName);
  const [zoom, setZoom] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const print = () => {
    if (isPdf) {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
      return;
    }
    // Image (or unknown): open a print-ready window.
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(
      `<html><head><title>${fileName}</title><style>@media print{@page{margin:12mm;}}img{max-width:100%;}</style></head><body onload="window.print();window.close();"><img src="${url}" /></body></html>`,
    );
    w.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Vorschau ${fileName}`}
    >
      <div
        className="flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-ink/10 bg-surface-muted px-4 py-3">
          <p className="truncate text-sm font-semibold text-ink" title={fileName}>
            {fileName}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {isImage ? (
              <>
                <button
                  type="button"
                  className="rounded-lg border border-ink/15 px-2 py-1 text-sm text-ink hover:bg-ink/5"
                  onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                  aria-label="Verkleinern"
                >
                  −
                </button>
                <span className="w-12 text-center text-xs tabular-nums text-ink-muted">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  className="rounded-lg border border-ink/15 px-2 py-1 text-sm text-ink hover:bg-ink/5"
                  onClick={() => setZoom((z) => Math.min(5, z + 0.25))}
                  aria-label="Vergrößern"
                >
                  +
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-ink/15 px-2 py-1 text-xs text-ink hover:bg-ink/5"
                  onClick={() => setZoom(1)}
                >
                  Reset
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="rounded-lg border border-ink/15 px-3 py-1 text-sm text-ink hover:bg-ink/5"
              onClick={print}
            >
              Drucken
            </button>
            <a
              className="rounded-lg border border-ink/15 px-3 py-1 text-sm text-ink hover:bg-ink/5"
              href={url}
              download={fileName}
            >
              Download
            </a>
            <a
              className="rounded-lg border border-ink/15 px-3 py-1 text-sm text-ink hover:bg-ink/5"
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              Neuer Tab
            </a>
            <button
              type="button"
              className="rounded-lg bg-ink px-3 py-1 text-sm font-semibold text-white hover:bg-ink/90"
              onClick={onClose}
            >
              Schließen
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100">
          {isPdf ? (
            <iframe
              ref={iframeRef}
              src={url}
              title={fileName}
              className="h-full w-full"
            />
          ) : isImage ? (
            <div className="flex min-h-full items-start justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={fileName}
                style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                className="max-w-full transition-transform"
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-ink-muted">
                Für diesen Dateityp ist keine Vorschau verfügbar.
              </p>
              <a className="btn-primary" href={url} download={fileName}>
                Datei herunterladen
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
