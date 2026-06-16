"use client";

import { useMemo, useState, useTransition } from "react";

import {
  TaskStatus,
  type TaskPriority,
  type TaskSummary,
} from "../../types";
import { createTask, deleteTask, updateTask } from "@/server/actions/tasks";

import { TaskCard } from "./TaskCard";
import { TaskEditor } from "./TaskEditor";

const COLUMNS: ReadonlyArray<{
  id: TaskStatus;
  label: string;
  hint: string;
  tone: "blue" | "amber" | "orange" | "violet" | "emerald";
}> = [
  { id: TaskStatus.OPEN, label: "Offen", hint: "Noch nicht angefasst", tone: "blue" },
  { id: TaskStatus.PLANNED, label: "Geplant", hint: "Termin steht", tone: "violet" },
  { id: TaskStatus.IN_PROGRESS, label: "In Arbeit", hint: "Wird gerade erledigt", tone: "orange" },
  { id: TaskStatus.WAIT_APPLICANT, label: "Wartet auf Bewerber", hint: "Ball ist beim Bewerber", tone: "amber" },
  { id: TaskStatus.WAIT_AGENCY, label: "Wartet auf Behörde", hint: "Ball ist bei der Agentur", tone: "amber" },
  { id: TaskStatus.DONE, label: "Erledigt", hint: "Abgehakt", tone: "emerald" },
];

const TONE_DOT = {
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  orange: "bg-orange-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
} as const;

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
}
interface UserOpt {
  id: string;
  name: string;
}

export interface TasksBoardProps {
  initial: ReadonlyArray<TaskSummary>;
  /** Active leads the operator may pin tasks to. */
  leads: ReadonlyArray<Lead>;
  /** Users that can receive tasks (active operators). */
  users: ReadonlyArray<UserOpt>;
  /** Logged-in operator — convenience for default assignee. */
  currentUserId: string;
}

