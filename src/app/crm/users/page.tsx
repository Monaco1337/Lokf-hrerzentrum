import { redirect } from "next/navigation";

import { UserAdmin } from "@/features/fairtrain-funnel/crm/users/UserAdmin";
import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { requireCrmUser } from "@/server/actions/_helpers";
import { userService } from "@/server/services/UserService";

export const dynamic = "force-dynamic";

export default async function UserAdminPage() {
  const currentUser = await requireCrmUser();
  if (!can(currentUser.role, "canManageUsers")) {
    redirect("/crm");
  }
  await userService.ensureBootstrapAdmins();
  const users = await userService.list({ includeInactive: true });
  return <UserAdmin initialUsers={users} currentUser={currentUser} />;
}
