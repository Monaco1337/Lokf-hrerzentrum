"use client";

import { useEffect, useState } from "react";

import {
  type TaskPriority,
  TaskStatus,
  type TaskSummary,
} from "../../types";

interface Lead {
  id: string;
  firstName: string;
  lastName: string;
}
interface UserOpt {
  id: string;
  name: string;
}

interface Props {
  task: TaskSummary | null;
  leads: ReadonlyArray<Lead>;
  users: ReadonlyArray<UserOpt>;
  currentUserId: string;
  onClose: () => void;
  onSubmit: (patch: {
    id?: string | undefined;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    leadId: string | null;
    assigneeId: string | null;
    dueAt: Date | null;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const STATUS_OPTIONS: ReadonlyArray<{ id: TaskStatus; label: string }> = [
  { id: TaskStatus.OPEN, label: "Offen" },
  { id: TaskStatus.PLANNED, label: "Geplant" },
  { id: TaskStatus.IN_PROGRESS, label: "In Arbeit" },
  { id: TaskStatus.WAIT_APPLICANT, label: "Wartet auf Bewerber" },
  { id: TaskStatus.WAIT_AGENCY, label: "Wartet auf Behörde" },
  { id: TaskStatus.DONE, label: "Erledigt" },
];

const PRIORITY_OPTIONS: ReadonlyArray<{ id: TaskPriority; label: string }> = [
  { id: "LOW", label: "Niedrig" },
  { id: "NORMAL", label: "Normal" },
  { id: "HIGH", label: "Hoch" },
  { id: "URGENT", label: "Dringend" },
];

function toInputDateTime(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskEditor({
  task,
  leads,
  users,
  currentUserId,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "OPEN");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "NORMAL",
  );
  const [leadId, setLeadId] = useState<string | "">(task?.lead?.id ?? "");
  const [assigneeId, setAssigneeId] = useState<string | "">(
    task?.assignee?.id ?? currentUserId,
  );
  const [due, setDue] = useState<string>(toInputDateTime(task?.dueAt ?? null));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    await onSubmit({
      id: task?.id,
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      status,
      priority,
      leadId: leadId === "" ? null : leadId,
      assigneeId: assigneeId === "" ? null : assigneeId,
      dueAt: due ? new Date(due) : null,
    });
    setSubmitting(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-white/[0.10] bg-[#0d0d0f] p-5 shadow-2xl"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-[18px] font-bold tracking-tight text-white">
            {task ? "Aufgabe bearbeiten" : "Neue Aufgabe"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white"
            aria-label="Schließen"
          >
            ✕
          </button>
        </header>

        <div className="space-y-3">
          <div>
            <label
              htmlFor="task-title"
              className="ops-eyebrow mb-1.5 block"
            >
              Titel
            </label>
            <input
              id="task-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="ops-input"
              placeholder="z. B. Lebenslauf von Max Mustermann anfordern"
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="task-description"
              className="ops-eyebrow mb-1.5 block"
            >
              Beschreibung
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="ops-input min-h-[80px]"
              placeholder="Optional — Kontext, nächste Schritte, Notizen"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-status" className="ops-eyebrow mb-1.5 block">
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="ops-input"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id} className="bg-zinc-900">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority" className="ops-eyebrow mb-1.5 block">
                Priorität
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="ops-input"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id} className="bg-zinc-900">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="task-assignee" className="ops-eyebrow mb-1.5 block">
                Verantwortlich
              </label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="ops-input"
              >
                <option value="" className="bg-zinc-900">
                  — niemand —
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-zinc-900">
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-due" className="ops-eyebrow mb-1.5 block">
                Fällig bis
              </label>
              <input
                id="task-due"
                type="datetime-local"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                className="ops-input"
              />
            </div>
          </div>

          <div>
            <label htmlFor="task-lead" className="ops-eyebrow mb-1.5 block">
              Bewerber (optional)
            </label>
            <select
              id="task-lead"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="ops-input"
            >
              <option value="" className="bg-zinc-900">
                — kein Bewerber —
              </option>
              {leads.map((l) => (
                <option key={l.id} value={l.id} className="bg-zinc-900">
                  {l.firstName} {l.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {task ? (
            <button
              type="button"
              disabled={submitting}
              onClick={() => onDelete(task.id)}
              className="text-[12.5px] font-medium text-red-400 transition hover:text-red-300 disabled:opacity-50"
            >
              Aufgabe löschen
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="ops-btn-ghost"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="ops-btn-primary disabled:opacity-60"
            >
              {submitting ? "Speichert …" : task ? "Speichern" : "Anlegen"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
