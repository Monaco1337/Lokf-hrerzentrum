/**
 * Lead Insights — pure, deterministic per-lead intelligence.
 *
 * Computes the four pillars of the Lead Control Center decision support:
 *
 *   1. Close probability   — chance this lead completes the funnel
 *   2. Funding probability — chance the Bildungsgutschein gets approved
 *   3. Urgency             — how time-critical the lead is right now
 *   4. Next-best-action    — what an operator should do next, in plain German
 *
 * The function is intentionally pure: it takes a `LeadSummary` plus a single
 * extra signal (`lastOutboundAt`, derived from CommunicationEvent) and a
 * `now` clock and returns a self-contained `LeadInsights` object. No I/O,
 * no DB access, no side effects.
 *
 * Heuristics are explicit and explained inline. They are deliberately simple
 * so a Principal Architect can audit them at a glance — and they form the
 * stable contract that a future LLM-based provider (Phase 8) can replace.
 */
import {
  type EmploymentStatus,
  type FunnelPath,
  type LeadInsights,
  type LeadStatus as LeadStatusType,
  type LeadSummary,
  type LeadUrgency,
  type NextBestAction,
  type PreferredLocation,
  LeadPriority,
  LeadStatus,
  PreferredLocation as PreferredLocationConst,
} from "../types";
import { HOT_SLA_MINUTES } from "../utils/sla";

export interface LeadInsightsInput {
  lead: LeadSummary;
  /** Timestamp of the most recent outbound communication (any channel). */
  lastOutboundAt: Date | null;
  /** Injected clock for deterministic tests. Defaults to `new Date()`. */
  now?: Date;
}

// ---------------------------------------------------------------------------
// Progress map — how far along the funnel a status is.
// Calibrated to the Phase-2 16-step pipeline. CLOSED is 1.0, dropouts are 0.
// ---------------------------------------------------------------------------
const STATUS_PROGRESS: Record<LeadStatusType, number> = {
  [LeadStatus.NEW]: 0.05,
  [LeadStatus.QUALIFIED]: 0.1,
  [LeadStatus.HOT]: 0.12,
  [LeadStatus.CONTACT_PENDING]: 0.15,
  [LeadStatus.CONTACTED]: 0.25,
  [LeadStatus.CALL_SCHEDULED]: 0.32,
  [LeadStatus.BRIEFING_SENT]: 0.38,
  [LeadStatus.DOC_PENDING]: 0.45,
  [LeadStatus.DOC_READY]: 0.55,
  [LeadStatus.AA_APPOINTMENT_PENDING]: 0.65,
  [LeadStatus.AA_APPOINTMENT_DONE]: 0.72,
  [LeadStatus.GUTSCHEIN_PENDING]: 0.82,
  [LeadStatus.GUTSCHEIN_APPROVED]: 0.9,
  [LeadStatus.ENROLLED]: 0.95,
  [LeadStatus.STARTED]: 0.98,
  [LeadStatus.CLOSED]: 1,
  [LeadStatus.LOST]: 0,
  [LeadStatus.REJECTED]: 0,
  [LeadStatus.BLOCKED]: 0,
};

/** Statuses where the lead is still ours to chase (not stalled by an agency). */
const ACTIVELY_WORKED: ReadonlySet<LeadStatusType> = new Set([
  LeadStatus.NEW,
  LeadStatus.QUALIFIED,
  LeadStatus.HOT,
  LeadStatus.CONTACT_PENDING,
  LeadStatus.CONTACTED,
  LeadStatus.CALL_SCHEDULED,
  LeadStatus.BRIEFING_SENT,
  LeadStatus.DOC_PENDING,
]);

/** Statuses with effectively zero forward motion regardless of score. */
const DEAD_END: ReadonlySet<LeadStatusType> = new Set([
  LeadStatus.LOST,
  LeadStatus.REJECTED,
  LeadStatus.BLOCKED,
]);

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

// ---------------------------------------------------------------------------
// Probabilities
// ---------------------------------------------------------------------------

/**
 * Close probability — soft, explainable blend of:
 *   60 % funnel progress      (where the lead actually sits today)
 *   40 % normalised lead score (how qualified the lead is)
 * minus penalties for SLA breaches and staleness, plus a small momentum bonus
 * when contact was made in the last 48 h.
 */
