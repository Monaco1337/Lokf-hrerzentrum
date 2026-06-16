/**
 * LeadIntelligenceService — Lead Control Center brain.
 *
 * Aggregates, classifies and prioritises *what the operator should look at
 * right now*. It reads existing tables only — no schema migration is
 * required — and returns a UI-ready set of priority signals.
 *
 * Architecture (respects the project's layering):
 *   UI / Server Action  →  LeadIntelligenceService  →  Repositories  →  Prisma
 *
 * Rules of engagement:
 *   - Never touches `prisma` directly; all data goes through repositories.
 *   - Pure read-only; no side effects.
 *   - Stable, deterministic ordering (severity × count) so the briefing card
 *     order does not jitter between requests.
 *   - Cheap enough to run on every dashboard request — repository calls are
 *     parallelised; everything else is in-memory arithmetic.
 */
import {
  type DashboardIntelligence,
  LeadStatus,
  type PrioritySignal,
} from "@/features/fairtrain-funnel/types";

import { leadIntelligenceRepository } from "../repositories/LeadIntelligenceRepository";
import { statusHistoryRepository } from "../repositories/StatusHistoryRepository";

/** Inactivity threshold before a non-terminal CONTACTED/DOC_* lead is flagged
 *  as drop-off risk. 5 days is the briefing's longest acceptable silence. */
const DROPOFF_RISK_HOURS = 24 * 5;

/** Statuses considered "in conversation with us" — silence on these is the
 *  drop-off signal we care about. Reaching DOC_READY / AA_* and beyond means
 *  the workflow is moving on its own (and silence there is "the agency",
 *  not the lead). */
const STALE_STATUSES: ReadonlyArray<LeadStatus> = [
  LeadStatus.CONTACT_PENDING,
  LeadStatus.CONTACTED,
  LeadStatus.CALL_SCHEDULED,
  LeadStatus.BRIEFING_SENT,
  LeadStatus.DOC_PENDING,
];

/** Severity ranking — lower number first when sorting the briefing. */
const TONE_RANK: Record<PrioritySignal["tone"], number> = {
  critical: 0,
  urgent: 1,
  warning: 2,
  active: 3,
  wait: 4,
  success: 5,
};

export class LeadIntelligenceService {
  /**
   * Build the "Heute wichtig" briefing.
   *
   * Returns a stable, severity-sorted list of priority signals. Signals
   * whose count drops to zero are still returned (rendered as a calm "alles
   * im Grünen" tile) so the briefing row keeps its shape between data
   * snapshots — important for visual rhythm.
   */
  async todayBriefing(): Promise<DashboardIntelligence> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const dropoffCutoff = new Date(
      now.getTime() - DROPOFF_RISK_HOURS * 60 * 60 * 1000,
    );

    const [buckets, voucherApprovedToday] = await Promise.all([
      leadIntelligenceRepository.aggregatePriorityBuckets({
        dropoffCutoff,
        staleStatuses: STALE_STATUSES,
      }),
      statusHistoryRepository.countTransitionsTo(
        LeadStatus.GUTSCHEIN_APPROVED,
        startOfDay,
      ),
    ]);

    const signals: PrioritySignal[] = [];

    // ---- Critical: SLA breached -------------------------------------------
    signals.push({
      id: "sla_breached",
      tone: buckets.slaBreached > 0 ? "critical" : "success",
      label:
        buckets.slaBreached > 0
          ? `${buckets.slaBreached} Hot-Lead${buckets.slaBreached === 1 ? "" : "s"} überfällig`
          : "SLA im grünen Bereich",
      hint:
        buckets.slaBreached > 0
          ? "Antwort-Frist (30 Min) überschritten. Jetzt nachfassen."
          : "Alle Hot-Leads liegen innerhalb der Antwortzeit.",
      action: buckets.slaBreached > 0 ? "Jetzt nachfassen" : "Liste prüfen",
      count: buckets.slaBreached,
      href:
        buckets.slaBreached > 0
          ? "/crm/leads?slaBreachedOnly=1"
          : "/crm/leads?priority=HOT",
    });

