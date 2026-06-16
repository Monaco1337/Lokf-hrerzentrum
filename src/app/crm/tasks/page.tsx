/**
 * /crm/tasks — Aufgaben kanban with 6 status columns.
 *
 * Server loads:
 *   - tasks (scoped: agents see only own tasks or tasks tied to their leads)
 *   - active leads they may pin tasks to
 *   - users that may receive tasks
 */
import { TasksBoard } from "@/features/fairtrain-funnel/crm/operations/TasksBoard";
import { LeadStatus } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { taskRepository } from "@/server/repositories/TaskRepository";
import { userRepository } from "@/server/repositories/UserRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

const ACTIVE: ReadonlyArray<LeadStatus> = Object.values(LeadStatus).filter(
  (s): s is LeadStatus =>
    s !== LeadStatus.CLOSED && s !== LeadStatus.LOST && s !== LeadStatus.REJECTED,
);

export default async function TasksPage() {
  const user = await requireCrmUser();
  const [allTasks, leads, users] = await Promise.all([
    taskRepository.list({ includeDone: false }),
    leadRepository.list(applyScope({ status: ACTIVE }, user), { limit: 500 }),
    userRepository.list({ includeInactive: false }),
  ]);

  // Agents only see their own tasks (or those tied to their leads).
  const visible =
    user.role === "PARTNER_AGENT"
      ? allTasks.filter(
          (t) =>
            t.assignee?.id === user.id ||
            t.createdBy.id === user.id ||
            (t.lead &&
              leads.some((l) => l.id === t.lead!.id)),
        )
      : allTasks;

  return (
    <TasksBoard
      initial={visible}
      leads={leads.map((l) => ({
        id: l.id,
        firstName: l.firstName,
        lastName: l.lastName,
      }))}
      users={users.map((u) => ({ id: u.id, name: u.name }))}
      currentUserId={user.id}
    />
  );
}
