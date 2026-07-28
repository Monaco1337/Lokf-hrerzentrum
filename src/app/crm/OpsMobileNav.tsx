/**
 * OpsMobileNav — phone navigation (server wrapper).
 *
 * Renders the SAME destinations as the desktop sidebar (shared loadOpsNav) as a
 * premium, horizontally-scrollable colour-tile rail under the header. No burger,
 * no hidden blocks — every destination is one swipe away. Hidden from `md` up
 * where the sidebar/rail takes over.
 */
import { OpsMobileNavClient } from "./OpsMobileNavClient";
import { flattenLeaves } from "./opsNav";
import { loadOpsNav } from "./opsNavData";

export async function OpsMobileNav() {
  const { sections } = await loadOpsNav();
  return <OpsMobileNavClient items={flattenLeaves(sections)} />;
}
