import type { Metadata } from "next";
import Link from "next/link";

import { FairtrainLogo } from "@/features/fairtrain-funnel/components/FairtrainLogo";
import { PortalWizard } from "@/features/fairtrain-funnel/portal/PortalWizard";
import { portalService } from "@/server/services/PortalService";

export const dynamic = "force-dynamic";

const PORTAL_TITLE = "Sicherer Bewerberbereich · Lokführerzentrum.de";
const PORTAL_DESCRIPTION =
  "Lade hier sicher deine Unterlagen (z. B. Lebenslauf) für deine geförderte Lokführer-Weiterbildung hoch. Verschlüsselt und DSGVO-konform.";

export const metadata: Metadata = {
  title: "Mein Bewerberbereich – Lokführerzentrum.de",
  description: PORTAL_DESCRIPTION,
  robots: { index: false, follow: false },
  // Own, trustworthy link-preview card so messengers don't inherit the generic
  // homepage preview. (Note: the IDN host still renders as Punycode in preview
  // cards — that's an anti-phishing behaviour of the clients, not a bug.)
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "Lokführerzentrum.de",
    title: PORTAL_TITLE,
    description: PORTAL_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: PORTAL_TITLE,
    description: PORTAL_DESCRIPTION,
  },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

const REASON_TEXT: Record<string, { title: string; body: string }> = {
  INVALID: {
    title: "Link nicht gültig",
    body: "Dieser Bewerberlink ist nicht bekannt. Bitte fordere bei deinem Ansprechpartner einen neuen Link an.",
  },
  EXPIRED: {
    title: "Link abgelaufen",
    body: "Dieser Bewerberlink ist abgelaufen. Bitte fordere einen neuen, aktuellen Link an.",
  },
  DISABLED: {
    title: "Link deaktiviert",
    body: "Dieser Bewerberlink wurde deaktiviert. Bitte melde dich bei deinem Ansprechpartner.",
  },
};

export default async function PortalPage({ params }: PageProps) {
  const { token } = await params;
  const ctx = await portalService.resolveContext(token);

  // Emit og:url with the readable Umlaut host VERBATIM. We cannot use Next's
  // Metadata API here because `new URL()` always converts the IDN host to
  // Punycode (xn--…). Rendering the tag directly keeps "www.lokführerzentrum.de"
  // — this is the value messengers show as the preview-card domain.
  const readableUrl = `https://www.lokführerzentrum.de/bewerbung/${token}`;

  return (
    <div className="min-h-screen bg-surface-subtle">
      <meta property="og:url" content={readableUrl} />
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="Lokführer.de">
            <FairtrainLogo />
          </Link>
          <div className="flex items-center gap-2">
            {ctx.isDemo ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                Demo
              </span>
            ) : null}
            <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 sm:inline">
              Sicher · DSGVO-konform
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {!ctx.ok ? (
          <div className="card mx-auto max-w-xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-ink">
              {REASON_TEXT[ctx.reason ?? "INVALID"]?.title}
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              {REASON_TEXT[ctx.reason ?? "INVALID"]?.body}
            </p>
          </div>
        ) : (
          <PortalWizard token={token} context={ctx} />
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-10 text-center text-xs text-ink-muted sm:px-6">
        Deine Daten werden ausschließlich für deine Weiterbildungsförderung verwendet.
      </footer>
    </div>
  );
}
