/**
 * /crm — the operative Dashboard. The first surface every operator lands on.
 *
 * Loads process-scoped data via `loadDashboard()` and hands it to the Dashboard
 * component. Scoped to the real application process (leadType=neu):
 * reactivation/alt/marketing leads never surface here.
 *
 * RESILIENCE: this is the CRM landing page — it must ALWAYS render. Middleware
 * already verified the session cookie before we get here, so a DB failure in
 * the user lookup is pure infrastructure (not an auth problem) and must not
 * white-screen the operator. We degrade to a minimal user; `loadDashboard`
 * itself already degrades every data section to safe defaults.
 */
import { Dashboard } from "@/features/fairtrain-funnel/crm/operations/Dashboard";
import { loadDashboard } from "@/features/fairtrain-funnel/crm/operations/DashboardLoader";
import type { UserSummary } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";

export const dynamic = "force-dynamic";

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

async function resolveUser(): Promise<UserSummary> {
  try {
    return await requireCrmUser();
  } catch (err) {
    // Preserve auth redirects (expired/invalid session → /crm/login).
    if (isNextRedirect(err)) throw err;
    // Infrastructure/DB error: the session was already verified by middleware,
    // so render the shell with a neutral fallback instead of crashing.
    // eslint-disable-next-line no-console
    console.error("[dashboard] user resolve failed — rendering degraded", err);
    const now = new Date();
    return {
      id: "unknown",
      name: "Team",
      email: "",
      role: "READ_ONLY",
      isActive: true,
      avatar: null,
      lastLoginAt: null,
      mustChangePassword: false,
      createdAt: now,
      updatedAt: now,
    };
  }
}

export default async function DashboardPage() {
  const user = await resolveUser();
  const data = await loadDashboard(user);
  return <Dashboard {...data} />;
}
