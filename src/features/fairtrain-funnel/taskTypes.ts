/**
 * Task system — UI-facing types for the Aufgaben kanban.
 *
 * Lives in its own file so `types.ts` stays under the project's max-lines
 * cap. The values match the strings stored in `Task.status` / `Task.priority`
 * in Prisma (SQLite uses plain strings — enums are validated at every
 * boundary via zod).
 */
import { z } from "zod";

import type { UserRef } from "./userTypes";

export const TaskStatus = {
  OPEN: "OPEN",
  PLANNED: "PLANNED",
  IN_PROGRESS: "IN_PROGRESS",
  WAIT_APPLICANT: "WAIT_APPLICANT",
  WAIT_AGENCY: "WAIT_AGENCY",
  DONE: "DONE",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
export const TaskStatusSchema = z.enum(
  Object.values(TaskStatus) as [TaskStatus, ...TaskStatus[]],
);

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  OPEN: "Offen",
  PLANNED: "Geplant",
  IN_PROGRESS: "In Arbeit",
  WAIT_APPLICANT: "Wartet auf Bewerber",
  WAIT_AGENCY: "Wartet auf Behörde",
  DONE: "Erledigt",
};

export const TaskPriority = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];
export const TaskPrioritySchema = z.enum(
  Object.values(TaskPriority) as [TaskPriority, ...TaskPriority[]],
);

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: "Niedrig",
  NORMAL: "Normal",
  HIGH: "Hoch",
  URGENT: "Dringend",
};

/** UI-facing task — embeds resolved lead + assignee refs. */
export interface TaskSummary {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: Date | null;
  completedAt: Date | null;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  assignee: UserRef | null;
  createdBy: UserRef;
  createdAt: Date;
  updatedAt: Date;
}
