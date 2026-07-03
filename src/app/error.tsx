"use client";

/**
 * Root error boundary (app segment).
 *
 * Last line of defence against a white "server-side exception" screen. It
 * catches errors that nested boundaries do not — most importantly errors
 * thrown inside a segment's own layout (e.g. app/crm/layout.tsx), which the
 * segment-level app/crm/error.tsx cannot catch.
 *
 * Brand-neutral on purpose: it must render even if feature CSS/util classes
 * are unavailable, so it relies only on inline styles.
 */
import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app] render error", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        color: "#111827",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          textAlign: "center",
          border: "1px solid #E5E7EB",
          borderRadius: 16,
          background: "#ffffff",
          padding: 32,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          Etwas ist schiefgelaufen
        </h1>
        <p style={{ marginTop: 8, fontSize: 14, color: "#6B7280" }}>
          Die Seite konnte gerade nicht geladen werden. Bitte versuche es erneut.
        </p>
        <div
          style={{
            marginTop: 24,
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: "none",
              borderRadius: 8,
              background: "#111827",
              color: "#fff",
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Erneut laden
          </button>
          <Link
            href="/"
            style={{
              border: "1px solid #E5E7EB",
              borderRadius: 8,
              background: "#fff",
              color: "#374151",
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Zur Startseite
          </Link>
        </div>
        {error.digest ? (
          <p style={{ marginTop: 24, fontSize: 11, color: "#9CA3AF" }}>
            Referenz für den Support: {error.digest}
          </p>
        ) : null}
      </div>
    </div>
  );
}
