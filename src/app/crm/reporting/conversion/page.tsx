import { redirect } from "next/navigation";

import { can } from "@/features/fairtrain-funnel/auth/permissions";
import { LeadStatus } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";

export const dynamic = "force-dynamic";

interface Stage {
  key: string;
  label: string;
  matches: ReadonlyArray<LeadStatus>;
  /** All stages at-or-after this one count as having passed. */
  inclusiveAtOrAfter: ReadonlyArray<LeadStatus>;
}

const STAGES: ReadonlyArray<Stage> = [
  {
    key: "lead",
    label: "Lead",
    matches: [
      LeadStatus.NEW,
      LeadStatus.QUALIFIED,
      LeadStatus.HOT,
    ],
    inclusiveAtOrAfter: [],
  },
  {
    key: "kontakt",
    label: "Kontakt hergestellt",
    matches: [
      LeadStatus.CONTACTED,
      LeadStatus.CONTACT_PENDING,
      LeadStatus.CALL_SCHEDULED,
      LeadStatus.BRIEFING_SENT,
    ],
    inclusiveAtOrAfter: [],
  },
  {
    key: "doc",
    label: "Unterlagen erhalten",
    matches: [LeadStatus.DOC_PENDING, LeadStatus.DOC_READY],
    inclusiveAtOrAfter: [],
  },
  {
    key: "aa",
    label: "AA-Termin",
    matches: [
      LeadStatus.AA_APPOINTMENT_PENDING,
      LeadStatus.AA_APPOINTMENT_DONE,
    ],
    inclusiveAtOrAfter: [],
  },
  {
    key: "gutschein",
    label: "Gutschein beantragt",
    matches: [LeadStatus.GUTSCHEIN_PENDING],
    inclusiveAtOrAfter: [],
  },
  {
    key: "bewilligt",
    label: "Bewilligt",
    matches: [LeadStatus.GUTSCHEIN_APPROVED],
    inclusiveAtOrAfter: [],
  },
  {
    key: "start",
    label: "Ausbildungsstart",
    matches: [LeadStatus.ENROLLED, LeadStatus.STARTED, LeadStatus.CLOSED],
    inclusiveAtOrAfter: [],
  },
];

const STAGE_ORDER: ReadonlyArray<LeadStatus> = [
  LeadStatus.NEW,
  LeadStatus.QUALIFIED,
  LeadStatus.HOT,
  LeadStatus.CONTACT_PENDING,
  LeadStatus.CONTACTED,
  LeadStatus.CALL_SCHEDULED,
  LeadStatus.BRIEFING_SENT,
  LeadStatus.DOC_PENDING,
  LeadStatus.DOC_READY,
  LeadStatus.AA_APPOINTMENT_PENDING,
  LeadStatus.AA_APPOINTMENT_DONE,
  LeadStatus.GUTSCHEIN_PENDING,
  LeadStatus.GUTSCHEIN_APPROVED,
  LeadStatus.ENROLLED,
  LeadStatus.STARTED,
  LeadStatus.CLOSED,
];

export default async function ConversionReportPage() {
  const currentUser = await requireCrmUser();
  if (!can(currentUser.role, "canViewAnalytics")) redirect("/crm");

  const leads = await leadRepository.list({});
  // Exclude LOST/REJECTED/BLOCKED from the funnel — they are drop-off counts.
  const active = leads.filter(
    (l) =>
      l.status !== LeadStatus.LOST &&
      l.status !== LeadStatus.REJECTED &&
      l.status !== LeadStatus.BLOCKED,
  );

  const total = active.length;
  if (total === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-navy-950">Conversion</h1>
        <p className="text-[13.5px] text-ink-soft">Noch keine Daten.</p>
      </div>
    );
  }

  // For each stage compute "wie viele Leads HABEN diese Phase erreicht oder
  // überschritten" — also passed the funnel up to this step.
  const stageIdxOf = (s: LeadStatus) => STAGE_ORDER.indexOf(s);
  const countsPassed: number[] = STAGES.map((stage) => {
    const minIdx = Math.min(
      ...stage.matches.map((m) => stageIdxOf(m)),
    );
    return active.filter((l) => stageIdxOf(l.status) >= minIdx).length;
  });

  const maxCount = countsPassed[0] ?? 1;
  const drops = STAGES.map((_s, i) => {
    if (i === 0) return 0;
    const prev = countsPassed[i - 1] ?? 0;
    const cur = countsPassed[i] ?? 0;
    return prev - cur;
  });
  const worstDropIdx = drops.indexOf(Math.max(...drops));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
          Reporting
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-navy-950">Conversion</h1>
        <p className="mt-1 text-[13.5px] text-ink-soft">
          Funnel von Lead bis Ausbildungsstart. Der größte Abbruchpunkt wird
          automatisch hervorgehoben.
        </p>
      </header>

      <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
        <ol className="space-y-2">
          {STAGES.map((s, i) => {
            const cur = countsPassed[i] ?? 0;
            const pct = Math.round((cur / maxCount) * 100);
            const isWorst = i === worstDropIdx && drops[i]! > 0;
            return (
              <li key={s.key}>
                <div className="flex items-center justify-between text-[12.5px]">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-ink-soft">
                      {i + 1}
                    </span>
                    <span className="font-medium text-navy-950">{s.label}</span>
                    {isWorst && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                        Größter Abbruch
                      </span>
                    )}
                  </div>
                  <span className="text-ink-soft">
                    {cur}{" "}
                    <span className="text-ink-muted">
                      / {maxCount} ({pct}%)
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={[
                      "h-full rounded-full",
                      isWorst
                        ? "bg-gradient-to-r from-rose-500 to-rose-700"
                        : "bg-gradient-to-r from-brand-700 to-accent-600",
                    ].join(" ")}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {i > 0 && drops[i]! > 0 && (
                  <p className="mt-1 text-[11px] text-ink-muted">
                    Abbruch: {drops[i]} Leads aus &bdquo;{STAGES[i - 1]!.label}&ldquo; sind
                    nicht weitergekommen.
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
