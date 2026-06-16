/**
 * Legacy alias for the Lokführerzentrum.de brand mark.
 *
 * Older pages (CRM login, magic-link, eligibility) still import
 * `FairtrainLogo`. To keep them on the new brand without touching every
 * surface in one go, this re-exports the canonical Logo as a default
 * compact variant. New code should import `Logo` from
 * `@/components/ui/Logo` directly.
 */
import { Logo } from "@/components/ui/Logo";

export function FairtrainLogo({
  className = "h-10 w-auto",
}: {
  className?: string;
}) {
  return <Logo variant="compact" className={className} />;
}
