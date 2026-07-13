import type { Metadata } from "next";
import Link from "next/link";

import { EligibilityWizard } from "@/features/fairtrain-funnel/components/EligibilityWizard";
import { FairtrainLogo } from "@/features/fairtrain-funnel/components/FairtrainLogo";
import type { WhatsAppContact } from "@/features/fairtrain-funnel/components/wizard/Step6Result";
import { normalizePhoneForWhatsApp } from "@/features/fairtrain-funnel/automation/PhoneNormalizer";
import { whatsAppNumberRepository } from "@/server/repositories/WhatsAppNumberRepository";

export const metadata: Metadata = {
  title: "Eignungscheck – Lokführer-Weiterbildung",
  description:
    "Prüfe in wenigen Minuten, ob du für die geförderte Lokführer-Weiterbildung in Frage kommst – sicher, einfach und DSGVO-konform.",
  robots: { index: false, follow: false },
};

// The primary WhatsApp number is read from the DB on each request so the
// funnel always reflects the current "Nummer 1" configured in the CRM.
export const dynamic = "force-dynamic";

/**
 * Resolves "Nummer 1" — the first active WhatsApp sender — into a contact that
 * the result screen can turn into a wa.me deep link. Returns null when no
 * active number exists, so the CTA simply hides.
 */
async function loadPrimaryWhatsAppContact(): Promise<WhatsAppContact | null> {
  try {
    const active = await whatsAppNumberRepository.listActive();
    const primary = active[0];
    if (!primary) return null;
    const e164 = normalizePhoneForWhatsApp(primary.displayPhone);
    const waId = e164.replace(/\D/g, "");
    if (!waId) return null;
    return { display: primary.displayPhone, waId };
  } catch {
    return null;
  }
}

export default async function EignungscheckPage() {
  const whatsappContact = await loadPrimaryWhatsAppContact();

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
        <EligibilityWizard whatsappContact={whatsappContact} />
      </main>
    </div>
  );
}
