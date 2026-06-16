/**
 * Legacy alias — redirects to the new operational Aufgaben kanban.
 */
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SalesTasksAlias() {
  redirect("/crm/tasks");
}
