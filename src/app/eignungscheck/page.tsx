import type { Metadata } from "next";
import Link from "next/link";

import { EligibilityWizard } from "@/features/fairtrain-funnel/components/EligibilityWizard";
import { FairtrainLogo } from "@/features/fairtrain-funnel/components/FairtrainLogo";

export const metadata: Metadata = {
  title: "Eignungscheck – Lokführer-Weiterbildung",
  description:
    "Prüfe in wenigen Minuten, ob du für die geförderte Lokführer-Weiterbildung in Frage kommst – sicher, einfach und DSGVO-konform.",
  robots: { index: false, follow: false },
};

export default function EignungscheckPage() {
  return (
    <div className="min-h-screen bg-surface-subtle">
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-3 transition hover:opacity-90"
            aria-label="Zurück zur Startseite"
          >
            <FairtrainLogo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-[12px] font-medium uppercase tracking-[0.14em] text-ink-muted sm:inline">
              Sicher · DSGVO-konform
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft transition hover:text-ink"
            >
              Abbrechen
            </Link>
          </div>
        </div>
      </header>

      <main>
        <EligibilityWizard />
      </main>
    </div>
  );
}
