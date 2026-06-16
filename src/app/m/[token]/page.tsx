import Link from "next/link";

import { FairtrainLogo } from "@/features/fairtrain-funnel/components/FairtrainLogo";
import { DomainError } from "@/server/errors";
import { magicLinkTokenService } from "@/server/services/MagicLinkTokenService";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

export default async function MagicLinkPage({ params }: PageProps) {
  const { token } = await params;
  let consumed: { leadId: string; scope: string } | null = null;
  let error: string | null = null;
  try {
    consumed = await magicLinkTokenService.consume(token);
  } catch (err) {
    if (err instanceof DomainError) {
      error =
        err.code === "TOKEN_EXPIRED"
          ? "Dieser Link ist abgelaufen. Bitte fordere einen neuen Link an."
          : err.code === "TOKEN_USED"
            ? "Dieser Link wurde bereits verwendet."
            : "Der Link ist ungültig.";
    } else {
      throw err;
    }
  }

  return (
    <div className="min-h-screen bg-surface-subtle">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/">
            <FairtrainLogo />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-16">
        {error ? (
          <div className="card p-8 text-center">
            <h1 className="text-xl font-semibold text-ink">Link nicht nutzbar</h1>
            <p className="mt-2 text-sm text-ink-soft">{error}</p>
            <Link href="/eligibility" className="btn-primary mt-6">
              Erneut starten
            </Link>
          </div>
        ) : (
          <div className="card p-8">
            <h1 className="text-xl font-semibold text-ink">Vielen Dank!</h1>
            <p className="mt-2 text-sm text-ink-soft">
              Wir haben deinen Zugang bestätigt. Im nächsten Schritt vervollständigen
              wir mit dir gemeinsam deine Unterlagen.
            </p>
            <p className="mt-4 text-xs text-ink-muted">
              Vorgang: {consumed?.scope}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
