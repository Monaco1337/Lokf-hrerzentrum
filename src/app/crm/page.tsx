/**
 * /crm — the operative Dashboard. The first surface every operator lands on.
 *
 * Loads process-scoped data via `loadDashboard()` (single Promise.all) and
 * hands it to the Dashboard component. Every count, every card reflects real
 * DB state — no demo math, no fillers. Scoped to the real application process
 * (leadType=neu): reactivation/alt/marketing leads never surface here.
 */
import { Dashboard } from "@/features/fairtrain-funnel/crm/operations/Dashboard";
import { loadDashboard } from "@/features/fairtrain-funnel/crm/operations/DashboardLoader";
import { requireCrmUser } from "@/server/actions/_helpers";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireCrmUser();
  const data = await loadDashboard(user);
  return <Dashboard {...data} />;
}