export function TasksBoard({ initial, leads, users, currentUserId }: TasksBoardProps) {
  const [tasks, setTasks] = useState<TaskSummary[]>(() => [...initial]);
  const [editing, setEditing] = useState<TaskSummary | "new" | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const byColumn = useMemo(() => {
    const m = new Map<TaskStatus, TaskSummary[]>();
    for (const col of COLUMNS) m.set(col.id, []);
    for (const t of tasks) {
      const bucket = m.get(t.status);
      if (bucket) bucket.push(t);
    }
    return m;
  }, [tasks]);

  const overdue = tasks.filter(
    (t) => t.status !== "DONE" && t.dueAt && t.dueAt.getTime() < Date.now(),
  ).length;

  const move = (taskId: string, to: TaskStatus) => {
    const before = tasks.find((t) => t.id === taskId);
    if (!before || before.status === to) return;
    setTasks((curr) => curr.map((t) => (t.id === taskId ? { ...t, status: to } : t)));
    startTransition(async () => {
      const res = await updateTask({ id: taskId, status: to });
      if (!res.ok) {
        setTasks((curr) =>
          curr.map((t) => (t.id === taskId ? { ...t, status: before.status } : t)),
        );
        setError(res.message ?? "Statuswechsel fehlgeschlagen");
        setTimeout(() => setError(null), 5000);
      }
    });
  };

  const persistEdit = async (patch: {
    id?: string | undefined;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    leadId: string | null;
    assigneeId: string | null;
    dueAt: Date | null;
  }) => {
    if (patch.id) {
      const res = await updateTask({
        id: patch.id,
        title: patch.title,
        description: patch.description,
        status: patch.status,
        priority: patch.priority,
        leadId: patch.leadId,
        assigneeId: patch.assigneeId,
        dueAt: patch.dueAt?.toISOString() ?? null,
      });
      if (res.ok) {
        // Optimistically merge into local state — server already revalidated.
        setTasks((curr) =>
          curr.map((t) =>
            t.id === patch.id
              ? {
                  ...t,
                  title: patch.title,
                  description: patch.description,
                  status: patch.status,
                  priority: patch.priority,
                  dueAt: patch.dueAt,
                  lead:
                    patch.leadId === null
                      ? null
                      : leads.find((l) => l.id === patch.leadId) ?? t.lead,
                  assignee:
                    patch.assigneeId === null
                      ? null
                      : t.assignee && t.assignee.id === patch.assigneeId
                        ? t.assignee
                        : (() => {
                            const u = users.find(
                              (u) => u.id === patch.assigneeId,
                            );
                            return u
                              ? { id: u.id, name: u.name, role: "PARTNER_AGENT", avatar: null }
                              : null;
                          })(),
                }
              : t,
          ),
        );
        setEditing(null);
      } else setError(res.message ?? "Speichern fehlgeschlagen");
    } else {
      const res = await createTask({
        title: patch.title,
        description: patch.description,
        status: patch.status,
        priority: patch.priority,
        leadId: patch.leadId,
        assigneeId: patch.assigneeId,
        dueAt: patch.dueAt?.toISOString() ?? null,
      });
      if (res.ok) {
        // We need a full refresh to learn the createdBy ref — set a temporary
        // entry so the UI feels snappy, then trigger a soft router refresh.
        const tempId = res.data.id;
        const u = users.find((u) => u.id === patch.assigneeId);
        const meCreator = users.find((u) => u.id === currentUserId);
        setTasks((curr) => [
          {
            id: tempId,
            title: patch.title,
            description: patch.description,
            status: patch.status,
            priority: patch.priority,
            dueAt: patch.dueAt,
            completedAt: null,
            lead:
              patch.leadId === null
                ? null
                : leads.find((l) => l.id === patch.leadId) ?? null,
            assignee: u
              ? { id: u.id, name: u.name, role: "PARTNER_AGENT", avatar: null }
              : null,
            createdBy: meCreator
              ? {
                  id: meCreator.id,
                  name: meCreator.name,
                  role: "PARTNER_AGENT",
                  avatar: null,
                }
              : { id: currentUserId, name: "Ich", role: "PARTNER_AGENT", avatar: null },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          ...curr,
        ]);
        setEditing(null);
      } else setError(res.message ?? "Anlegen fehlgeschlagen");
    }
  };

  const persistDelete = async (id: string) => {
    const before = tasks;
    setTasks((curr) => curr.filter((t) => t.id !== id));
    const res = await deleteTask({ id });
    if (!res.ok) {
      setTasks(before);
      setError(res.message ?? "Löschen fehlgeschlagen");
    } else {
      setEditing(null);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-eyebrow">Aufgaben</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
            {tasks.length} offene Aufgaben
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {overdue > 0 && (
            <span className="ops-chip ops-chip-red">{overdue} überfällig</span>
          )}
          <button
            type="button"
            className="ops-btn-primary"
            onClick={() => setEditing("new")}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Neue Aufgabe
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12.5px] text-red-200">
          {error}
        </div>
      )}

      <div className="-mx-1 overflow-x-auto pb-2">
        <div className="flex min-w-max gap-3 px-1">
          {COLUMNS.map((col) => {
            const cards = byColumn.get(col.id) ?? [];
            const isTarget = dropTarget === col.id;
            return (
              <div
                key={col.id}
                className={[
                  "w-[300px] shrink-0 rounded-xl border transition",
                  isTarget
                    ? "border-orange-500/50 bg-orange-500/[0.04]"
                    : "border-white/[0.06] bg-[#0d0d0f]",
                ].join(" ")}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  if (dropTarget !== col.id) setDropTarget(col.id);
                }}
                onDragLeave={() => {
                  if (dropTarget === col.id) setDropTarget(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging) move(dragging, col.id);
                  setDragging(null);
                  setDropTarget(null);
                }}
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[col.tone]}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold uppercase tracking-wider text-zinc-300">
                        {col.label}
                      </p>
                      <p className="truncate text-[10px] text-zinc-500">
                        {col.hint}
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums text-zinc-300">
                    {cards.length}
                  </span>
                </div>
                <div className="flex max-h-[68vh] flex-col gap-2 overflow-y-auto p-2.5">
                  {cards.length === 0 && (
                    <p className="px-2 py-6 text-center text-[11px] text-zinc-600">
                      Leer
                    </p>
                  )}
                  {cards.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onOpen={() => setEditing(task)}
                      onDragStart={() => setDragging(task.id)}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropTarget(null);
                      }}
                      isDragging={dragging === task.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editing && (
        <TaskEditor
          task={editing === "new" ? null : editing}
          leads={leads}
          users={users}
          currentUserId={currentUserId}
          onClose={() => setEditing(null)}
          onSubmit={persistEdit}
          onDelete={persistDelete}
        />
      )}
    </div>
  );
}
