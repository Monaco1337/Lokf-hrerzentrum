/**
 * Page shell for all knowledge routes: sticky knowledge header, a constrained
 * editorial content column and the shared marketing footer (final CTA + legal).
 */
import { Footer } from "@/components/layout/Footer";

import { KnowledgeHeader } from "./KnowledgeHeader";
import { TrustBlock } from "./TrustBlock";

interface KnowledgeShellProps {
  activePath?: string;
  /** Set false on pages that render their own trust context (e.g. /redaktion). */
  showTrust?: boolean;
  children: React.ReactNode;
}

export function KnowledgeShell({
  activePath,
  showTrust = true,
  children,
}: KnowledgeShellProps) {
  return (
    <div className="min-h-screen bg-surface-subtle">
      <KnowledgeHeader {...(activePath ? { activePath } : {})} />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        {children}
        {showTrust ? <TrustBlock /> : null}
      </main>
      <Footer />
    </div>
  );
}