function computeCloseProbability(
  lead: LeadSummary,
  lastOutboundAt: Date | null,
  now: Date,
): number {
  if (DEAD_END.has(lead.status)) return 0;
  if (lead.status === LeadStatus.CLOSED) return 1;

  const progress = STATUS_PROGRESS[lead.status];
  const scoreFraction = clamp01(lead.score / 100);
  let base = 0.6 * progress + 0.4 * scoreFraction;

  if (lead.slaBreachedAt) base -= 0.15;

  // Staleness penalty — no outbound in the last 7 days while in an actively
  // worked status is a strong drop-off signal.
  if (ACTIVELY_WORKED.has(lead.status) && lastOutboundAt) {
    const sinceMs = now.getTime() - lastOutboundAt.getTime();
    if (sinceMs > 7 * DAY_MS) base -= 0.1;
  }

  // Momentum bonus — recent outbound contact pulls the prob slightly up.
  if (lastOutboundAt) {
    const sinceMs = now.getTime() - lastOutboundAt.getTime();
    if (sinceMs < 2 * DAY_MS) base += 0.05;
  }

  if (lead.priority === LeadPriority.HOT) base += 0.05;
  if (lead.priority === LeadPriority.BLOCKED) return 0;

  return clamp01(base);
}

/**
 * Funding probability — likelihood of Bildungsgutschein approval.
 * UNEMPLOYED is the strongest signal (regular WeGebAU route).
 * EMPLOYED leads can still get funded but the bar is higher (Qualifizierungs-
 * chancengesetz). Geography and score modulate.
 */
function computeFundingProbability(lead: LeadSummary): number {
  if (DEAD_END.has(lead.status)) return 0;
  if (
    lead.status === LeadStatus.GUTSCHEIN_APPROVED ||
    lead.status === LeadStatus.ENROLLED ||
    lead.status === LeadStatus.STARTED ||
    lead.status === LeadStatus.CLOSED
  ) {
    return 1;
  }
  if (lead.priority === LeadPriority.BLOCKED) return 0;

  let base = 0.2;
  if (lead.funnelPath === ("UNEMPLOYED" satisfies FunnelPath)) {
    base += 0.45;
  } else if (lead.funnelPath === ("EMPLOYED" satisfies FunnelPath)) {
    base += 0.2;
  }
  if (lead.preferredLocation !== PreferredLocationConst.UNDECIDED) {
    base += 0.1;
  }
  if (lead.acceptsShiftWork) base += 0.05;
  if (lead.score >= 80) base += 0.15;
  else if (lead.score >= 50) base += 0.08;

  // Already past the agency hurdle? Almost certain.
  if (lead.status === LeadStatus.AA_APPOINTMENT_DONE) base = Math.max(base, 0.85);
  if (lead.status === LeadStatus.GUTSCHEIN_PENDING) base = Math.max(base, 0.9);

  return clamp01(base);
}

// ---------------------------------------------------------------------------
// Urgency
// ---------------------------------------------------------------------------

function isEndOfTodayPassed(at: Date, now: Date): boolean {
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  return at <= endOfToday;
}

function computeUrgency(
  lead: LeadSummary,
  lastOutboundAt: Date | null,
  now: Date,
): LeadUrgency {
  if (DEAD_END.has(lead.status) || lead.status === LeadStatus.CLOSED) {
    return "normal";
  }

  // SLA breach is the strongest signal.
  if (lead.slaBreachedAt) return "overdue";

  // HOT priority + still waiting for first contact.
  if (
    lead.priority === LeadPriority.HOT &&
    (lead.status === LeadStatus.NEW ||
      lead.status === LeadStatus.QUALIFIED ||
      lead.status === LeadStatus.HOT ||
      lead.status === LeadStatus.CONTACT_PENDING)
  ) {
    // Compute soft HOT SLA — if creation was longer than the SLA ago we treat
    // it as overdue even before the sweep job persists slaBreachedAt.
    const ageMin = (now.getTime() - lead.createdAt.getTime()) / 60_000;
    if (ageMin > HOT_SLA_MINUTES) return "overdue";
    return "today";
  }

  // Follow-up due today (or earlier).
  if (lead.nextFollowUpAt) {
    if (lead.nextFollowUpAt < now) return "overdue";
    if (isEndOfTodayPassed(lead.nextFollowUpAt, now)) return "today";
  }

  // Drop-off risk — actively worked, no outbound for 5+ days.
  if (ACTIVELY_WORKED.has(lead.status) && lastOutboundAt) {
    const sinceMs = now.getTime() - lastOutboundAt.getTime();
    if (sinceMs > 5 * DAY_MS) return "today";
    if (sinceMs > 2 * DAY_MS) return "soon";
  }

  return "normal";
}

