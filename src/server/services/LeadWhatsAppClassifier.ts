/**
 * LeadWhatsAppClassifier — the single source of truth for how a REAL WhatsApp
 * provider event re-scores and re-classifies a lead.
 *
 * Pure and side-effect free: it takes the lead's current tracking snapshot plus
 * one event and returns the field changes to persist. The webhook service owns
 * the DB write. This keeps the business rules testable and guarantees the same
 * verdict everywhere.
 *
 * Score deltas are cumulative and clamped. Positive lifecycle statuses
 * (gesendet -> zugestellt -> gelesen -> beantwortet) never move backwards; a
 * failure or a reply always overrides.
 */
import type {
  LeadQualityStatus,
  LeadSummary,
  WhatsappReachability,
  WhatsappTrackingStatus,
} from "@/features/fairtrain-funnel/types";

import type { UpdateLeadFields } from "../repositories/LeadRepository";
import type { WhatsappFailureKind } from "./messaging/whatsappPort";

const SCORE_MIN = -100;
const SCORE_MAX = 500;
const clampScore = (n: number): number =>
  Math.max(SCORE_MIN, Math.min(SCORE_MAX, n));

/** Forward-only rank of the positive delivery lifecycle. */
const POSITIVE_RANK: Record<string, number> = {
  offen: 0,
  geplant: 1,
  gesendet: 2,
  zugestellt: 3,
  gelesen: 4,
  beantwortet: 5,
};

const REACH_RANK: Record<string, number> = {
  unbekannt: 0,
  erreichbar: 1,
  aktiv: 2,
  nicht_erreichbar: 0, // set explicitly on failures, not via upgrade
};

export type WhatsAppClassifierEvent =
  | { kind: "sent"; at: Date }
  | { kind: "delivered"; at: Date }
  | { kind: "read"; at: Date }
  | { kind: "replied"; at: Date; body: string }
  | {
      kind: "failed";
      at: Date;
      failure: WhatsappFailureKind;
      reason?: string | null;
    };

export interface ClassifierResult {
  fields: UpdateLeadFields;
  /** Escalate lead priority to HOT (reply received). */
  priorityHigh: boolean;
  /** Short, PII-free note for the audit log. */
  note: string;
}

/** Upgrade a forward-only status; never regress on positive events. */
function forwardStatus(
  current: WhatsappTrackingStatus,
  next: WhatsappTrackingStatus,
): WhatsappTrackingStatus {
  const c = POSITIVE_RANK[current];
  const n = POSITIVE_RANK[next];
  if (c === undefined || n === undefined) return next;
  return n > c ? next : current;
}

/** Upgrade reachability; never regress via a positive event. */
function upgradeReachability(
  current: WhatsappReachability,
  next: WhatsappReachability,
): WhatsappReachability {
  return (REACH_RANK[next] ?? 0) > (REACH_RANK[current] ?? 0) ? next : current;
}

