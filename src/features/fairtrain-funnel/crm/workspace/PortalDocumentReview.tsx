"use client";
/**
 * Admin document review for the applicant portal checklist.
 *
 * Enterprise review flow:
 *  - Every uploaded document is clickable → in-browser preview (PDF/image) with
 *    zoom, download and print (DocumentViewerModal).
 *  - Approve/Reject is only unlocked AFTER the reviewer has sighted the file.
 *  - Rejection requires a reason; the applicant then automatically receives a
 *    WhatsApp + e-mail with that reason and a fresh upload link (server-side).
 *  - "Fehlende anfordern" regenerates the request from the still-missing docs.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  PORTAL_DOCUMENT_LABEL,
  PORTAL_DOCUMENT_STATUS_LABEL,
  PORTAL_REQUIRED_DOCUMENTS,
  type PortalDocumentEntry,
  type PortalDocumentKind,
  type PortalDocumentStatus,
} from "../../types";
import {
  recordPortalDocumentViewed,
  requestPortalDocuments,
  reviewPortalDocument,
} from "@/server/actions/portalAdmin";

import { DocumentViewerModal } from "./DocumentViewerModal";

function tone(status: PortalDocumentStatus): string {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    case "UPLOADED":
      return "bg-blue-50 text-blue-700 ring-blue-200";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "REQUESTED":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

interface ViewerTarget {
  fileId: string;
  fileName: string;
  mimeType: string | null;
}

function isImageDoc(d: PortalDocumentEntry): boolean {
  if (d.mimeType) return d.mimeType.startsWith("image/");
  return /\.(png|jpe?g|webp|gif)$/i.test(d.fileName ?? "");
}

export function PortalDocumentReview({
  leadId,
  documents,
}: {
  leadId: string;
  documents: PortalDocumentEntry[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [viewed, setViewed] = useState<Record<string, boolean>>({});
  const [viewer, setViewer] = useState<ViewerTarget | null>(null);

  const completion = (() => {
    const done = PORTAL_REQUIRED_DOCUMENTS.filter((k) => {
      const d = documents.find((x) => x.kind === k);
      return d?.status === "UPLOADED" || d?.status === "APPROVED";
    }).length;
    return Math.round((done / PORTAL_REQUIRED_DOCUMENTS.length) * 100);
  })();

  const missing = documents
    .filter((d) => d.status === "MISSING")
    .map((d) => d.kind);

  const openViewer = (d: PortalDocumentEntry) => {
    if (!d.uploadedFileId) return;
    setViewer({
      fileId: d.uploadedFileId,
      fileName: d.fileName ?? "Dokument",
      mimeType: d.mimeType,
    });
    if (!viewed[d.id]) {
      setViewed((v) => ({ ...v, [d.id]: true }));
      // Fire-and-forget audit; the reviewer sighted the document.
      void recordPortalDocumentViewed({ documentId: d.id });
    }
  };

  const review = (
    documentId: string,
    decision: "APPROVED" | "REJECTED",
  ) =>
    startTransition(async () => {
      await reviewPortalDocument({
        documentId,
        decision,
        reviewerNote: notes[documentId]?.trim() || undefined,
      });
      router.refresh();
    });

  const requestMissing = () =>
    startTransition(async () => {
      if (missing.length === 0) return;
      await requestPortalDocuments({ leadId, kinds: missing });
      router.refresh();
    });

  return (
    <div className="space-y-3">
      {viewer ? (
        <DocumentViewerModal
          fileId={viewer.fileId}
          fileName={viewer.fileName}
          mimeType={viewer.mimeType}
          onClose={() => setViewer(null)}
        />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-ink-muted">
            <span>Pflichtunterlagen</span>
            <span>{completion}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.max(completion, 2)}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          className="btn-secondary shrink-0"
          disabled={pending || missing.length === 0}
          onClick={requestMissing}
        >
          Fehlende anfordern
        </button>
      </div>

      <ul className="space-y-2">
        {documents.map((d) => {
          const isReviewable = d.status === "UPLOADED";
          const hasFile = Boolean(d.uploadedFileId);
          // Sighting gate: if there is a real file, it must be opened first.
          const sighted = !hasFile || viewed[d.id];
          const noteText = notes[d.id]?.trim() ?? "";
          return (
            <li
              key={d.kind}
              className="rounded-xl border border-ink/10 bg-white/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  {hasFile && isImageDoc(d) ? (
                    <button
                      type="button"
                      onClick={() => openViewer(d)}
                      className="h-11 w-11 shrink-0 overflow-hidden rounded-lg ring-1 ring-ink/10 transition hover:ring-ink/30"
                      title="Vorschau öffnen"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/crm/files/${d.uploadedFileId}`}
                        alt={d.fileName ?? "Vorschau"}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : null}
                  <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {PORTAL_DOCUMENT_LABEL[d.kind as PortalDocumentKind]}
                    {PORTAL_REQUIRED_DOCUMENTS.includes(d.kind) ? (
                      <span className="ml-1 text-rose-500">*</span>
                    ) : null}
                    {d.isDemo ? (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        Demo
                      </span>
                    ) : null}
                  </p>
                  {d.fileName ? (
                    <p className="truncate text-xs text-ink-muted">{d.fileName}</p>
                  ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {hasFile ? (
                    <button
                      type="button"
                      className="rounded-lg border border-ink/15 px-2.5 py-1 text-xs font-medium text-ink hover:bg-ink/5"
                      onClick={() => openViewer(d)}
                    >
                      Ansehen
                    </button>
                  ) : null}
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${tone(
                      d.status,
                    )}`}
                  >
                    {PORTAL_DOCUMENT_STATUS_LABEL[d.status]}
                  </span>
                </div>
              </div>

              {d.reviewerNote ? (
                <p className="mt-2 rounded bg-surface-muted px-2 py-1 text-xs text-ink-soft">
                  Notiz: {d.reviewerNote}
                </p>
              ) : null}

              {isReviewable ? (
                <div className="mt-2 space-y-2">
                  <input
                    className="input"
                    placeholder="Reviewer-Notiz (Pflicht bei Ablehnung)"
                    value={notes[d.id] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [d.id]: e.target.value }))
                    }
                  />
                  {!sighted ? (
                    <p className="text-[11px] font-medium text-amber-600">
                      Bitte das Dokument zuerst über &bdquo;Ansehen&ldquo;
                      sichten.
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      disabled={pending || !sighted}
                      onClick={() => review(d.id, "APPROVED")}
                    >
                      Freigeben
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                      disabled={pending || !sighted || noteText.length === 0}
                      title={
                        noteText.length === 0
                          ? "Ablehnungsgrund erforderlich"
                          : undefined
                      }
                      onClick={() => review(d.id, "REJECTED")}
                    >
                      Ablehnen
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
