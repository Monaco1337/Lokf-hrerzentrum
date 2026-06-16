/**
 * /crm — the Leitstand. The first surface every operator lands on.
 *
 * Loads all data via `loadLeitstand()` (single Promise.all) and hands it to
 * the Leitstand component. Every count, every chip, every row reflects real
 * DB state — no demo math, no fillers, no fake stats.
 */
import { Leitstand } from "@/features/fairtrain-funnel/crm/operations/Leitstand";
import { loadLeitstand } from "@/features/fairtrain-funnel/crm/operations/LeitstandLoader";
import { requireCrmUser } from "@/server/actions/_helpers";

export const dynamic = "force-dynamic";

export default async function LeitstandPage() {
  const user = await requireCrmUser();
  const data = await loadLeitstand(user);
  return <Leitstand {...data} />;
}
