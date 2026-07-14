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
  ALL_SITUATION_TAGS,
  classifyEmploymentReply,
  SITUATION_EMPLOYMENT_STATUS,
  SITUATION_FUNNEL_LABEL,
  SITUATION_FUNNEL_TAG,
  SITUATION_LABEL,
  SITUATION_TAG,
  type EmploymentReplyInput,
  type EmploymentSituation,
} from "./EmploymentReplyClassifier";
import { leadLifecycleService } from "./LeadLifecycleService";
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

  private isClassified(tags: ReadonlyArray<string> | undefined): boolean {
    return (tags ?? []).some((t) => ALL_SITUATION_TAGS.includes(t));
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

    await leadRepository.update(leadId, {
      tags: mergeTags(lead.tags, [
        SITUATION_TAG[situation],
        SITUATION_FUNNEL_TAG[situation],
      ]),
      employmentStatus: SITUATION_EMPLOYMENT_STATUS[situation],
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
      },
    });

    if (opts.advanceLifecycle) {
      await leadLifecycleService.record(leadId, "REPLY_RECEIVED", {
        actor: opts.actor,
      });
    }

    if (opts.runAutomation) {
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

  /**
   * Retro/backfill: process every WhatsApp reply that was never classified,
   * then hand back a summary. Idempotent — already-classified leads are skipped
   * so a re-run never sends a duplicate message. Afterwards the system simply
   * continues in normal live mode (new replies are handled by the webhook).
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
        if (this.isClassified(lead.tags)) {
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

        const res = await this.classifyAndApply(
          id,
          { body },
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
