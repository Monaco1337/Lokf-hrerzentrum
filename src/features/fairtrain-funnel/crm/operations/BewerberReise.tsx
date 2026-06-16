/**
 * BewerberReise — the 9-stage applicant journey, rendered inside the Lead
 * Command Center. Each step shows:
 *   - Stage number + label (from the ops brief)
 *   - State: done / current / pending
 *   - Date when the lead entered that stage (derived from StatusHistory)
 *   - Responsible operator (assignedToUser for the current/last step)
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
  /** Lead statuses that mark this stage as reached. */
  statuses: ReadonlyArray<LeadStatus>;
}

const STAGES: ReadonlyArray<Stage> = [
  { rank: 1, key: "lead", label: "Lead erhalten", statuses: [LeadStatus.NEW] },
  {
    rank: 2,
    key: "contact",
    label: "Kontakt hergestellt",
    statuses: [LeadStatus.CONTACT_PENDING, LeadStatus.CONTACTED, LeadStatus.CALL_SCHEDULED],
  },
  {
    rank: 3,
    key: "qualified",
    label: "Qualifiziert",
    statuses: [LeadStatus.QUALIFIED, LeadStatus.HOT, LeadStatus.BRIEFING_SENT],
  },
  {
    rank: 4,
    key: "docs",
    label: "Unterlagen erhalten",
    statuses: [LeadStatus.DOC_READY],
  },
  {
    rank: 5,
    key: "appointment",
    label: "Agenturtermin",
    statuses: [LeadStatus.AA_APPOINTMENT_PENDING, LeadStatus.AA_APPOINTMENT_DONE],
  },
  {
    rank: 6,
    key: "voucherPending",
    label: "Gutschein beantragt",
    statuses: [LeadStatus.GUTSCHEIN_PENDING],
  },
  {
    rank: 7,
    key: "voucherApproved",
    label: "Gutschein erhalten",
    statuses: [LeadStatus.GUTSCHEIN_APPROVED],
  },
  { rank: 8, key: "enrolled", label: "Anmeldung", statuses: [LeadStatus.ENROLLED] },
  {
    rank: 9,
    key: "started",
    label: "Weiterbildung gestartet",
    statuses: [LeadStatus.STARTED, LeadStatus.CLOSED],
  },
];

/** Linear rank assignment for status — drives "is done" comparison. */
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
  hour: "2-digit",
  minute: "2-digit",
});

export function BewerberReise({
  lead,
  history,
}: {
  lead: LeadDetail;
  history: ReadonlyArray<StatusHistoryEntry>;
}) {
  const currentRank = STATUS_RANK[lead.status] ?? 1;

  // Build "entered stage at" map from status history
  const enteredAt = new Map<string, Date>();
  // History is typically ordered newest-first; iterate newest → oldest so the
  // oldest timestamp wins (we want first time the lead entered the stage).
  const sortedHistory = [...history].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  for (const h of sortedHistory) {
    const stage = STAGES.find((s) =>
      s.statuses.includes(h.toStatus as LeadStatus),
    );
    if (stage && !enteredAt.has(stage.key)) {
      enteredAt.set(stage.key, h.createdAt);
    }
  }
  // The first stage ("Lead erhalten") is the lead's createdAt
  if (!enteredAt.has("lead")) enteredAt.set("lead", lead.createdAt);

  const owner: UserRef | null = lead.assignedToUser ?? null;

  return (
    <section className="ops-card-elevated p-5">
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="ops-eyebrow">Bewerber-Reise</p>
          <h2 className="mt-1 text-[16px] font-bold tracking-tight text-white">
            Wo steht {lead.firstName}?
          </h2>
        </div>
        <span className="ops-chip ops-chip-orange">
          Stufe {currentRank} / {STAGES.length}
        </span>
      </header>

      <ol className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {STAGES.map((stage) => {
          const state =
            stage.rank < currentRank
              ? "done"
              : stage.rank === currentRank
                ? "current"
                : "pending";
          const enteredDate = enteredAt.get(stage.key);
          return (
            <li
              key={stage.key}
              className={[
                "relative rounded-lg border p-3 transition",
                state === "current"
                  ? "border-orange-500/40 bg-orange-500/[0.06]"
                  : state === "done"
                    ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                    : "border-white/[0.06] bg-white/[0.02]",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    state === "done"
                      ? "bg-emerald-500 text-black"
                      : state === "current"
                        ? "bg-orange-500 text-black ring-2 ring-orange-500/30"
                        : "bg-white/[0.06] text-zinc-500",
                  ].join(" ")}
                >
                  {state === "done" ? "✓" : stage.rank}
                </span>
                <span
                  className={[
                    "text-[12.5px] font-semibold",
                    state === "pending" ? "text-zinc-500" : "text-white",
                  ].join(" ")}
                >
                  {stage.label}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px]">
                <span
                  className={
                    enteredDate
                      ? "tabular-nums text-zinc-400"
                      : "italic text-zinc-600"
                  }
                >
                  {enteredDate ? DATE_FMT.format(enteredDate) : "ausstehend"}
                </span>
                {state === "current" && owner && (
                  <span
                    title={`Verantwortlich: ${owner.name}`}
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-[8px] font-bold text-black"
                  >
                    {owner.name
                      .split(/\s+/)
                      .map((p) => p[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
