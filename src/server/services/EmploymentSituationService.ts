/**
 * EmploymentSituationService — routes a classified "Beschäftigten-Statusabfrage"
 * reply into the correct follow-up process.
 *
 * ONE code path serves the live webhook AND the retro/backfill run. Everything
 * is idempotent per lead: once a situation tag is written the lead is considered
 * handled and neither the classification nor the follow-up runs again — so no
 * message is ever sent twice, no matter how often a webhook (or the backfill)
 * fires.
 *
 * Routing per category:
 *   GELB  / BLAU        → precheck  : personalisierter Vorab-Check-Link (WhatsApp)
 *   GESUNDHEIT          → callback  : Follow-up-Text + Rückrufaufgabe (Prio hoch)
 *   WEISS               → callback  : Beratungsnachricht + Vertriebsaufgabe
 *   ANDERE / unsicher   → manual    : KEINE Auto-Nachricht, Multichat-Markierung
 *
 * Central send guard: every automatic send goes through MessageLedgerService,
 * which enforces opt-out, contact-protection (manuelle Bearbeitung) and consent.
 * A blocked send never blocks the classification — the lead is still tagged,
 * the funnel phase set and the decision written to timeline + audit.
 */
import { AuditAction } from "@/features/fairtrain-funnel/types";
import {
  FUNNEL_PHASE_LABEL,
  type FunnelPhase,
} from "@/features/fairtrain-funnel/funnelPhase";

import { auditLogService } from "./AuditLogService";
import {
  classifyEmploymentSituation,
  SITUATION_CONFIDENCE_THRESHOLD,
  SITUATION_EMPLOYMENT_STATUS_V2,
  SITUATION_FUNNEL_PHASE,
  SITUATION_INTENT,
  SITUATION_LABEL_V2,
  SITUATION_TAG_V2,
  ALL_SITUATION_TAGS_V2,
  type EmploymentSituationCategory,
  type SituationClassification,
  type SituationReplyInput,
} from "./EmploymentSituationClassifier";
import { whatsAppOptOutService } from "./WhatsAppOptOutService";
import { leadRepository } from "../repositories/LeadRepository";
import { taskRepository } from "../repositories/TaskRepository";
import { userRepository } from "../repositories/UserRepository";

export interface SituationRouteResult {
  /** True when this reply was a Beschäftigten-Statusabfrage answer we handled. */
  handled: boolean;
  category?: EmploymentSituationCategory;
  /** True when the lead already carried a situation tag (skipped). */
  alreadyHandled?: boolean;
  /** True when an automatic follow-up message was actually sent. */
  messageSent?: boolean;
  classification?: SituationClassification;
}

interface RouteOpts {
  actor: string;
  at: Date;
  /** Send the follow-up messages + create tasks (default true). */
  runFollowUp?: boolean;
}

function mergeTags(
  existing: ReadonlyArray<string> | undefined,
  add: ReadonlyArray<string>,
): string[] {
  return Array.from(new Set([...(existing ?? []), ...add]));
}

/** Exact follow-up text for the GESUNDHEIT branch (per product copy). */
const HEALTH_FOLLOW_UP = [
  "Danke für Ihre Rückmeldung.",
  "In dieser Situation kann häufig die Rentenversicherung als Kostenträger infrage kommen – Stichwort Leistungen zur Teilhabe am Arbeitsleben. Ob das möglich ist, hängt von Ihrer individuellen Situation ab.",
  "Wichtig ist außerdem: Für den Führerstand gilt eine eigene ärztliche Tauglichkeitsuntersuchung. Je nach Einschränkung kann die Weiterbildung geeignet sein oder nicht. Das klären wir möglichst früh, bevor Sie unnötig Zeit investieren.",
  "Am sinnvollsten ist ein kurzes Gespräch mit einem Berater. Wann wären Sie gut erreichbar?",
  "Viele Grüße\nIhr Team vom Lokführerzentrum",
].join("\n\n");

function greeting(firstName: string | null): string {
  return firstName ? `Hallo ${firstName},` : "Hallo,";
}

function precheckMessage(firstName: string | null, link: string): string {
  return [
    greeting(firstName),
    "danke für Ihre Rückmeldung. Gerade wenn Ihr Arbeitsplatz nicht dauerhaft sicher ist, lohnt sich ein kurzer, unverbindlicher Vorab-Check: Wir prüfen, ob eine geförderte Weiterbildung zum Triebfahrzeugführer (Lokführer) für Sie infrage kommt – häufig über einen Bildungsgutschein.",
    "Hier geht es direkt zu Ihrem persönlichen Vorab-Check:",
    link,
    "Der Check dauert nur wenige Minuten. Bei Fragen sind wir jederzeit für Sie da.",
    "Viele Grüße\nIhr Team vom Lokführerzentrum",
  ].join("\n\n");
}

