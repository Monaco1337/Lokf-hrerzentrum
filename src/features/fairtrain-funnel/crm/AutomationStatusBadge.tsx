/**
 * Shared German status badge for automation sends (lead detail + admin logs).
 */
import type { AutomationLogStatus } from "../types";

const TONE: Record<AutomationLogStatus, string> = {
  SENT: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  FAILED: "bg-red-50 text-red-700 ring-red-100",
  SKIPPED: "bg-slate-100 text-slate-600 ring-slate-200",
  SKIPPED_MISSING_PROVIDER_CONFIG: "bg-amber-50 text-amber-800 ring-amber-100",
  SKIPPED_NO_CONSENT: "bg-slate-100 text-slate-600 ring-slate-200",
};

const LABEL: Record<AutomationLogStatus, string> = {
  SENT: "Gesendet",
  FAILED: "Fehlgeschlagen",
  SKIPPED: "Übersprungen",
  SKIPPED_MISSING_PROVIDER_CONFIG: "Versand noch nicht aktiv",
  SKIPPED_NO_CONSENT: "Keine Einwilligung",
};

const DOT: Record<AutomationLogStatus, string> = {
  SENT: "bg-emerald-500",
  FAILED: "bg-red-500",
  SKIPPED: "bg-slate-400",
  SKIPPED_MISSING_PROVIDER_CONFIG: "bg-amber-500",
  SKIPPED_NO_CONSENT: "bg-slate-400",
};

export function automationStatusLabel(status: AutomationLogStatus): string {
  return LABEL[status];
}

export function AutomationStatusBadge({ status }: { status: AutomationLogStatus }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
        TONE[status],
      ].join(" ")}
    >
      <span className={["h-1.5 w-1.5 rounded-full", DOT[status]].join(" ")} />
      {LABEL[status]}
    </span>
  );
}
