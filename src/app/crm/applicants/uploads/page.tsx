import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy "Uploads" route — merged into the unified Bewerberakte at
 * /crm/unterlagen. Kept as a redirect so old links/bookmarks keep working.
 */
export default function ApplicantUploadsAlias() {
  redirect("/crm/unterlagen");
}
