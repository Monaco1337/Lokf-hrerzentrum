"use client";
/**
 * Lead detail — manual "Erstkontakt per E-Mail" action.
 *
 * Sends the transactional `lead_upload_request_email` template via Resend to an
 * imported/existing lead. Never fires automatically; guarded against
 * double-sends on the server (AutomationService.sendFirstContact).
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { sendFirstContactEmail } from "@/server/actions/firstContact";
import type { AutomationLogEntry } from "../types";

/** Must match AutomationService.UPLOAD_REQUEST_EMAIL_SLUG. */
const UPLOAD_REQUEST_EMAIL_SLUG = "lead_upload_request_email";

interface Props {
  leadId: string;
  email: string | null;
  logs: AutomationLogEntry[];
}

export function LeadFirstContactPanel({ leadId, email, logs }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasEmail = Boolean(email && email.includes("@"));

  const lastSend = logs
    .filter((l) => l.templateSlug === UPLOAD_REQUEST_EMAIL_SLUG && !l.isTest)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  const alreadySent =
    lastSend?.status === "SENT"
      ? lastSend
      : logs.find(
          (l) =>
            l.templateSlug === UPLOAD_REQUEST_EMAIL_SLUG &&
            l.status === "SENT" &&
            !l.isTest,
        );

  function send() {
    setError(null);
    startTransition(async () => {
      const res = await sendFirstContactEmail({ leadId });
      if (!res.ok) setError(res.message);
      else router.refresh();
    });
  }

  const status = statusView({ hasEmail, alreadySent, lastSend });

  return (
    <div className="space-y-3 rounded-xl border border-ink/[0.07] bg-surface-subtle/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Erstkontakt per E-Mail</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            Transaktionale Unterlagen-Anfrage an Bestandsleads. Wird nicht
            automatisch versendet.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          disabled={pending || !hasEmail}
          onClick={send}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M4 4h16v16H4z" />
            <path d="m4 6 8 6 8-6" />
          </svg>
          {alreadySent ? "Erneut senden" : "Erstkontakt senden"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className={["h-1.5 w-1.5 rounded-full", status.dot].join(" ")} />
        <span className={["text-xs font-medium", status.text].join(" ")}>
          {status.label}
        </span>
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function statusView(args: {
  hasEmail: boolean;
  alreadySent: AutomationLogEntry | undefined;
  lastSend: AutomationLogEntry | undefined;
}): { label: string; dot: string; text: string } {
  const { hasEmail, alreadySent, lastSend } = args;
  if (!hasEmail) {
    return {
      label: "Keine E-Mail vorhanden",
      dot: "bg-slate-300",
      text: "text-ink-muted",
    };
  }
  if (alreadySent) {
    return {
      label: `Gesendet am ${alreadySent.createdAt.toLocaleString("de-DE")}`,
      dot: "bg-emerald-500",
      text: "text-emerald-700",
    };
  }
  if (lastSend?.status === "FAILED") {
    return {
      label: `Fehlgeschlagen${lastSend.errorMessage ? `: ${lastSend.errorMessage}` : ""}`,
      dot: "bg-red-500",
      text: "text-red-700",
    };
  }
  return {
    label: "Noch nicht gesendet",
    dot: "bg-amber-400",
    text: "text-ink-soft",
  };
}
