/**
 * OpsSidebar — Operations Center navigation (server wrapper).
 *
 * Resolves the permission-filtered sections + current user via the shared
 * `loadOpsNav()` loader and hands them to the client sidebar, which renders the
 * full nav (lg) and the icon rail (md) with the premium 4-colour icon palette.
 * The mobile rail lives in a sibling component (OpsMobileNav) so it can sit
 * full-width under the header instead of inside the sidebar flex column.
 */
import { OpsSidebarClient } from "./OpsSidebarClient";
import { loadOpsNav } from "./opsNavData";

export async function OpsSidebar() {
  const { sections, role, displayName, initials } = await loadOpsNav();
  return (
    <OpsSidebarClient
      sections={sections}
      role={role}
      displayName={displayName}
      initials={initials}
    />
  );
}
