"use client";

import type { TaskPriority, TaskSummary } from "../../types";

const PRIO_CHIP: Record<TaskPriority, string> = {
  URGENT: "ops-chip ops-chip-red",
  HIGH: "ops-chip ops-chip-orange",
  NORMAL: "ops-chip ops-chip-slate",
  LOW: "ops-chip ops-chip-slate opacity-60",
};

const PRIO_LABEL: Record<TaskPriority, string> = {
  URGENT: "Dringend",
  HIGH: "Hoch",
  NORMAL: "Normal",
  LOW: "Niedrig",
};

const DATE_FMT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function TaskCard({
  task,
  onOpen,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  task: TaskSummary;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const overdue =
    task.dueAt && task.status !== "DONE" && task.dueAt.getTime() < Date.now();
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={[
        "block w-full cursor-grab rounded-lg border border-white/[0.06] bg-[#161618] p-3 text-left transition active:cursor-grabbing",
        isDragging
          ? "opacity-40 ring-1 ring-orange-500/40"
          : "hover:border-white/[0.16] hover:bg-[#1c1c20]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-[12.5px] font-semibold text-white">
          {task.title}
        </p>
        <span className={PRIO_CHIP[task.priority]}>
          {PRIO_LABEL[task.priority]}
        </span>
      </div>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-[11px] text-zinc-400">
          {task.description}
        </p>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {task.lead && (
            <span className="ops-chip ops-chip-slate truncate">
              {task.lead.firstName} {task.lead.lastName}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {task.dueAt && (
            <span
              className={[
                "text-[10.5px] tabular-nums",
                overdue ? "text-red-300" : "text-zinc-400",
              ].join(" ")}
            >
              {DATE_FMT.format(task.dueAt)}
            </span>
          )}
          {task.assignee && (
            <span
              title={task.assignee.name}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[9px] font-bold text-black"
            >
              {task.assignee.name
                .split(/\s+/)
                .map((p) => p[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
