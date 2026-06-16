import type { LeadSummary } from "../types";
import { evaluateSla } from "../utils/sla";

export function SlaCell({ lead }: { lead: LeadSummary }) {
  const result = evaluateSla(lead);
  if (lead.priority !== "HOT") {
    return <span className="text-ink-muted">–</span>;
  }
  if (result.breached) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
        Reaktionszeit überschritten
      </span>
    );
  }
  const urgent = result.minutesRemaining <= 10;
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        urgent
          ? "bg-amber-50 text-amber-800 ring-amber-100"
          : "bg-emerald-50 text-emerald-700 ring-emerald-100",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          urgent ? "bg-amber-500" : "bg-emerald-500",
        ].join(" ")}
      />
      noch {result.minutesRemaining} Min.
    </span>
  );
}
