"use client";
/**
 * Single row in the FileDropzone's uploaded-files list. Kept in its own file
 * so the parent dropzone stays under the line-count budget.
 */
import { FileTextIcon } from "../landing/icons";

export interface FileRowProps {
  name: string;
  sizeBytes: number;
  mimeType: string;
  status: "uploading" | "done" | "error";
  error?: string;
  onRemove?: () => void;
}

export function FileRow({
  name,
  sizeBytes,
  mimeType,
  status,
  error,
  onRemove,
}: FileRowProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
      <span
        aria-hidden
        className={[
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 transition",
          status === "done"
            ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
            : status === "uploading"
              ? "bg-accent-50 text-accent-600 ring-accent-100"
              : "bg-accent-50 text-accent-700 ring-accent-200",
        ].join(" ")}
      >
        <FileTextIcon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className="truncate text-[14px] font-semibold text-navy-950"
          title={name}
        >
          {name}
        </p>
        <p className="text-[12px] text-ink-muted">
          {formatBytes(sizeBytes)}
          {mimeType ? ` · ${mimeLabel(mimeType)}` : null}
        </p>
        {status === "error" && error ? (
          <p className="mt-1 text-[12px] font-medium text-accent-700">
            {error}
          </p>
        ) : null}
      </div>

      {status === "uploading" ? (
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
          <Spinner /> Wird hochgeladen…
        </span>
      ) : null}

      {status === "done" ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-100">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
          >
            <path d="m5 13 4 4L19 7" />
          </svg>
          Hochgeladen
        </span>
      ) : null}

      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="ml-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-subtle hover:text-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-200"
          aria-label={`${name} entfernen`}
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="m19 6-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mimeLabel(mime: string): string {
  switch (mime) {
    case "application/pdf":
      return "PDF";
    case "image/png":
      return "PNG";
    case "image/jpeg":
      return "JPG";
    case "image/webp":
      return "WEBP";
    default:
      return mime.split("/")[1]?.toUpperCase() ?? mime;
  }
}

function Spinner() {
  return (
    <svg
      aria-hidden
      className="h-3.5 w-3.5 animate-spin text-accent-600"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeOpacity={0.2}
        strokeWidth={3}
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
      />
    </svg>
  );
}
