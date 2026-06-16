"use client";

import { useState, useTransition } from "react";

import { updateContactInquiryStatus } from "@/server/actions/updateContactInquiryStatus";

import {
  ContactInquiryStatus,
  type ContactInquirySummary,
  type ContactInquiryStatus as ContactInquiryStatusType,
} from "../types";

interface InquiryDetailProps {
  inquiry: ContactInquirySummary;
}

const STATUS_OPTIONS: ReadonlyArray<{
  value: ContactInquiryStatusType;
  label: string;
}> = [
  { value: ContactInquiryStatus.NEW, label: "Neu" },
  { value: ContactInquiryStatus.IN_PROGRESS, label: "In Bearbeitung" },
  { value: ContactInquiryStatus.DONE, label: "Erledigt" },
  { value: ContactInquiryStatus.SPAM, label: "Spam" },
];

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function InquiryDetail({ inquiry: initial }: InquiryDetailProps) {
  const [inquiry, setInquiry] = useState<ContactInquirySummary>(initial);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const change = (status: ContactInquiryStatusType) => {
    setError(null);
    startTransition(async () => {
      const res = await updateContactInquiryStatus({
        id: inquiry.id,
        status,
      });
      if (res.ok) setInquiry(res.data);
      else setError(res.message);
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">Kontaktanfrage</p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            {inquiry.firstName} {inquiry.lastName}
          </h1>
          <p className="text-sm text-ink-soft">{formatDate(inquiry.createdAt)}</p>
        </div>
        <a
          href={`mailto:${inquiry.email}?subject=Deine%20Anfrage%20-%20Lokf%C3%BChrerzentrum`}
          className="btn-primary inline-flex items-center gap-2"
        >
          Per E-Mail antworten
        </a>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card space-y-4 p-5 md:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Nachricht
          </h2>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
            {inquiry.message}
          </p>
        </div>

        <div className="card space-y-4 p-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Kontaktdaten
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label="E-Mail" value={inquiry.email} />
              <Row label="Telefon" value={inquiry.phone ?? "—"} />
              <Row
                label="Quelle"
                value={inquiry.source ? new URL(inquiry.source).hostname : "—"}
              />
            </dl>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Status
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const active = inquiry.status === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => change(opt.value)}
                    disabled={isPending || active}
                    className={[
                      "rounded-lg border px-3 py-2 text-[13px] font-semibold transition",
                      active
                        ? "border-accent-600 bg-accent-600 text-white"
                        : "border-ink/15 bg-white text-ink hover:border-ink/25",
                      isPending ? "opacity-60" : "",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {inquiry.handledBy && inquiry.handledAt && (
              <p className="mt-3 text-[12px] text-ink-muted">
                Zuletzt bearbeitet von{" "}
                <span className="font-semibold text-ink">
                  {inquiry.handledBy}
                </span>{" "}
                am {formatDate(inquiry.handledAt)}
              </p>
            )}
            {error && (
              <p className="mt-2 text-[12px] font-medium text-accent-700">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
