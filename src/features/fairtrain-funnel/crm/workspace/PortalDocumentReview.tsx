"use client";
/**
 * Admin document review for the applicant portal checklist. Approve/reject
 * uploaded documents, add a reviewer note, and re-request missing documents.
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
  requestPortalDocuments,
  reviewPortalDocument,
} from "@/server/actions/portalAdmin";

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

  const review = (documentId: string, decision: "APPROVED" | "REJECTED") =>
    startTransition(async () => {
      await reviewPortalDocument({
        documentId,
        decision,
        reviewerNote: notes[documentId] || undefined,
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
          return (
            <li
              key={d.kind}
              className="rounded-xl border border-ink/10 bg-white/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
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
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${tone(
                    d.status,
                  )}`}
                >
                  {PORTAL_DOCUMENT_STATUS_LABEL[d.status]}
                </span>
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
                    placeholder="Reviewer-Notiz (optional)"
                    value={notes[d.id] ?? ""}
                    onChange={(e) =>
                      setNotes((n) => ({ ...n, [d.id]: e.target.value }))
                    }
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      disabled={pending}
                      onClick={() => review(d.id, "APPROVED")}
                    >
                      Freigeben
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                      disabled={pending}
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
