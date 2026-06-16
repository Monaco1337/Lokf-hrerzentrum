/**
 * Intelligence-layer types — used by the Lead Control Center.
 *
 * Lives next to the funnel-feature domain types but in its own module so the
 * core `types.ts` stays focused on persistent enums + entity shapes. Anything
 * here is *derived* (computed at request time, not stored).
 */
import type { LeadSummary } from "../types";

/**
 * High-level priority insights for the Lead Control Center.
 * Each signal is an actionable bucket that drives a clickable priority card
 * on the dashboard. Counts come from existing tables; no schema migration.
 */
export interface PrioritySignal {
  id:
    | "hot_pending"
    | "sla_breached"
    | "dropoff_risk"
    | "docs_pending"
    | "aa_pending"
    | "voucher_pending"
    | "voucher_approved_today";
  tone: "critical" | "urgent" | "warning" | "active" | "wait" | "success";
  /** Single-word label that headlines the card. */
  label: string;
  /** Plain German sentence describing the bucket. */
  hint: string;
  /** Suggested next-best-action verb. */
  action: string;
  /** Number of leads in this bucket — drives the prominent counter. */
  count: number;
  /** Deep-link target — opens the pre-filtered Lead list. */
  href: string;
}

export interface DashboardIntelligence {
  /** Priorities for the "Heute wichtig" briefing — already sorted by tone/count. */
  priorities: ReadonlyArray<PrioritySignal>;
}

// ---------------------------------------------------------------------------
// Per-lead intelligence (Phase 3)
// ---------------------------------------------------------------------------

/**
 * Time-criticality of a single lead, viewed through the operator's lens.
 *   overdue — past SLA / follow-up due in the past
 *   today   — needs an action today (HOT pending, follow-up today)
 *   soon    — should be touched within 24-48 h
 *   normal  — no time pressure right now
 */
export type LeadUrgency = "overdue" | "today" | "soon" | "normal";

/**
 * Next-best-action recommendation. Tone matches the briefing palette so the
 * same colour language works across dashboard and list.
 */
export interface NextBestAction {
  kind:
    | "call"
    | "whatsapp"
    | "qualify"
    | "request_docs"
    | "schedule_call"
    | "send_briefing"
    | "schedule_aa"
    | "follow_voucher"
    | "confirm_contract"
    | "confirm_start"
    | "close_case"
    | "review"
    | "celebrate"
    | "wait";
  /** Short verb shown on the action button. */
  label: string;
  /** Plain-German sentence explaining the recommendation. */
  reason: string;
  /** Tone signal — drives colour. */
  tone: "critical" | "urgent" | "warning" | "active" | "wait" | "success";
  /** Optional deep-link or `tel:` / `https://wa.me/...` URL. */
  href?: string;
}

export interface LeadInsights {
  /** Lead score from the scoring engine (0–100). Echoed for convenience. */
  score: number;
  /** Probability the lead completes the funnel (0..1). */
  closeProbability: number;
  /** Probability the Bildungsgutschein gets approved (0..1). */
  fundingProbability: number;
  /** Time-criticality for the operator. */
  urgency: LeadUrgency;
  /** Funnel progress (0..1) — drives the "Bearbeitungsfortschritt" bar. */
  progress: number;
  /** Recommended next move — fully self-contained. */
  nextBestAction: NextBestAction;
  /** Last outbound message timestamp ("letzter Kontakt" column). */
  lastContactAt: Date | null;
  /** One-sentence German recommendation that headlines the lead card. */
  recommendation: string;
}

/**
 * Lead summary + computed insights. The shape the new Lead Control Center
 * UI (pipeline cards, priority strip, lead list) consumes everywhere.
 */
export interface EnrichedLeadSummary {
  lead: LeadSummary;
  insights: LeadInsights;
}
