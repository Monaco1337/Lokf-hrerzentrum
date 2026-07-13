"use server";
import { SendMagicLinkSchema } from "@/features/fairtrain-funnel/forms/schemas";
import { renderEmailHtml } from "@/features/fairtrain-funnel/automation/TemplateRenderer";
import {
  CommunicationChannel,
  MagicLinkScopeSchema,
} from "@/features/fairtrain-funnel/types";

import { NotFoundError, ValidationError } from "../errors";
import { leadRepository } from "../repositories/LeadRepository";
import { assertLeadScopeForActor } from "../services/LeadAccess";
import { communicationService } from "../services/CommunicationService";
import { OPT_OUT_BLOCK_MESSAGE } from "../services/MessageLedgerService";
import { magicLinkTokenService } from "../services/MagicLinkTokenService";
import { requirePermission, runAction, type Result } from "./_helpers";

export async function sendMagicLink(
  raw: unknown,
): Promise<Result<{ url: string }>> {
  return runAction(async () => {
    const parsed = SendMagicLinkSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid magic link payload");
    }
    const actor = await requirePermission("canManageLeads");
    await assertLeadScopeForActor(actor, parsed.data.leadId);
    const lead = await leadRepository.findById(parsed.data.leadId);
    if (!lead) throw new NotFoundError("Lead", parsed.data.leadId);

    const scope = MagicLinkScopeSchema.parse(parsed.data.scope);
    const { url } = await magicLinkTokenService.create(
      lead.id,
      scope,
      actor.id,
    );

    const message =
      `Hallo ${lead.firstName}, bitte vervollständige deine Angaben für die Lokführer-Weiterbildung über folgenden Link: ${url}`;

    if (parsed.data.channel === CommunicationChannel.WHATSAPP) {
      // Opt-out guard: never send WhatsApp to a lead that abgemeldet has.
      if (lead.optOut) {
        throw new ValidationError(OPT_OUT_BLOCK_MESSAGE);
      }
      await communicationService.sendWhatsapp({
        leadId: lead.id,
        to: lead.phone,
        message,
      });
    } else {
      const emailBody = `Hallo ${lead.firstName},\n\nbitte vervollständige deine Angaben für deine geförderte Lokführer-Weiterbildung über den folgenden sicheren Link:\n\n${url}`;
      await communicationService.sendEmail({
        leadId: lead.id,
        to: lead.email,
        subject: "Deine Lokführer-Weiterbildung – nächster Schritt",
        html: renderEmailHtml(emailBody),
      });
    }

    return { url };
  });
}