// ---------------------------------------------------------------------------
// Next-best-action engine
// ---------------------------------------------------------------------------

function waLink(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+")
    ? digits.slice(1)
    : digits.startsWith("0")
      ? `49${digits.slice(1)}`
      : digits;
  return `https://wa.me/${e164}`;
}

function buildCallAction(lead: LeadSummary, urgency: LeadUrgency): NextBestAction {
  const tone: NextBestAction["tone"] =
    urgency === "overdue" ? "critical" : "urgent";
  return {
    kind: "call",
    label: "Sofort anrufen",
    reason:
      urgency === "overdue"
        ? "Antwortfenster überschritten — jetzt sofort durchrufen."
        : "Hot Lead, noch nicht kontaktiert. Jede Minute zählt.",
    tone,
    href: `tel:${lead.phone}`,
  };
}

function buildQualifyAction(): NextBestAction {
  return {
    kind: "qualify",
    label: "Lead qualifizieren",
    reason: "Eignung prüfen und Status anheben.",
    tone: "active",
  };
}

const ACTION_BY_STATUS: Partial<Record<LeadStatusType, NextBestAction>> = {
  [LeadStatus.CONTACT_PENDING]: {
    kind: "call",
    label: "Anrufen",
    reason: "Kontakt geplant — Telefonat führen.",
    tone: "active",
  },
  [LeadStatus.CONTACTED]: {
    kind: "schedule_call",
    label: "Folgetermin setzen",
    reason: "Folgetelefonat fürs Briefing einplanen.",
    tone: "active",
  },
  [LeadStatus.CALL_SCHEDULED]: {
    kind: "send_briefing",
    label: "Briefing senden",
    reason: "Infomaterial vor dem nächsten Termin rausschicken.",
    tone: "active",
  },
  [LeadStatus.BRIEFING_SENT]: {
    kind: "request_docs",
    label: "Unterlagen anfordern",
    reason: "Lebenslauf, Ausweis und Zeugnisse anfragen.",
    tone: "active",
  },
  [LeadStatus.DOC_PENDING]: {
    kind: "request_docs",
    label: "Unterlagen nachhalten",
    reason: "Erinnerung an die offenen Dokumente.",
    tone: "warning",
  },
  [LeadStatus.DOC_READY]: {
    kind: "schedule_aa",
    label: "AA-Termin anstoßen",
    reason: "Unterlagen vollständig — Agenturtermin vereinbaren.",
    tone: "active",
  },
  [LeadStatus.AA_APPOINTMENT_PENDING]: {
    kind: "schedule_aa",
    label: "Termin nachhalten",
    reason: "AA-Termin steht aus — Datum bestätigen.",
    tone: "wait",
  },
  [LeadStatus.AA_APPOINTMENT_DONE]: {
    kind: "follow_voucher",
    label: "Gutschein beantragen",
    reason: "Termin erledigt — Bildungsgutschein-Antrag stellen.",
    tone: "active",
  },
  [LeadStatus.GUTSCHEIN_PENDING]: {
    kind: "follow_voucher",
    label: "Gutschein nachfassen",
    reason: "Status bei der Agentur erfragen.",
    tone: "wait",
  },
  [LeadStatus.GUTSCHEIN_APPROVED]: {
    kind: "confirm_contract",
    label: "Vertrag bestätigen",
    reason: "Gutschein bewilligt — Vertrag mit dem Lead schließen.",
    tone: "success",
  },
  [LeadStatus.ENROLLED]: {
    kind: "confirm_start",
    label: "Start bestätigen",
    reason: "Vertrag steht — Ausbildungsstart bestätigen.",
    tone: "success",
  },
  [LeadStatus.STARTED]: {
    kind: "close_case",
    label: "Abschließen",
    reason: "Ausbildung läuft — Vorgang final schließen.",
    tone: "success",
  },
  [LeadStatus.CLOSED]: {
    kind: "celebrate",
    label: "Erfolgreich",
    reason: "Vorgang erfolgreich abgeschlossen.",
    tone: "success",
  },
  [LeadStatus.LOST]: {
    kind: "review",
    label: "Auswerten",
    reason: "Lead verloren — Ursache für die nächste Runde notieren.",
    tone: "wait",
  },
  [LeadStatus.REJECTED]: {
    kind: "review",
    label: "Geschlossen",
    reason: "Lead abgelehnt — Akte als Referenz behalten.",
    tone: "wait",
  },
  [LeadStatus.BLOCKED]: {
    kind: "review",
    label: "Blockiert",
    reason: "K.O.-Kriterium aktiv — kein Weiterprozessieren möglich.",
    tone: "wait",
  },
};

