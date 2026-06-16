"use client";
/**
 * FileDropzone - drag & drop multi-file upload for the wizard.
 *
 * - Accepts PDF, PNG, JPG, WEBP (mirrors ACCEPTED_UPLOAD_MIME on the server)
 * - Hard cap MAX_UPLOAD_BYTES (15 MB) per file
 * - Uploads happen immediately via the `uploadFile` Server Action
 * - Each item shows: name, size, kind label, progress / done / error
 * - Removed entries are kept in `removedIds` so attached drafts can be
 *   cleaned up via the janitor.
 */
import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";

import { uploadFile } from "@/server/actions/uploadFile";

import {
  ACCEPTED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
} from "../../forms/schemas";
import { UploadedFileKind } from "../../types";
import { FileRow } from "./FileRow";

export type UploadedFileRef = {
  id: string;
  kind: UploadedFileKind;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
};

type ClientFileState =
  | { status: "uploading"; tempId: string; name: string; sizeBytes: number }
  | { status: "error"; tempId: string; name: string; sizeBytes: number; error: string };

export interface FileDropzoneProps {
  leadDraftId: string;
  /** Document category this dropzone uploads under. */
  kind: UploadedFileKind;
  /** Files already uploaded under this `kind` to display in the list. */
  values: ReadonlyArray<UploadedFileRef>;
  onAdd: (ref: UploadedFileRef) => void;
  onRemove: (id: string) => void;
  /** Optional context label shown inside the drop area (e.g. category name). */
  contextLabel?: string;
}

const ACCEPT_MAP: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
};

export function FileDropzone({
  leadDraftId,
  kind,
  values,
  onAdd,
  onRemove,
  contextLabel,
}: FileDropzoneProps) {
  const [pending, setPending] = useState<ClientFileState[]>([]);

  const upload = useCallback(
    async (file: File) => {
      const tempId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `tmp_${Math.random().toString(36).slice(2)}`;

      setPending((prev) => [
        ...prev,
        {
          status: "uploading",
          tempId,
          name: file.name,
          sizeBytes: file.size,
        },
      ]);

      try {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("leadDraftId", leadDraftId);
        fd.set("kind", kind);

        const result = await uploadFile(fd);
        if (!result.ok) {
          throw new Error(result.message);
        }
        const ref: UploadedFileRef = {
          id: result.data.id,
          kind: result.data.kind,
          originalName: result.data.originalName,
          sizeBytes: result.data.sizeBytes,
          mimeType: result.data.mimeType,
        };
        onAdd(ref);
        setPending((prev) => prev.filter((p) => p.tempId !== tempId));
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Upload fehlgeschlagen";
        setPending((prev) =>
          prev.map((p) =>
            p.tempId === tempId && p.status === "uploading"
              ? {
                  status: "error",
                  tempId,
                  name: file.name,
                  sizeBytes: file.size,
                  error: msg,
                }
              : p,
          ),
        );
      }
    },
      [kind, leadDraftId, onAdd],
    );

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      for (const rej of rejected) {
        const reason =
          rej.errors[0]?.code === "file-too-large"
            ? `${rej.file.name} ist zu groß (max. 15 MB)`
            : rej.errors[0]?.code === "file-invalid-type"
              ? `${rej.file.name}: Dateityp nicht unterstützt`
              : `${rej.file.name}: ${rej.errors[0]?.message ?? "abgelehnt"}`;
        const tempId =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `tmp_${Math.random().toString(36).slice(2)}`;
        setPending((prev) => [
          ...prev,
          {
            status: "error",
            tempId,
            name: rej.file.name,
            sizeBytes: rej.file.size,
            error: reason,
          },
        ]);
      }
      for (const f of accepted) {
        void upload(f);
      }
    },
    [upload],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject, open } =
    useDropzone({
      onDrop,
      accept: ACCEPT_MAP,
      maxSize: MAX_UPLOAD_BYTES,
      multiple: true,
      noClick: true,
      noKeyboard: false,
    });

  const dismissPending = (tempId: string) => {
    setPending((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps({
          className: [
            "relative cursor-pointer rounded-2xl border-2 border-dashed bg-white p-7 text-center transition focus:outline-none focus:ring-2 focus:ring-accent-200 focus:ring-offset-1 sm:p-10",
            isDragActive && !isDragReject
              ? "border-accent-400 bg-accent-50/40"
              : isDragReject
                ? "border-accent-500 bg-accent-50/60"
                : "border-ink/15 hover:border-ink/25",
          ].join(" "),
        })}
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          }
        }}
      >
        <input {...getInputProps()} />

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-accent-600 shadow-sm ring-1 ring-ink/10">
          <UploadCloudIcon className="h-5 w-5" />
        </div>

        <p className="mt-3 text-[15px] font-semibold text-navy-950">
          {isDragActive
            ? "Loslassen zum Hochladen"
            : contextLabel
              ? `${contextLabel} hierher ziehen`
              : "Datei hierher ziehen"}
        </p>
        <p className="mt-1 text-[12.5px] text-ink-muted">
          PDF · PNG · JPG · WEBP · max. 15 MB
        </p>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            open();
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-5 py-2.5 text-[13px] font-semibold text-navy-950 shadow-sm transition hover:border-ink/20 hover:bg-surface-subtle/60 focus:outline-none focus:ring-2 focus:ring-accent-200"
        >
          Datei auswählen
        </button>
      </div>

      {(values.length > 0 || pending.length > 0) && (
        <div className="rounded-2xl border border-ink/10 bg-white p-2 shadow-sm">
          <ul className="divide-y divide-ink/5">
            {values.map((v) => (
              <li key={v.id}>
                <FileRow
                  name={v.originalName}
                  sizeBytes={v.sizeBytes}
                  mimeType={v.mimeType}
                  status="done"
                  onRemove={() => onRemove(v.id)}
                />
              </li>
            ))}
            {pending.map((p) => (
              <li key={p.tempId}>
                {p.status === "uploading" ? (
                  <FileRow
                    name={p.name}
                    sizeBytes={p.sizeBytes}
                    mimeType=""
                    status="uploading"
                  />
                ) : p.status === "error" ? (
                  <FileRow
                    name={p.name}
                    sizeBytes={p.sizeBytes}
                    mimeType=""
                    status="error"
                    error={p.error}
                    onRemove={() => dismissPending(p.tempId)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function UploadCloudIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M12 16V8m0 0-3 3m3-3 3 3" />
      <path d="M6 18a4 4 0 0 1-1-7.9A6 6 0 0 1 17 7c2.8 0 5 2.2 5 5 0 2.4-1.7 4.4-4 4.9" />
    </svg>
  );
}

// Suppress unused-import warning for ACCEPTED_UPLOAD_MIME (kept for parity with server)
void ACCEPTED_UPLOAD_MIME;
