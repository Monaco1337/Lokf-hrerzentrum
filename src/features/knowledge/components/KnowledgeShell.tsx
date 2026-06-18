/**
 * Page shell for all knowledge routes: sticky knowledge header, a constrained
 * editorial content column and the shared marketing footer (final CTA + legal).
 */
import { Footer } from "@/components/layout/Footer";

import { KnowledgeHeader } from "./KnowledgeHeader";

interface KnowledgeShellProps {
  activePath?: string;
  children: React.ReactNode;
}

export function KnowledgeShell({ activePath, children }: KnowledgeShellProps) {
  return (
    <div className="min-h-screen bg-surface-subtle">
      <KnowledgeHeader {...(activePath ? { activePath } : {})} />
      <main className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
        {children}
      </main>
      <Footer />
    </div>
  );
}
