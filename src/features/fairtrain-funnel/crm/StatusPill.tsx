/**
 * Premium German status & priority pills, shared across the CRM.
 */
import type { LeadPriority, LeadStatus } from "../types";
import { PRIORITY_TONE, STATUS_TONE } from "./leadLabels";

export function StatusPill({
  status,
  size = "md",
}: {
  status: LeadStatus;
  size?: "sm" | "md";
}) {
  const t = STATUS_TONE[status];
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        t.pill,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", t.dot].join(" ")} />
      {t.label}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: LeadPriority }) {
  const t = PRIORITY_TONE[priority];
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
        t.pill,
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", t.dot].join(" ")} />
      {t.label}
    </span>
  );
}