export function classifyWhatsAppEvent(
  lead: Pick<
    LeadSummary,
    "whatsappStatus" | "whatsappReachability" | "leadQualityStatus" | "leadScore"
  >,
  event: WhatsAppClassifierEvent,
): ClassifierResult {
  const fields: UpdateLeadFields = {};
  let priorityHigh = false;
  let note = "";

  switch (event.kind) {
    case "sent": {
      fields.whatsappStatus = forwardStatus(lead.whatsappStatus, "gesendet");
      fields.lastWhatsappMessageAt = event.at;
      note = "WhatsApp gesendet";
      break;
    }
    case "delivered": {
      fields.whatsappStatus = forwardStatus(lead.whatsappStatus, "zugestellt");
      fields.whatsappReachability = upgradeReachability(
        lead.whatsappReachability,
        "erreichbar",
      );
      fields.lastWhatsappDeliveredAt = event.at;
      fields.leadScore = clampScore(lead.leadScore + 5);
      note = "WhatsApp zugestellt (+5)";
      break;
    }
    case "read": {
      fields.whatsappStatus = forwardStatus(lead.whatsappStatus, "gelesen");
      fields.whatsappReachability = upgradeReachability(
        lead.whatsappReachability,
        "aktiv",
      );
      fields.lastWhatsappReadAt = event.at;
      fields.leadScore = clampScore(lead.leadScore + 10);
      if (
        lead.leadQualityStatus === "unbewertet" ||
        lead.leadQualityStatus === "neutral"
      ) {
        fields.leadQualityStatus = "warm";
      }
      note = "WhatsApp gelesen (+10)";
      break;
    }
    case "replied": {
      fields.whatsappStatus = "beantwortet";
      fields.whatsappReachability = "aktiv";
      fields.leadQualityStatus = "reagiert";
      fields.leadScore = clampScore(lead.leadScore + 25);
      fields.lastWhatsappReplyAt = event.at;
      fields.lastInboundMessage = event.body.slice(0, 2000);
      fields.lastInboundMessageAt = event.at;
      priorityHigh = true;
      note = "WhatsApp-Antwort erhalten (+25)";
      break;
    }
    case "failed": {
      const { status, quality, reach, delta } = resolveFailure(event.failure);
      fields.whatsappStatus = status;
      fields.whatsappReachability = reach;
      if (quality) fields.leadQualityStatus = quality;
      fields.leadScore = clampScore(lead.leadScore + delta);
      fields.lastWhatsappErrorAt = event.at;
      fields.lastWhatsappErrorReason = event.reason ?? null;
      note = `WhatsApp fehlgeschlagen: ${status} (${delta})`;
      break;
    }
  }

  return { fields, priorityHigh, note };
}

function resolveFailure(failure: WhatsappFailureKind): {
  status: WhatsappTrackingStatus;
  quality: LeadQualityStatus | null;
  reach: WhatsappReachability;
  delta: number;
} {
  switch (failure) {
    case "invalid_number":
      return {
        status: "nummer_ungueltig",
        quality: "schrottlead",
        reach: "nicht_erreichbar",
        delta: -60,
      };
    case "not_registered":
      return {
        status: "nicht_registriert",
        quality: "schrottlead",
        reach: "nicht_erreichbar",
        delta: -60,
      };
    case "unreachable":
      return {
        status: "nicht_erreichbar",
        quality: null,
        reach: "nicht_erreichbar",
        delta: -20,
      };
    case "generic":
    default:
      return {
        status: "fehlgeschlagen",
        quality: null,
        reach: "nicht_erreichbar",
        delta: -20,
      };
  }
}

/**
 * Send-time acknowledgement (no webhook yet): reflect that we dispatched a
 * message so the lead never sits at "offen" after a real send. Forward-only
 * for the positive lifecycle; a send failure sets the error state (no score
 * change here — the negative scoring is applied by the real FAILED webhook).
 */
export function classifyOutboundSend(
  lead: Pick<LeadSummary, "whatsappStatus">,
  ack: "QUEUED" | "SENT" | "FAILED",
  at: Date,
  reason?: string | null,
): UpdateLeadFields {
  if (ack === "FAILED") {
    return {
      whatsappStatus: "fehlgeschlagen",
      lastWhatsappErrorAt: at,
      lastWhatsappErrorReason: reason ?? null,
    };
  }
  const target: WhatsappTrackingStatus = ack === "QUEUED" ? "geplant" : "gesendet";
  return {
    whatsappStatus: forwardStatus(lead.whatsappStatus, target),
    lastWhatsappMessageAt: at,
  };
}

/**
 * Manual-only classification for a state no provider reliably reports (blocked).
 * Exposed so an operator action can set it explicitly — never inferred.
 */
export function classifyManualBlocked(lead: {
  leadScore: number;
}): ClassifierResult {
  return {
    fields: {
      whatsappStatus: "blockiert",
      leadQualityStatus: "nicht_kontaktierbar",
      whatsappReachability: "nicht_erreichbar",
      leadScore: clampScore(lead.leadScore - 50),
    },
    priorityHigh: false,
    note: "WhatsApp blockiert (manuell, -50)",
  };
}
