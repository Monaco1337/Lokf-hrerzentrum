/**
 * WhatsAppReplyClassificationService — the single place that turns an inbound
 * WhatsApp reply into a classified lead + follow-up automation.
 *
 * ONE code path serves both:
 *   • live webhook   → classify each fresh reply, then run MESSAGE_INBOUND rules
 *   • retro/backfill → re-process replies that were never classified
 *
 * Idempotency is guaranteed by a tag marker: once a lead carries a situation tag
 * (beschaeftigt / arbeitssuchend / sonstige_situation) it is considered handled
 * and neither classification nor the follow-up automation runs again — so no
 * message is ever sent twice, no matter how often a webhook (or the backfill)
 * fires. Every classification is written to the audit log + lead timeline.
 */
import { AuditAction } from "@/features/fairtrain-funnel/types";
import type { BackfillSummary } from "@/features/fairtrain-funnel/automation/types";

import { auditLogService } from "./AuditLogService";
import {
  automationRuleEngine,
  buildInboundEventContext,
  type InboundEventContext,
} from "./AutomationRuleEngine";
import {
  classifyEmploymentReply,
  EMPLOYMENT_QUICK_REPLY,
  SITUATION_EMPLOYMENT_STATUS,
  SITUATION_FUNNEL_LABEL,
  SITUATION_FUNNEL_TAG,
  SITUATION_LABEL,
  SITUATION_TAG,
  type EmploymentReplyInput,
  type EmploymentSituation,
} from "./EmploymentReplyClassifier";
import { FOLLOWUP_SENT_TAG } from "./EmploymentSituationClassifier";
import { employmentSituationService } from "./EmploymentSituationService";
import { leadLifecycleService } from "./LeadLifecycleService";
import { analyzeReply, REPLY_INTENT_LABEL } from "./ReplyIntentClassifier";
import { communicationRepository } from "../repositories/CommunicationRepository";
import { leadRepository } from "../repositories/LeadRepository";

export interface ClassificationResult {
  situation: EmploymentSituation;
  /** True when this call newly wrote the classification (first time). */
  applied: boolean;
  /** True when the lead already carried a situation tag (skipped). */
  alreadyClassified: boolean;
  /** The inbound context (for the caller to run MESSAGE_INBOUND rules). */
  context: InboundEventContext;
}

export type { BackfillSummary };

interface ApplyOpts {
  actor: string;
  at: Date;
  /** Run MESSAGE_INBOUND automations with the reply context afterwards. */
  runAutomation?: boolean;
  /** Advance the lead lifecycle to "Antwort erhalten" (backfill only). */
  advanceLifecycle?: boolean;
}

function mergeTags(
  existing: ReadonlyArray<string> | undefined,
  add: ReadonlyArray<string>,
): string[] {
  return Array.from(new Set([...(existing ?? []), ...add]));
}

/** Legacy quick-reply payload id per situation (rebuilt for the resend run). */
const LEGACY_QUICK_REPLY_ID: Record<EmploymentSituation, string> = {
  employed: EMPLOYMENT_QUICK_REPLY.EMPLOYED,
  job_seeking: EMPLOYMENT_QUICK_REPLY.JOB_SEEKING,
  other: EMPLOYMENT_QUICK_REPLY.OTHER,
};

export class WhatsAppReplyClassificationService {
  /** Return the already-recorded situation (via tag), or null if unclassified. */
  situationFromTags(
    tags: ReadonlyArray<string> | undefined,
  ): EmploymentSituation | null {
    const set = new Set(tags ?? []);
    if (set.has(SITUATION_TAG.employed)) return "employed";
    if (set.has(SITUATION_TAG.job_seeking)) return "job_seeking";
    if (set.has(SITUATION_TAG.other)) return "other";
    return null;
  }

