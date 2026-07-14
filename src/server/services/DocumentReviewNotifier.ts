/**
 * DocumentReviewNotifier — sends the applicant an automatic WhatsApp + e-mail
 * when a uploaded document is rejected during review. Both channels are
 * best-effort: a failure on one never blocks the review decision or the other
 * channel. The message always carries the rejection reason and a fresh upload
 * link so the applicant can re-submit in one tap.
 *
 * Kept in its own module (a) to respect the file-size budget of PortalService
 * and (b) to break the PortalService ⇄ MessageLedgerService import cycle
 * (MessageLedgerService is loaded lazily).
 */
import {
  PORTAL_DOCUMENT_LABEL,
  type PortalDocumentKind,
} from "@/features/fairtrain-funnel/types";
import { renderEmailHtml } from "@/features/fairtrain-funnel/automation/TemplateRenderer";
import { createEmailProvider } from "@/features/fairtrain-funnel/automation/email/factory";

export interface RejectionRecipient {
  id: string;
  firstName: string | null;
  phone: string | null;
  email: string | null;
}

export interface RejectionNotification {
  lead: RejectionRecipient;
  kind: PortalDocumentKind;
  reason: string;
  uploadLink: string;
  actorId: string;
}

function buildBody(n: RejectionNotification): string {
  const label = PORTAL_DOCUMENT_LABEL[n.kind];
  const greeting = n.lead.firstName ? `Hallo ${n.lead.firstName},` : "Hallo,";
  return [
    greeting,
    `leider konnten wir dein Dokument „${label}" nicht freigeben.`,
    `Grund: ${n.reason}`,
    "Bitte lade das Dokument über deinen persönlichen Link erneut hoch:",
    n.uploadLink,
    "Vielen Dank – dein Team vom Lokführerzentrum",
  ].join("\n\n");
}

export interface RequestNotification {
  lead: RejectionRecipient;
  kinds: PortalDocumentKind[];
  uploadLink: string;
  actorId: string;
}

function buildRequestBody(n: RequestNotification): string {
  const greeting = n.lead.firstName ? `Hallo ${n.lead.firstName},` : "Hallo,";
  const list = n.kinds.map((k) => `• ${PORTAL_DOCUMENT_LABEL[k]}`).join("\n");
  return [
    greeting,
    "für deine Bewerbung fehlen uns noch folgende Unterlagen:",
    list,
    "Bitte lade sie über deinen persönlichen Link hoch:",
    n.uploadLink,
    "Vielen Dank – dein Team vom Lokführerzentrum",
  ].join("\n\n");
}

class DocumentReviewNotifier {
  /** Fire WhatsApp + e-mail. Returns which channels succeeded. */
  async notifyRejected(
    n: RejectionNotification,
  ): Promise<{ whatsapp: boolean; email: boolean }> {
    const body = buildBody(n);
    const [whatsapp, email] = await Promise.all([
      this.sendWhatsApp(n.lead.id, body, n.actorId),
      this.sendEmail(n.lead, n.kind, body),
    ]);
    return { whatsapp, email };
  }

  /** Ask the applicant for the still-missing documents on both channels. */
  async notifyRequested(
    n: RequestNotification,
  ): Promise<{ whatsapp: boolean; email: boolean }> {
    if (n.kinds.length === 0) return { whatsapp: false, email: false };
    const body = buildRequestBody(n);
    const subject = "Fehlende Unterlagen für deine Bewerbung";
    const [whatsapp, email] = await Promise.all([
      this.sendWhatsApp(n.lead.id, body, n.actorId),
      this.sendEmailRaw(n.lead.email, subject, body),
    ]);
    return { whatsapp, email };
  }

  private async sendWhatsApp(
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
        bypassContactGuard: true,
      });
      return true;
    } catch {
      return false;
    }
  }

  private async sendEmail(
    lead: RejectionRecipient,
    kind: PortalDocumentKind,
    body: string,
  ): Promise<boolean> {
    if (!lead.email) return false;
    try {
      const provider = createEmailProvider();
      if (!provider.isConfigured()) return false;
      const subject = `Deine Unterlage „${PORTAL_DOCUMENT_LABEL[kind]}" – bitte erneut hochladen`;
      await provider.send(lead.email, subject, renderEmailHtml(body));
      return true;
    } catch {
      return false;
    }
  }

  private async sendEmailRaw(
    email: string | null,
    subject: string,
    body: string,
  ): Promise<boolean> {
    if (!email) return false;
    try {
      const provider = createEmailProvider();
      if (!provider.isConfigured()) return false;
      await provider.send(email, subject, renderEmailHtml(body));
      return true;
    } catch {
      return false;
    }
  }
}

export const documentReviewNotifier = new DocumentReviewNotifier();
