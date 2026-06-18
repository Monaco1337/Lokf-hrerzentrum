/**
 * BewerberReise — compact horizontal progress stepper for the Lead Command Center.
 *
 * Shows the 9-stage ops funnel at a glance. Done stages never show "ausstehend"
 * — they read "Erledigt" when no history timestamp exists.
 */
import {
  type LeadDetail,
  LeadStatus,
  type StatusHistoryEntry,
  type UserRef,
} from "../../types";

interface Stage {
  rank: number;
  key: string;
  label: string;
  statuses: ReadonlyArray<LeadStatus>;
}

const STAGES: ReadonlyArray<Stage> = [
  { rank: 1, key: "lead", label: "Lead erhalten", statuses: [LeadStatus.NEW] },
  {
    rank: 2,
    key: "contact",
    label: "Kontakt",
    statuses: [LeadStatus.CONTACT_PENDING, LeadStatus.CONTACTED, LeadStatus.CALL_SCHEDULED],
  },
  {
    rank: 3,
    key: "qualified",
    label: "Qualifiziert",
    statuses: [LeadStatus.QUALIFIED, LeadStatus.HOT, LeadStatus.BRIEFING_SENT],
  },
  { rank: 4, key: "docs", label: "Unterlagen", statuses: [LeadStatus.DOC_READY] },
  {
    rank: 5,
    key: "appointment",
    label: "Agenturtermin",
    statuses: [LeadStatus.AA_APPOINTMENT_PENDING, LeadStatus.AA_APPOINTMENT_DONE],
  },
  { rank: 6, key: "voucherPending", label: "Gutschein beantragt", statuses: [LeadStatus.GUTSCHEIN_PENDING] },
  { rank: 7, key: "voucherApproved", label: "Gutschein erhalten", statuses: [LeadStatus.GUTSCHEIN_APPROVED] },
  { rank: 8, key: "enrolled", label: "Anmeldung", statuses: [LeadStatus.ENROLLED] },
  {
    rank: 9,
    key: "started",
    label: "Ausbildung gestartet",
    statuses: [LeadStatus.STARTED, LeadStatus.CLOSED],
  },
];

const STATUS_RANK: Record<LeadStatus, number> = (() => {
  const m: Partial<Record<LeadStatus, number>> = {};
  for (const stage of STAGES) {
    for (const s of stage.statuses) m[s] = stage.rank;
  }
  m[LeadStatus.LOST] = 0;
  m[LeadStatus.REJECTED] = 0;
  m[LeadStatus.BLOCKED] = 0;
  m[LeadStatus.DOC_PENDING] = 3;
  return m as Record<LeadStatus, number>;
})();

const DATE_FMT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
});

function stageCaption(state: "done" | "current" | "pending", enteredDate: Date | undefined): string {
  if (state === "done") {
    return enteredDate ? DATE_FMT.format(enteredDate) : "Erledigt";
  }
  if (state === "current") {
    return enteredDate ? DATE_FMT.format(enteredDate) : "Aktuell";
  }
  return "Ausstehend";
}

export function BewerberReise({
  lead,
  history,
}: {
  lead: LeadDetail;
  history: ReadonlyArray<StatusHistoryEntry>;
}) {
  const currentRank = STATUS_RANK[lead.status] ?? 1;
  const progressPct = Math.round((currentRank / STAGES.length) * 100);

  const enteredAt = new Map<string, Date>();
  const sortedHistory = [...history].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  for (const h of sortedHistory) {
    const stage = STAGES.find((s) => s.statuses.includes(h.toStatus as LeadStatus));
    if (stage && !enteredAt.has(stage.key)) {
      enteredAt.set(stage.key, h.createdAt);
    }
  }
  if (!enteredAt.has("lead")) enteredAt.set("lead", lead.createdAt);

  const owner: UserRef | null = lead.assignedToUser ?? null;

  return (
    <section className="overflow-hidden rounded-2xl border border-ink/[0.06] bg-white shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.05] px-5 py-4">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            Fortschritt
          </p>
          <h2 className="mt-0.5 text-[15px] font-bold tracking-tight text-navy-950">
            Stufe {currentRank} von {STAGES.length}
          </h2>
        </div>
        <div className="flex min-w-[140px] flex-col items-end gap-1.5">
          <span className="text-[11px] font-semibold tabular-nums text-ink-muted">
            {progressPct}% abgeschlossen
          </span>
          <div className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-emerald-500 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </header>

      <ol className="flex gap-0 overflow-x-auto px-2 py-4 [-ms-overflow-style:none] [scrollbar-width:thin] sm:px-4">
        {STAGES.map((stage, idx) => {
          const state =
            stage.rank < currentRank ? "done" : stage.rank === currentRank ? "current" : "pending";
          const enteredDate = enteredAt.get(stage.key);
          const caption = stageCaption(state, enteredDate);
          const isLast = idx === STAGES.length - 1;

          return (
            <li key={stage.key} className="flex min-w-[108px] shrink-0 flex-col items-center sm:min-w-[120px]">
              <div className="flex w-full items-center">
                {idx > 0 ? (
                  <span
                    aria-hidden
                    className={[
                      "h-0.5 flex-1",
                      stage.rank <= currentRank ? "bg-emerald-400" : "bg-ink/10",
                    ].join(" ")}
                  />
                ) : (
                  <span className="flex-1" />
                )}
                <span
                  className={[
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    state === "done"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : state === "current"
                        ? "bg-brand-600 text-white shadow-md ring-4 ring-brand-100"
                        : "bg-surface-muted text-ink-muted ring-1 ring-ink/10",
                  ].join(" ")}
                >
                  {state === "done" ? "✓" : stage.rank}
                  {state === "current" && owner ? (
                    <span
                      title={`Verantwortlich: ${owner.name}`}
                      className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[7px] font-bold text-amber-950 ring-2 ring-white"
                    >
                      {owner.name
                        .split(/\s+/)
                        .map((p) => p[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                  ) : null}
                </span>
                {!isLast ? (
                  <span
                    aria-hidden
                    className={[
                      "h-0.5 flex-1",
                      stage.rank < currentRank ? "bg-emerald-400" : "bg-ink/10",
                    ].join(" ")}
                  />
                ) : (
                  <span className="flex-1" />
                )}
              </div>
              <p
                className={[
                  "mt-2 max-w-[100px] text-center text-[11px] font-semibold leading-tight",
                  state === "current"
                    ? "text-brand-700"
                    : state === "done"
                      ? "text-navy-950"
                      : "text-ink-muted",
                ].join(" ")}
              >
                {stage.label}
              </p>
              <p className="mt-0.5 text-center text-[10px] tabular-nums text-ink-muted">
                {caption}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
