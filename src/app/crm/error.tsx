"use client";

/**
 * CRM error boundary.
 *
 * Catches any exception thrown while rendering a /crm page (data loading,
 * permission checks, DB errors, …) and renders a controlled, friendly state
 * instead of the raw white "Application error: a server-side exception has
 * occurred" screen.
 *
 * Rules:
 *  - never leak stack traces or internal messages to the user
 *  - offer a retry (re-runs the server render) and a route to the login
 *  - log to the browser console for support; the server error itself is
 *    already logged by Next.js with the same `digest`
 */
import { useEffect } from "react";
import Link from "next/link";

export default function CrmError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[crm] render error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <div
      data-ops
      className="flex min-h-[60vh] items-center justify-center px-4 py-16"
    >
      <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2]">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h1 className="mt-5 text-lg font-semibold text-[#111827]">
          Das CRM konnte gerade nicht geladen werden
        </h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          Es ist ein vorübergehendes Problem aufgetreten. Bitte lade die Seite
          erneut. Falls das Problem bestehen bleibt, melde dich erneut an.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F2937]"
          >
            Erneut laden
          </button>
          <Link
            href="/crm/login"
            className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
          >
            Zur Anmeldung
          </Link>
        </div>

        {error.digest ? (
          <p className="mt-6 text-[11px] text-[#9CA3AF]">
            Referenz für den Support: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
