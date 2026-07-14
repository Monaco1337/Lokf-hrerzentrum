/**
 * Lightweight, deterministic Lead-Copilot heuristics.
 *
 * The "AI" experience is delivered server-side without any external model
 * call: every recommendation comes from explainable rules over the lead's
 * own data (status, score, age, last touch, document readiness, SLA).
 * This keeps the UX consistent in dev/demo and provides a stable contract
 * for the real LLM integration later — same input shape, same output
 * shape, same surface in the UI.
 */
import {
  LeadStatus,
  type LeadFullDetail,
} from "../../types";

export interface CopilotRecommendation {
  /** "Förderwahrscheinlichkeit" in 0..100. */
  fundingProbability: number;
  /** "Abschlusswahrscheinlichkeit" in 0..100. */
  closeProbability: number;
  /** One-line urgency verdict — colour key drives the badge. */
  urgency: "hot" | "today" | "this-week" | "watch";
  urgencyLabel: string;
  /** Risks the operator should be aware of, ordered by severity. */
  risks: ReadonlyArray<string>;
  /** Concrete next actions, ordered most-impactful first. */
  recommendations: ReadonlyArray<{
    label: string;
    rationale: string;
    primary?: boolean;
  }>;
}

const STAGE_RANK: Record<LeadStatus, number> = {
  NEW: 0,
  QUALIFIED: 1,
  HOT: 2,
  CONTACT_PENDING: 1,
  CONTACTED: 2,
  REPLIED: 2,
  FORWARDED: 2,
  LANDINGPAGE_OPENED: 3,
  FUNNEL_STARTED: 3,
  FUNNEL_COMPLETED: 3,
  CALL_SCHEDULED: 3,
  BRIEFING_SENT: 3,
  DOC_PENDING: 4,
  DOC_READY: 5,
  AA_APPOINTMENT_PENDING: 6,
  AA_APPOINTMENT_DONE: 7,
  GUTSCHEIN_PENDING: 8,
  GUTSCHEIN_APPROVED: 9,
  ENROLLED: 10,
  STARTED: 11,
  CLOSED: 12,
  LOST: -1,
  REJECTED: -1,
  BLOCKED: -1,
};

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function ageInDays(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}

export function buildCopilotRecommendation(
  data: LeadFullDetail,
): CopilotRecommendation {
  const lead = data.lead;
  const stage = STAGE_RANK[lead.status] ?? 0;

  // Base probabilities from the precomputed lead score.
  const fundingBase = clamp(lead.score * 0.95);
  const closeBase = clamp(lead.score * 0.85);

  // Stage drift: deeper-stage leads are statistically more likely to close.
  const stageBoost = stage > 0 ? Math.min(stage, 10) * 2 : 0;
  const stagePenalty = stage < 0 ? 80 : 0;

  // Document readiness penalty (rough proxy from documents we know about).
  const missingDocs = data.documents.filter(
    (d) => d.status === "MISSING_DATA",
  ).length;
  const docPenalty = missingDocs * 4;

  // SLA penalty — overdue leads close less reliably.
  const isOverdue = lead.slaBreachedAt !== null;
  const slaPenalty = isOverdue ? 6 : 0;

  const fundingProbability = clamp(
    fundingBase + stageBoost - stagePenalty - slaPenalty,
  );
  const closeProbability = clamp(
    closeBase + stageBoost - stagePenalty - docPenalty - slaPenalty,
  );

  // Urgency derivation.
  let urgency: CopilotRecommendation["urgency"] = "watch";
  let urgencyLabel = "Beobachten";
  const followUp = lead.nextFollowUpAt;
  const hoursToFollowUp = followUp
    ? Math.round((followUp.getTime() - Date.now()) / (60 * 60 * 1000))
    : null;
  if (isOverdue || (hoursToFollowUp !== null && hoursToFollowUp < 0)) {
    urgency = "hot";
    urgencyLabel = "Sofort handeln";
  } else if (hoursToFollowUp !== null && hoursToFollowUp <= 8) {
    urgency = "today";
    urgencyLabel = "Heute bearbeiten";
  } else if (hoursToFollowUp !== null && hoursToFollowUp <= 72) {
    urgency = "this-week";
    urgencyLabel = "Diese Woche";
  } else if (lead.priority === "HOT") {
    urgency = "today";
    urgencyLabel = "Heute kontaktieren";
  }

  // Risks — explainable, sorted by severity.
  const risks: string[] = [];
  if (isOverdue) risks.push("SLA überschritten — Erstkontakt-Frist verpasst.");
  if (missingDocs >= 2)
    risks.push(`${missingDocs} Unterlagen fehlen noch — Risiko für AA-Termin.`);
  if (stage <= 1 && ageInDays(lead.createdAt) > 5)
    risks.push("Lead älter als 5 Tage ohne Qualifizierung — Cool-Down-Risiko.");
  if (data.callLogs.length === 0 && stage >= 2)
    risks.push("Bisher kein dokumentierter Anruf — Kontakt fehlt.");
  if (lead.priority === "BLOCKED")
    risks.push("Lead ist blockiert (K.O.-Kriterium aktiv).");

  // Recommendations — mutable builder; the returned shape is readonly.
  const recs: Array<{ label: string; rationale: string; primary?: boolean }> = [];
  if (data.callLogs.length === 0 && stage >= 1) {
    recs.push({
      label: "Erstgespräch führen",
      rationale: "Noch kein Anruf dokumentiert — Erstkontakt freischalten.",
      primary: true,
    });
  }
  if (lead.status === LeadStatus.DOC_PENDING || missingDocs >= 2) {
    recs.push({
      label: "Unterlagen anfordern (WhatsApp)",
      rationale: "Lead wartet auf Lebenslauf / Nachweise.",
      primary: recs.length === 0,
    });
  }
  if (lead.status === LeadStatus.DOC_READY) {
    recs.push({
      label: "AA-Termin koordinieren",
      rationale: "Unterlagen vollständig — Termin mit AA vereinbaren.",
      primary: recs.length === 0,
    });
  }
  if (lead.status === LeadStatus.AA_APPOINTMENT_PENDING) {
    recs.push({
      label: "AA-Termin nachhalten",
      rationale: "Termin steht an — Lead vorbereiten und nachfassen.",
      primary: recs.length === 0,
    });
  }
  if (lead.status === LeadStatus.GUTSCHEIN_PENDING) {
    recs.push({
      label: "Gutschein-Status prüfen",
      rationale: "Antrag bei AA gestellt — auf Bewilligung warten.",
    });
  }
  if (lead.status === LeadStatus.GUTSCHEIN_APPROVED) {
    recs.push({
      label: "Vertrag einleiten",
      rationale: "Gutschein bewilligt — Einschreibung abschließen.",
      primary: true,
    });
  }
  if (recs.length === 0) {
    recs.push({
      label: "Lead beobachten",
      rationale: "Keine sofortige Aktion notwendig — turnusgemäß prüfen.",
    });
  }

  return {
    fundingProbability,
    closeProbability,
    urgency,
    urgencyLabel,
    risks,
    recommendations: recs,
  };
}
