/**
 * LeadCommandSummary — the heart of the lead command center.
 *
 * Sits directly under the LeadHeader and answers, in <10 seconds:
 *   • Abschlusschance     — closing probability (from copilot heuristic)
 *   • Risiko              — risk level (low / medium / high)
 *   • Fehlende Schritte   — count of journey stages still pending
 *   • Nächste Frist       — next concrete deadline (callback or SLA)
 *
 * Below that:
 *   • KI-Zusammenfassung   — 1–2 sentences derived from the heuristic
 *   • Operative Ampel      — Kontakt / Unterlagen / Agentur / Gutschein / Anmeldung
 *   • JETZT TUN            — the top recommendation as a big card
 *
 * Pure presentation, no client behaviour. All inputs come from the
 * existing copilot heuristic + LeadFullDetail.
 */
import type { CopilotRecommendation } from "../sales/copilotHeuristics";
import { LeadStatus, type LeadFullDetail } from "../../types";

interface Props {
  data: LeadFullDetail;
  copilot: CopilotRecommendation;
  /** Display name of the assigned operator, if any. */
  assignedToName: string | null;
}

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

const DT_FMT = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type LightTone = "green" | "amber" | "red" | "gray";

interface OperativeStep {
  label: string;
  tone: LightTone;
  detail: string;
}

function classifyRisk(copilot: CopilotRecommendation): {
  level: "Niedrig" | "Mittel" | "Hoch";
  tone: "green" | "amber" | "red";
} {
  if (copilot.urgency === "hot" || copilot.risks.length >= 3)
    return { level: "Hoch", tone: "red" };
  if (copilot.risks.length >= 1 || copilot.urgency === "today")
    return { level: "Mittel", tone: "amber" };
  return { level: "Niedrig", tone: "green" };
}

function countMissingSteps(currentStatus: LeadStatus): number {
  const idx = STAGE_ORDER.indexOf(currentStatus);
  if (idx < 0) return STAGE_ORDER.length;
  // Lead → Start = 14 journey transitions; ENROLLED counts as "anmeldung",
  // STARTED/CLOSED = abgeschlossen.
  const remaining = STAGE_ORDER.length - 1 - idx;
  return Math.max(0, remaining);
}

function buildOperativeAmpel(data: LeadFullDetail): OperativeStep[] {
  const { lead, documents, callLogs } = data;
  const idx = STAGE_ORDER.indexOf(lead.status);

  // Kontakt
  let kontakt: LightTone = "gray";
  let kontaktDetail = "Erstkontakt steht aus";
  if (callLogs.length > 0) {
    kontakt = "green";
    kontaktDetail = `${callLogs.length} Anruf${callLogs.length === 1 ? "" : "e"} dokumentiert`;
  } else if (idx >= STAGE_ORDER.indexOf(LeadStatus.CONTACTED)) {
    kontakt = "amber";
    kontaktDetail = "Status sagt kontaktiert, keine Calls dokumentiert";
  } else if (lead.slaBreachedAt) {
    kontakt = "red";
    kontaktDetail = "SLA verstrichen";
  }

  // Unterlagen
  const missing = documents.filter((d) => d.status === "MISSING_DATA").length;
  const ready = documents.filter(
    (d) => d.status === "SENT" || d.status === "GENERATED" || d.status === "UPDATED",
  ).length;
  let unterlagen: LightTone = "gray";
  let unterlagenDetail = "Noch nichts angefordert";
  if (missing > 0) {
    unterlagen = "amber";
    unterlagenDetail = `${missing} Dokument${missing === 1 ? "" : "e"} fehlen`;
  }
  if (ready > 0 && missing === 0 && documents.length > 0) {
    unterlagen = "green";
    unterlagenDetail = `${ready} Dokument${ready === 1 ? "" : "e"} vollständig`;
  }
  if (lead.status === LeadStatus.DOC_PENDING && missing >= 2) {
    unterlagen = "red";
    unterlagenDetail = `${missing} Dokumente fehlen — blockiert AA-Termin`;
  }

  // Agentur (AA)
  let agentur: LightTone = "gray";
  let agenturDetail = "Termin noch nicht koordiniert";
  if (lead.status === LeadStatus.AA_APPOINTMENT_PENDING) {
    agentur = "amber";
    agenturDetail = "Termin offen — nachhalten";
  } else if (lead.status === LeadStatus.AA_APPOINTMENT_DONE) {
    agentur = "green";
    agenturDetail = "Termin abgeschlossen";
  } else if (idx > STAGE_ORDER.indexOf(LeadStatus.AA_APPOINTMENT_DONE)) {
    agentur = "green";
    agenturDetail = "AA-Termin durchlaufen";
  }
  if (
    idx >= STAGE_ORDER.indexOf(LeadStatus.DOC_READY) &&
    idx < STAGE_ORDER.indexOf(LeadStatus.AA_APPOINTMENT_PENDING)
  ) {
    agentur = "red";
    agenturDetail = "Unterlagen fertig, Termin fehlt";
  }

  // Bildungsgutschein
  let gutschein: LightTone = "gray";
  let gutscheinDetail = "Antrag steht aus";
  if (lead.status === LeadStatus.GUTSCHEIN_PENDING) {
    gutschein = "amber";
    gutscheinDetail = "Antrag bei Agentur — Rückmeldung erwartet";
  } else if (
    lead.status === LeadStatus.GUTSCHEIN_APPROVED ||
    idx > STAGE_ORDER.indexOf(LeadStatus.GUTSCHEIN_APPROVED)
  ) {
    gutschein = "green";
    gutscheinDetail = "Bewilligt";
  }

  // Anmeldung
  let anmeldung: LightTone = "gray";
  let anmeldungDetail = "Noch nicht eingeschrieben";
  if (lead.status === LeadStatus.ENROLLED) {
    anmeldung = "amber";
    anmeldungDetail = "Eingeschrieben, Start vorbereiten";
  } else if (lead.status === LeadStatus.STARTED || lead.status === LeadStatus.CLOSED) {
    anmeldung = "green";
    anmeldungDetail = "Weiterbildung gestartet";
  }

  return [
    { label: "Kontakt", tone: kontakt, detail: kontaktDetail },
    { label: "Unterlagen", tone: unterlagen, detail: unterlagenDetail },
    { label: "Agentur", tone: agentur, detail: agenturDetail },
    { label: "Gutschein", tone: gutschein, detail: gutscheinDetail },
    { label: "Anmeldung", tone: anmeldung, detail: anmeldungDetail },
  ];
}