function consultationMessage(firstName: string | null): string {
  return [
    greeting(firstName),
    "vielen Dank für Ihre Rückmeldung – schön, dass Ihr Arbeitsplatz sicher ist.",
    "Wenn Sie sich langfristig verändern oder einfach unverbindlich informieren möchten: Wir beraten Sie gern persönlich zur geförderten Weiterbildung zum Triebfahrzeugführer (Lokführer). Ein kurzes Gespräch klärt alle Ihre Fragen.",
    "Wann wären Sie für einen kurzen Rückruf gut erreichbar?",
    "Viele Grüße\nIhr Team vom Lokführerzentrum",
  ].join("\n\n");
}

export class EmploymentSituationService {
  /** Detect an already-handled lead (idempotency marker). */
  private isHandled(tags: ReadonlyArray<string> | undefined): boolean {
    return (tags ?? []).some((t) => ALL_SITUATION_TAGS_V2.includes(t));
  }

  /**
   * Classify one reply and, when it is a Beschäftigten-Statusabfrage answer,
   * apply the situation (tag + funnel phase + employmentStatus + interest +
   * timeline/audit) and start the follow-up. Idempotent per lead.
   *
   * Returns `{ handled: false }` when the reply carries NO situation signal —
   * the caller then falls back to the generic reply handling (backward compat).
   */
  async classifyAndRoute(
    leadId: string,
    input: SituationReplyInput,
    opts: RouteOpts,
  ): Promise<SituationRouteResult> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) return { handled: false };

    const classification = classifyEmploymentSituation(input);

    // STOP / opt-out wins over everything (priority 1). Hand off to the opt-out
    // flow (which stops all automations + confirms) and count it as handled.
    if (classification.optOut) {
      await whatsAppOptOutService.applyOptOut(leadId, {
        originalMessage: (input.body ?? "").slice(0, 1000),
        at: opts.at,
        actor: opts.actor,
      });
      return { handled: true, classification };
    }

    // No employment-situation signal → let the generic reply handler take over.
    if (!classification.signalDetected) {
      return { handled: false, classification };
    }

    // Idempotency: already tagged → never re-classify or re-send.
    if (this.isHandled(lead.tags)) {
      return { handled: true, alreadyHandled: true, classification };
    }

    const category = classification.category;
    const tag = SITUATION_TAG_V2[category];
    const funnelPhase = SITUATION_FUNNEL_PHASE[category];
    const body = (input.body ?? "").trim();

    // Low confidence OR "andere Situation" → manual review: tag + funnel, but
    // NEVER auto-send a (possibly wrong) message.
    const manualReview = classification.manualReview;

    const tags = mergeTags(lead.tags, [
      tag,
      ...(manualReview ? ["manuelle_pruefung"] : []),
    ]);

    await leadRepository.update(leadId, {
      tags,
      funnelPhase,
      employmentStatus: SITUATION_EMPLOYMENT_STATUS_V2[category],
      replyInterest: classification.interest ? "yes" : "unknown",
      replyConfidence: Math.round(classification.confidence * 100),
      needsManualReview: manualReview,
      ...(body
        ? { lastInboundMessage: body.slice(0, 1000), lastInboundMessageAt: opts.at }
        : {}),
    });

    await auditLogService.append({
      actor: opts.actor,
      action: AuditAction.WHATSAPP_REPLY_CLASSIFIED,
      entityType: "Lead",
      entityId: leadId,
      details: {
        classifier: "beschaeftigten_statusabfrage",
        category,
        categoryLabel: SITUATION_LABEL_V2[category],
        intent: SITUATION_INTENT[category],
        funnelPhase,
        funnelPhaseLabel: FUNNEL_PHASE_LABEL[funnelPhase],
        tag,
        confidence: Math.round(classification.confidence * 100),
        threshold: Math.round(SITUATION_CONFIDENCE_THRESHOLD * 100),
        matchedKeywords: classification.matchedKeywords,
        source: classification.source,
        interest: classification.interest,
        manualReview,
        quickReply: input.buttonId ?? input.buttonTitle ?? null,
        originalMessage: body.slice(0, 500),
      },
    });

    let messageSent = false;
    if (opts.runFollowUp !== false) {
      messageSent = await this.runFollowUp(
        leadId,
        classification,
        funnelPhase,
        opts,
      );
    }

    return { handled: true, category, messageSent, classification };
  }

  /**
   * Fire the category-specific follow-up (message + task). All sends go through
   * the central guard (opt-out / contact-protection / consent) and are
   * best-effort — a blocked or failing send never throws.
   */
  private async runFollowUp(
    leadId: string,
    classification: SituationClassification,
    funnelPhase: FunnelPhase,
    opts: RouteOpts,
  ): Promise<boolean> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) return false;
    const category = classification.category;

    switch (category) {
      case "fixed_term_or_termination":
      case "short_time_or_business_risk": {
        // precheck → personalised Vorab-Check link.
        const link = await this.mintPrecheckLink(leadId, opts.actor);
        if (!link) return false;
        return this.send(leadId, precheckMessage(lead.firstName, link), opts.actor);
      }

      case "health_related": {
        // callback → follow-up text + high-priority Rückrufaufgabe + Prio HOT.
        const sent = await this.send(leadId, HEALTH_FOLLOW_UP, opts.actor);
        await leadRepository.update(leadId, { priority: "HOT" });
        await this.createTask(lead, {
          title: `Rückruf erforderlich (Gesundheit): ${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim(),
          description:
            "Lead hat gesundheitliche Gründe genannt. Rentenversicherung/LTA + ärztliche Tauglichkeit klären. Zeitnah zurückrufen.",
          priority: "HIGH",
          at: opts.at,
          hours: 4,
        });
        return sent;
      }

      case "stable_employment": {
        // callback → Beratungsnachricht + Vertriebsaufgabe.
        const sent = await this.send(
          leadId,
          consultationMessage(lead.firstName),
          opts.actor,
        );
        await this.createTask(lead, {
          title: `Beratung anbieten (Arbeitsplatz sicher): ${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim(),
          description:
            "Arbeitsplatz sicher, aber Interesse an langfristiger Veränderung. Beratungsgespräch anbieten.",
          priority: "NORMAL",
          at: opts.at,
          hours: 24,
        });
        return sent;
      }

      case "other":
      default: {
        // manual review → NO auto-message. Notify the responsible rep so the
        // lead surfaces as "Manuelle Prüfung erforderlich" in the Multichat.
        await this.createTask(lead, {
          title: `Manuelle Prüfung: ${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim(),
          description: `Antwort konnte nicht eindeutig zugeordnet werden (${FUNNEL_PHASE_LABEL[funnelPhase]}). Bitte Nachricht sichten und manuell zuordnen: „${(lead.lastInboundMessage ?? "").slice(0, 300)}"`,
          priority: "NORMAL",
          at: opts.at,
          hours: 8,
        });
        return false;
      }
    }
  }

  /** Mint a personalised portal (Vorab-Check) link. Best-effort. */
  private async mintPrecheckLink(
    leadId: string,
    actor: string,
  ): Promise<string | null> {
    try {
      const { portalService } = await import("./PortalService");
      const { url } = await portalService.createLink(leadId, actor, 30);
      return url;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[situation-router] precheck link failed", { leadId, err });
      return null;
    }
  }

  /**
   * Send a WhatsApp session message through the central ledger. The lead just
   * wrote to us (inbound), so a session reply is legitimate → consent is
   * bypassed, but opt-out and contact-protection are STILL enforced centrally.
   */
  private async send(
    leadId: string,
    body: string,
    actorId: string,
  ): Promise<boolean> {
    try {
      const { messageLedgerService } = await import("./MessageLedgerService");
      await messageLedgerService.sendText({
        leadId,
        body,
        actorId,
        channel: "WHATSAPP",
        bypassConsent: true,
      });
      return true;
    } catch {
      // Blocked (opt-out / manual handling) or provider failure — classification
      // already persisted; the send is simply skipped.
      return false;
    }
  }

  private async createTask(
    lead: { id: string; assignedToId: string | null },
    task: {
      title: string;
      description: string;
      priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
      at: Date;
      hours: number;
    },
  ): Promise<void> {
    try {
      const createdById =
        lead.assignedToId ?? (await userRepository.findSystemActorId());
      if (!createdById) return;
      await taskRepository.create({
        title: task.title,
        description: task.description,
        leadId: lead.id,
        assigneeId: lead.assignedToId ?? null,
        createdById,
        priority: task.priority,
        dueAt: new Date(task.at.getTime() + task.hours * 3_600_000),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[situation-router] task creation failed", {
        leadId: lead.id,
        err,
      });
    }
  }
}

export const employmentSituationService = new EmploymentSituationService();
