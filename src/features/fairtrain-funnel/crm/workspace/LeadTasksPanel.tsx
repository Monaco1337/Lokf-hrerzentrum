"use client";
/**
 * LeadTasksPanel — per-lead task list + creation for the Aufgaben tab.
 * Persists via the existing createTask / updateTask actions (which write
 * audit/ActivityLog entries). Open and completed tasks are split visually.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createTask, updateTask } from "@/server/actions/tasks";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TaskPriority,
  TaskStatus,
  type TaskSummary,
} from "../../types";

interface Props {
  leadId: string;
  initial: ReadonlyArray<TaskSummary>;
  users: ReadonlyArray<{ id: string; name: string }>;
  currentUserId: string;
}

const DT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function LeadTasksPanel({ leadId, initial, users, currentUserId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.NORMAL);
  const [assigneeId, setAssigneeId] = useState(currentUserId);
  const [dueAt, setDueAt] = useState("");

  const open = initial.filter((t) => t.status !== TaskStatus.DONE);
  const done = initial.filter((t) => t.status === TaskStatus.DONE);

  function submit() {
    if (title.trim().length < 2) {
      setError("Titel ist zu kurz.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createTask({
        leadId,
        title: title.trim(),
        priority,
        assigneeId: assigneeId || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      });
      if (!res.ok) {
        setError(res.message || "Aufgabe konnte nicht erstellt werden.");
        return;
      }
      setTitle("");
      setDueAt("");
      setCreating(false);
      router.refresh();
    });
  }

  function setStatus(id: string, status: TaskStatus) {
    setError(null);
    startTransition(async () => {
      const res = await updateTask({ id, status });
      if (!res.ok) {
        setError(res.message || "Status konnte nicht geändert werden.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-ink">
          {open.length} offene Aufgabe{open.length === 1 ? "" : "n"}
        </h3>
        <button type="button" className="btn-primary h-8" onClick={() => setCreating((c) => !c)}>
          {creating ? "Abbrechen" : "+ Neue Aufgabe"}
        </button>
      </div>

      {creating ? (
        <div className="grid gap-2 rounded-xl border border-ink/[0.07] bg-surface-subtle/40 p-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Titel</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Priorität</label>
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
              {Object.values(TaskPriority).map((p) => (
                <option key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fällig</label>
            <input type="datetime-local" className="input" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div>
            <label className="label">Bearbeiter</label>
            <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Nicht zugewiesen</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button type="button" className="btn-primary w-full" onClick={submit} disabled={pending}>
              {pending ? "Speichern…" : "Aufgabe anlegen"}
            </button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {open.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-muted">Keine offenen Aufgaben.</p>
      ) : (
        <ul className="space-y-2">
          {open.map((t) => (
            <TaskRow key={t.id} task={t} pending={pending} onDone={() => setStatus(t.id, TaskStatus.DONE)} dt={DT} />
          ))}
        </ul>
      )}

      {done.length > 0 ? (
        <details className="rounded-xl border border-ink/[0.06] p-3">
          <summary className="cursor-pointer text-[12.5px] font-semibold text-ink-soft">
            {done.length} erledigt
          </summary>
          <ul className="mt-2 space-y-2">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} pending={pending} onReopen={() => setStatus(t.id, TaskStatus.OPEN)} dt={DT} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function TaskRow({
  task,
  pending,
  onDone,
  onReopen,
  dt,
}: {
  task: TaskSummary;
  pending: boolean;
  onDone?: () => void;
  onReopen?: () => void;
  dt: Intl.DateTimeFormat;
}) {
  const isDone = task.status === TaskStatus.DONE;
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-ink/[0.07] bg-white px-3.5 py-2.5">
      <div className="min-w-0">
        <p className={`truncate text-[13px] font-medium ${isDone ? "text-ink-muted line-through" : "text-ink"}`}>
          {task.title}
        </p>
        <p className="text-[11px] text-ink-muted">
          {TASK_STATUS_LABEL[task.status]} · {TASK_PRIORITY_LABEL[task.priority]}
          {task.dueAt ? ` · fällig ${dt.format(task.dueAt)}` : ""}
          {task.assignee ? ` · ${task.assignee.name}` : ""}
        </p>
      </div>
      {onDone ? (
        <button
          type="button"
          className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
          disabled={pending}
          onClick={onDone}
        >
          Erledigt
        </button>
      ) : null}
      {onReopen ? (
        <button
          type="button"
          className="shrink-0 rounded-lg border border-ink/10 px-2.5 py-1 text-[12px] font-medium text-ink-soft transition hover:bg-surface-subtle disabled:opacity-50"
          disabled={pending}
          onClick={onReopen}
        >
          Wieder öffnen
        </button>
      ) : null}
    </li>
  );
}
