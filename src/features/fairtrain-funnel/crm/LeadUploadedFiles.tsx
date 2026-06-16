import type { UploadedFileEntry } from "../types";

const KIND_LABEL: Record<string, string> = {
  CV: "Lebenslauf",
  CERTIFICATE: "Zeugnis",
  ID: "Ausweis",
  OTHER: "Sonstiges",
};

const MIME_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "image/webp": "WEBP",
};

export function LeadUploadedFiles({
  files,
}: {
  files: ReadonlyArray<UploadedFileEntry>;
}) {
  if (files.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        Noch keine Dateien hochgeladen.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-ink/5 overflow-hidden rounded-xl border border-ink/10">
      {files.map((f) => (
        <li
          key={f.id}
          className="flex flex-wrap items-center gap-3 bg-white px-4 py-3"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-50 text-accent-700 ring-1 ring-accent-100">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
            </svg>
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink" title={f.originalName}>
              {f.originalName}
            </p>
            <p className="text-xs text-ink-muted">
              {KIND_LABEL[f.kind] ?? f.kind} · {formatBytes(f.sizeBytes)} ·{" "}
              {MIME_LABEL[f.mimeType] ?? f.mimeType}
              {" · "}
              {f.uploadedAt.toLocaleString("de-DE")}
            </p>
          </div>

          <a
            href={`/api/crm/files/${f.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-ink hover:border-ink/20 hover:bg-surface-subtle"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
            Download
          </a>
        </li>
      ))}
    </ul>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