  /**
   * Classify one reply and, unless already handled, persist the situation
   * (tag + funnel-phase tag + employmentStatus + timeline/audit) and optionally
   * start the follow-up automation. Idempotent per lead.
   */
  async classifyAndApply(
    leadId: string,
    input: EmploymentReplyInput,
    opts: ApplyOpts,
  ): Promise<ClassificationResult | null> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) return null;

    const context = buildInboundEventContext(input);

    const existing = this.situationFromTags(lead.tags);
    if (existing) {
      return {
        situation: existing,
        applied: false,
        alreadyClassified: true,
        context,
      };
    }

    const { situation, source } = classifyEmploymentReply(input);
    const body = (input.body ?? "").trim();

    // Rich AI analysis ("Antwort analysieren (KI)") — classify only, never
    // generate. Uncertain replies are flagged for manual review so no wrong
    // automation is started.
    const analysis = analyzeReply(input);
    const manualTag = analysis.manualReview ? ["manuelle_pruefung"] : [];
    // When the follow-up decision is actually carried out here (live webhook or
    // backfill), mark it so the retro/resend run never touches this lead again.
    const followUpTag = opts.runAutomation ? [FOLLOWUP_SENT_TAG] : [];

    await leadRepository.update(leadId, {
      tags: mergeTags(lead.tags, [
        SITUATION_TAG[situation],
        SITUATION_FUNNEL_TAG[situation],
        ...manualTag,
        ...followUpTag,
      ]),
      employmentStatus: SITUATION_EMPLOYMENT_STATUS[situation],
      replyInterest: analysis.interest,
      replyIntent: analysis.intent,
      replyConfidence: Math.round(analysis.confidence * 100),
      needsManualReview: analysis.manualReview,
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
        situation,
        situationLabel: SITUATION_LABEL[situation],
        funnelPhase: SITUATION_FUNNEL_LABEL[situation],
        source,
        tag: SITUATION_TAG[situation],
        quickReply: input.buttonId ?? input.buttonTitle ?? null,
        originalMessage: body.slice(0, 500),
        // AI analysis snapshot for the timeline.
        interest: analysis.interest,
        intent: analysis.intent,
        intentLabel: REPLY_INTENT_LABEL[analysis.intent],
        confidence: Math.round(analysis.confidence * 100),
        manualReview: analysis.manualReview,
      },
    });

    if (opts.advanceLifecycle) {
      await leadLifecycleService.record(leadId, "REPLY_RECEIVED", {
        actor: opts.actor,
      });
    }

    // Fallback: an ambiguous reply must NOT trigger a (possibly wrong)
    // automation — it is flagged for manual review instead.
    if (opts.runAutomation && !analysis.manualReview) {
      await this.runFollowUp(leadId, context, opts.actor);
    }

    return { situation, applied: true, alreadyClassified: false, context };
  }

  /** Run MESSAGE_INBOUND rules with the reply context. Best-effort. */
  async runFollowUp(
    leadId: string,
    context: InboundEventContext,
    actor: string,
  ): Promise<void> {
    try {
      await automationRuleEngine.runForTrigger("MESSAGE_INBOUND", leadId, {
        actor,
        event: context,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[reply-classification] MESSAGE_INBOUND failed", {
        leadId,
        err,
      });
    }
  }

  /** Mark a lead's follow-up as carried out (idempotency across live + resend). */
  private async markFollowUpSent(leadId: string): Promise<void> {
    const lead = await leadRepository.findById(leadId);
    if (!lead) return;
    await leadRepository.update(leadId, {
      tags: mergeTags(lead.tags, [FOLLOWUP_SENT_TAG]),
    });
  }

  /**
   * Retro/backfill + resend: for every lead that has ever replied, make sure the
   * correct follow-up actually went out — including "yesterday's" replies that
   * were classified while the send was still blocked/simulated.
   *
   * Idempotency is anchored on FOLLOWUP_SENT_TAG (the single "already followed
   * up" marker), NOT on the classification tag. A lead is therefore followed up
   * EXACTLY once, no matter how often this runs or how it mixes with live sends:
   *   • already followed up (tag) or opted out       → skip
   *   • classified but never followed up             → re-run the follow-up
   *   • never classified                             → classify + follow-up
   */
  async backfillUnprocessedReplies(opts: {
    actor: string;
    limit?: number;
  }): Promise<BackfillSummary> {
    const ids = await leadRepository.idsWithWhatsappReply(opts.limit ?? 5000);
    const summary: BackfillSummary = {
      total: ids.length,
      processed: 0,
      skipped: 0,
      errors: 0,
      employed: 0,
      job_seeking: 0,
      other: 0,
    };

    for (const id of ids) {
      try {
        const lead = await leadRepository.findById(id);
        if (!lead) {
          summary.skipped += 1;
          continue;
        }
        const tags = lead.tags ?? [];
        // Already followed up (live or a previous run) or opted out → never
        // send again.
        if (tags.includes(FOLLOWUP_SENT_TAG) || lead.optOut) {
          summary.skipped += 1;
          continue;
        }

        let body = (lead.lastInboundMessage ?? "").trim();
        let at =
          lead.lastInboundMessageAt ?? lead.lastWhatsappReplyAt ?? new Date();
        if (!body) {
          const latest = await communicationRepository.latestInboundWhatsapp(id);
          if (latest) {
            body = latest.body.trim();
            at = latest.at;
          }
        }
        if (!body) {
          // No stored reply text to analyse — nothing to classify.
          summary.skipped += 1;
          continue;
        }

        // Rebuild the legacy quick-reply id so MESSAGE_INBOUND conditions
        // (Quick-Reply-Auswahl) still match on the resend.
        const legacySit = this.situationFromTags(tags);
        const replyInput: EmploymentReplyInput = legacySit
          ? {
              body,
              buttonId: LEGACY_QUICK_REPLY_ID[legacySit],
              buttonTitle: SITUATION_LABEL[legacySit],
            }
          : { body };

        // 1) "Beschäftigten-Statusabfrage" router (colour emoji / word / free
        // text). `force` re-runs the follow-up even for a lead that was already
        // classified (V2) but never received its message. Legacy button ids are
        // deferred by the router, so those fall through to step 2/3.
        const routed = await employmentSituationService.classifyAndRoute(
          id,
          replyInput,
          { actor: opts.actor, at, force: true },
        );
        if (routed.handled) {
          summary.processed += 1;
          continue;
        }

        // 2) Legacy-classified but never followed up → re-run the follow-up now.
        if (legacySit) {
          const context = buildInboundEventContext(replyInput);
          await this.runFollowUp(id, context, opts.actor);
          await this.markFollowUpSent(id);
          summary.processed += 1;
          summary[legacySit] += 1;
          continue;
        }

        // 3) Never classified → classify + follow-up (writes FOLLOWUP_SENT_TAG).
        const res = await this.classifyAndApply(
          id,
          replyInput,
          { actor: opts.actor, at, runAutomation: true, advanceLifecycle: true },
        );
        if (!res || !res.applied) {
          summary.skipped += 1;
          continue;
        }
        summary.processed += 1;
        summary[res.situation] += 1;
      } catch (err) {
        summary.errors += 1;
        // eslint-disable-next-line no-console
        console.error("[whatsapp-backfill] lead failed", { leadId: id, err });
      }
    }

    await auditLogService.append({
      actor: opts.actor,
      action: AuditAction.WHATSAPP_REPLIES_BACKFILL,
      entityType: "System",
      entityId: "whatsapp-replies",
      details: { ...summary },
    });

    return summary;
  }
}

export const whatsAppReplyClassificationService =
  new WhatsAppReplyClassificationService();