function computeNextBestAction(
  lead: LeadSummary,
  urgency: LeadUrgency,
): NextBestAction {
  // First-contact statuses with HOT priority → always "sofort anrufen".
  const isFirstContactPhase =
    lead.status === LeadStatus.NEW ||
    lead.status === LeadStatus.QUALIFIED ||
    lead.status === LeadStatus.HOT ||
    lead.status === LeadStatus.CONTACT_PENDING;

  if (isFirstContactPhase && lead.priority === LeadPriority.HOT) {
    return buildCallAction(lead, urgency);
  }
  if (lead.status === LeadStatus.NEW) {
    return buildQualifyAction();
  }
  if (lead.status === LeadStatus.QUALIFIED) {
    return {
      kind: "call",
      label: "Anrufen",
      reason: "Qualifiziert — jetzt Kontakt aufnehmen.",
      tone: "active",
      href: `tel:${lead.phone}`,
    };
  }
  if (lead.status === LeadStatus.HOT) {
    return buildCallAction(lead, urgency);
  }

  const fromMap = ACTION_BY_STATUS[lead.status];
  if (fromMap) {
    // Inject a tel: link wherever a call is the natural action.
    if (fromMap.kind === "call") {
      return { ...fromMap, href: `tel:${lead.phone}` };
    }
    return fromMap;
  }

  return {
    kind: "review",
    label: "Status prüfen",
    reason: "Vorgang aktuell halten und nächsten Schritt planen.",
    tone: "wait",
  };
}

// ---------------------------------------------------------------------------
// Recommendation copy — one calm German sentence per insights set
// ---------------------------------------------------------------------------

function buildRecommendation(
  lead: LeadSummary,
  urgency: LeadUrgency,
  fundingP: number,
  closeP: number,
): string {
  if (urgency === "overdue") {
    return "Antwortfenster überschritten — diesen Lead vor allen anderen kontaktieren.";
  }
  if (urgency === "today") {
    return "Heute kontaktieren, damit der Lead in Bewegung bleibt.";
  }
  if (closeP >= 0.7 && fundingP >= 0.7) {
    return "Sehr aussichtsreich — Vorgang aktiv weitertreiben.";
  }
  if (lead.priority === LeadPriority.HOT) {
    return "Hoher Lead-Score — eng dranbleiben.";
  }
  if (closeP < 0.25) {
    return "Geringe Abschlusschance — Aufwand bewusst dosieren.";
  }
  return "Plan einhalten — nächsten Schritt wie vorgegeben durchführen.";
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function computeLeadInsights(input: LeadInsightsInput): LeadInsights {
  const now = input.now ?? new Date();
  const lead = input.lead;

  const progress = STATUS_PROGRESS[lead.status];
  const urgency = computeUrgency(lead, input.lastOutboundAt, now);
  const closeProbability = computeCloseProbability(
    lead,
    input.lastOutboundAt,
    now,
  );
  const fundingProbability = computeFundingProbability(lead);
  const nextBestAction = computeNextBestAction(lead, urgency);
  const recommendation = buildRecommendation(
    lead,
    urgency,
    fundingProbability,
    closeProbability,
  );

  // The wa.me href is optionally attached when the action is whatsapp-shaped.
  // (Currently the engine doesn't pick "whatsapp" as a primary action, but the
  // helper is in place for a future LLM-or-rule extension.)
  void waLink;
  // Unused but exported types pulled in for downstream consumers' linters.
  void ({} as EmploymentStatus);
  void ({} as PreferredLocation);

  return {
    score: lead.score,
    closeProbability,
    fundingProbability,
    urgency,
    progress,
    nextBestAction,
    lastContactAt: input.lastOutboundAt,
    recommendation,
  };
}