    // ---- Urgent: Hot leads waiting for first contact ----------------------
    // Subtract the SLA-breached subset so the operator does not see the same
    // person counted twice on the briefing row.
    const hotPendingNet = Math.max(0, buckets.hotPending - buckets.slaBreached);
    signals.push({
      id: "hot_pending",
      tone: hotPendingNet > 0 ? "urgent" : "success",
      label:
        hotPendingNet > 0
          ? `${hotPendingNet} Hot-Lead${hotPendingNet === 1 ? "" : "s"} sofort kontaktieren`
          : "Keine offenen Hot-Leads",
      hint:
        hotPendingNet > 0
          ? "Hoher Score, noch nicht kontaktiert. Jeder Anruf erhöht die Abschlusschance."
          : "Alle Hot-Leads wurden bereits kontaktiert.",
      action: hotPendingNet > 0 ? "Lead öffnen" : "Pipeline ansehen",
      count: hotPendingNet,
      href: "/crm/leads?priority=HOT",
    });

    // ---- Warning: drop-off risk -------------------------------------------
    signals.push({
      id: "dropoff_risk",
      tone: buckets.dropoffRisk > 0 ? "warning" : "success",
      label:
        buckets.dropoffRisk > 0
          ? `${buckets.dropoffRisk} Lead${buckets.dropoffRisk === 1 ? "" : "s"} drohen abzuspringen`
          : "Keine still gewordenen Leads",
      hint:
        buckets.dropoffRisk > 0
          ? "Seit mehreren Tagen ohne Bewegung. Erinnerung oder Anruf nötig."
          : "Alle laufenden Leads sind aktuell.",
      action:
        buckets.dropoffRisk > 0 ? "Rückruf einplanen" : "Pipeline ansehen",
      count: buckets.dropoffRisk,
      href: "/crm/leads",
    });

    // ---- Active: documents pending ----------------------------------------
    signals.push({
      id: "docs_pending",
      tone: buckets.docsPending > 0 ? "active" : "success",
      label:
        buckets.docsPending > 0
          ? `${buckets.docsPending} Unterlagen ausstehend`
          : "Keine offenen Unterlagen",
      hint:
        buckets.docsPending > 0
          ? "Leads warten auf vollständige Dokumente."
          : "Alle laufenden Leads haben ihre Unterlagen abgegeben.",
      action: buckets.docsPending > 0 ? "Anfordern" : "Liste prüfen",
      count: buckets.docsPending,
      href: "/crm/leads?status=DOC_PENDING",
    });

    // ---- Wait: agency appointments ----------------------------------------
    signals.push({
      id: "aa_pending",
      tone: buckets.aaPending > 0 ? "wait" : "success",
      label:
        buckets.aaPending > 0
          ? `${buckets.aaPending} Agenturtermin${buckets.aaPending === 1 ? "" : "e"} offen`
          : "Keine offenen Agenturtermine",
      hint:
        buckets.aaPending > 0
          ? "Termin mit der Agentur für Arbeit steht aus."
          : "Aktuell keine wartenden Agenturtermine.",
      action: buckets.aaPending > 0 ? "Termin koordinieren" : "Liste prüfen",
      count: buckets.aaPending,
      href: "/crm/leads?status=AA_APPOINTMENT_PENDING",
    });

    // ---- Wait: voucher pending --------------------------------------------
    signals.push({
      id: "voucher_pending",
      tone: buckets.voucherPending > 0 ? "wait" : "success",
      label:
        buckets.voucherPending > 0
          ? `${buckets.voucherPending} Gutschein${buckets.voucherPending === 1 ? "" : "e"} in Bearbeitung`
          : "Keine offenen Gutscheine",
      hint:
        buckets.voucherPending > 0
          ? "Bildungsgutschein beantragt — Status bei der Agentur prüfen."
          : "Aktuell keine offenen Gutschein-Anträge.",
      action: buckets.voucherPending > 0 ? "Nachfassen" : "Liste prüfen",
      count: buckets.voucherPending,
      href: "/crm/leads?status=GUTSCHEIN_PENDING",
    });

    // ---- Success: vouchers approved today ---------------------------------
    if (voucherApprovedToday > 0) {
      signals.push({
        id: "voucher_approved_today",
        tone: "success",
        label: `${voucherApprovedToday} Gutschein${voucherApprovedToday === 1 ? "" : "e"} heute bewilligt`,
        hint: "Glückwunsch — heute wurden Bildungsgutscheine bewilligt.",
        action: "Vorgänge öffnen",
        count: voucherApprovedToday,
        href: "/crm/leads?status=GUTSCHEIN_APPROVED",
      });
    }

    // Stable severity sort: critical first, then by count desc within tone.
    signals.sort((a, b) => {
      if (TONE_RANK[a.tone] !== TONE_RANK[b.tone]) {
        return TONE_RANK[a.tone] - TONE_RANK[b.tone];
      }
      return b.count - a.count;
    });

    return { priorities: signals };
  }
}

export const leadIntelligenceService = new LeadIntelligenceService();