function buildSummarySentence(
  data: LeadFullDetail,
  copilot: CopilotRecommendation,
): string {
  const lead = data.lead;
  const prob = Math.round(copilot.closeProbability);
  const tone =
    prob >= 75 ? "Hohe Abschlusswahrscheinlichkeit." :
    prob >= 50 ? "Mittlere Abschlusswahrscheinlichkeit." :
    "Niedrige Abschlusswahrscheinlichkeit.";

  const blocker =
    data.documents.filter((d) => d.status === "MISSING_DATA").length > 0
      ? "Unterlagen fehlen noch."
      : lead.status === LeadStatus.AA_APPOINTMENT_PENDING
        ? "Agenturtermin vorbereiten."
        : lead.status === LeadStatus.GUTSCHEIN_PENDING
          ? "Auf Bewilligung warten."
          : lead.status === LeadStatus.NEW || lead.status === LeadStatus.CONTACT_PENDING
            ? "Erstkontakt noch ausstehend."
            : null;

  const nextDue = lead.nextFollowUpAt;
  const nextTouch = nextDue ? `Nächster Kontakt: ${DT_FMT.format(nextDue)}.` : "";

  return [tone, blocker, nextTouch].filter(Boolean).join(" ");
}

const LIGHT_CLS: Record<LightTone, { dot: string; ring: string; label: string }> = {
  green: { dot: "bg-emerald-400", ring: "ring-emerald-500/30", label: "text-emerald-300" },
  amber: { dot: "bg-amber-400", ring: "ring-amber-500/30", label: "text-amber-300" },
  red: { dot: "bg-red-400", ring: "ring-red-500/30", label: "text-red-300" },
  gray: { dot: "bg-zinc-500", ring: "ring-white/[0.08]", label: "text-zinc-400" },
};

export function LeadCommandSummary({ data, copilot, assignedToName }: Props) {
  const { lead } = data;
  const risk = classifyRisk(copilot);
  const missing = countMissingSteps(lead.status);
  const ampel = buildOperativeAmpel(data);
  const summary = buildSummarySentence(data, copilot);
  const primaryRec =
    copilot.recommendations.find((r) => r.primary) ?? copilot.recommendations[0];

  const nextDeadline = lead.nextFollowUpAt
    ? DT_FMT.format(lead.nextFollowUpAt)
    : lead.slaBreachedAt
      ? "SLA verletzt"
      : "keine Frist gesetzt";

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#0d0d0f] p-5">
      {/* ----------------------------- ROW 1: Smart Stats ----------------------------- */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Abschlusschance"
          value={`${Math.round(copilot.closeProbability)} %`}
          hint={`Förderwahrsch. ${Math.round(copilot.fundingProbability)} %`}
          tone="green"
        />
        <Stat
          label="Risiko"
          value={risk.level}
          hint={
            copilot.risks.length === 0
              ? "Keine kritischen Risiken"
              : `${copilot.risks.length} Risikofaktor${copilot.risks.length === 1 ? "" : "en"}`
          }
          tone={risk.tone}
        />
        <Stat
          label="Fehlende Schritte"
          value={String(missing)}
          hint={`Status ${STAGE_ORDER.indexOf(lead.status) + 1} von ${STAGE_ORDER.length}`}
          tone={missing >= 8 ? "amber" : missing >= 4 ? "blue" : "green"}
        />
        <Stat
          label="Nächste Frist"
          value={nextDeadline}
          hint={lead.slaBreachedAt ? "SLA bereits verletzt" : "Folgekontakt fällig"}
          tone={
            lead.slaBreachedAt
              ? "red"
              : lead.nextFollowUpAt && lead.nextFollowUpAt.getTime() < Date.now() + 86_400_000
                ? "amber"
                : "blue"
          }
        />
      </ul>

      {/* ----------------------------- ROW 2: KI Summary ----------------------------- */}
      <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-[10px] font-bold text-black">
            KI
          </span>
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-emerald-200">
              KI-Zusammenfassung
            </p>
            <p className="mt-0.5 text-[13.5px] leading-snug text-zinc-100">
              {summary}
            </p>
            {copilot.urgencyLabel && (
              <p className="mt-1 text-[11px] text-zinc-400">
                Dringlichkeit: <span className="font-semibold text-zinc-200">{copilot.urgencyLabel}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------- ROW 3: Operative Ampel ----------------------------- */}
      <p className="ops-eyebrow mt-5">Operative Ampel</p>
      <ul className="mt-2 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {ampel.map((s) => {
          const cls = LIGHT_CLS[s.tone];
          return (
            <li
              key={s.label}
              className={`rounded-lg border border-white/[0.06] bg-[#161618] p-3 ring-1 ring-inset ${cls.ring}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-zinc-300">
                  {s.label}
                </p>
                <span
                  aria-hidden
                  className={`inline-block h-2.5 w-2.5 rounded-full ${cls.dot}`}
                />
              </div>
              <p className={`mt-0.5 text-[10.5px] leading-tight ${cls.label}`}>
                {s.detail}
              </p>
            </li>
          );
        })}
      </ul>

      {/* ----------------------------- ROW 4: Jetzt Tun ----------------------------- */}
      {primaryRec && (
        <div className="mt-5 overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.12] via-emerald-500/[0.06] to-transparent p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                Jetzt tun
              </p>
              <h2 className="mt-1 text-[20px] font-bold tracking-tight text-white">
                {primaryRec.label}
              </h2>
              <p className="mt-1 max-w-xl text-[12.5px] leading-snug text-zinc-300">
                {primaryRec.rationale}
              </p>
            </div>
            <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
              <dt className="text-zinc-500">Fälligkeit</dt>
              <dd className="text-right font-semibold text-zinc-100">
                {lead.nextFollowUpAt
                  ? DT_FMT.format(lead.nextFollowUpAt)
                  : "heute"}
              </dd>
              <dt className="text-zinc-500">Verantwortlich</dt>
              <dd className="text-right font-semibold text-zinc-100">
                {assignedToName ?? "nicht zugewiesen"}
              </dd>
            </dl>
          </div>
        </div>
      )}

      {copilot.risks.length > 0 && (
        <div className="mt-5">
          <p className="ops-eyebrow">Risikofaktoren</p>
          <ul className="mt-2 space-y-1.5">
            {copilot.risks.map((r, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[12px] text-zinc-300"
              >
                <span
                  aria-hidden
                  className="mt-1 inline-block h-1 w-1 shrink-0 rounded-full bg-red-400"
                />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "green" | "amber" | "red" | "blue";
}) {
  const accent = {
    green: "text-emerald-300",
    amber: "text-amber-300",
    red: "text-red-300",
    blue: "text-blue-300",
  }[tone];
  return (
    <li className="rounded-lg border border-white/[0.06] bg-[#161618] p-3.5">
      <p className="ops-eyebrow">{label}</p>
      <p className={`mt-1 text-[24px] font-bold leading-none tabular-nums ${accent}`}>
        {value}
      </p>
      <p className="mt-1 text-[10.5px] text-zinc-500">{hint}</p>
    </li>
  );
}
