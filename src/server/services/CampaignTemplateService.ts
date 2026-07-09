/**
 * CampaignTemplateService — seed & resolve the six reactivation templates.
 *
 * Templates are seeded once as DRAFT (never auto-activated). WhatsApp templates
 * carry a `metaTemplateName` and start `metaApprovalStatus="not_submitted"`;
 * live WhatsApp sending stays blocked until an operator sets them to "approved"
 * (after Meta approval) via the template editor. Email templates need no Meta
 * approval. Seeding is idempotent (skips existing slugs), so operator edits are
 * never overwritten.
 */
import {
  REACTIVATION_CAMPAIGN,
  type CampaignTemplateInfo,
} from "@/features/fairtrain-funnel/campaign/types";
import {
  AutomationTrigger,
  CommunicationChannel,
  ConsentType,
} from "@/features/fairtrain-funnel/types";

import { automationTemplateRepository } from "../repositories/AutomationTemplateRepository";

const WA_ERSTKONTAKT = `Hallo {{firstName}}, hier ist das Lokführerzentrum. Sie hatten sich vor einiger Zeit für die Weiterbildung zum Lokführer interessiert. Die staatliche Förderung ist weiterhin möglich – auch für Beschäftigte. Sollen wir Ihnen unverbindlich die aktuellen Infos schicken?`;
const WA_FOLLOWUP_1 = `Hallo {{firstName}}, nur eine kurze Erinnerung vom Lokführerzentrum: Die Umschulung zum Lokführer ist gefragt wie nie und wird gefördert. Möchten Sie wissen, ob es für Sie in Frage kommt?`;
const WA_FOLLOWUP_2 = `Hallo {{firstName}}, letzte Info von uns: Wenn Sie sich die Weiterbildung zum Lokführer noch offenhalten möchten, machen Sie einfach unseren kurzen Eignungscheck: {{magiclink}}`;

const EMAIL_ERSTKONTAKT = `Guten Tag {{firstName}},

Sie hatten sich beim Lokführerzentrum für die geförderte Weiterbildung zum Lokführer interessiert. Die Förderung ist weiterhin möglich – auch für Beschäftigte.

Machen Sie hier Ihren kostenlosen Eignungscheck: {{magiclink}}

Herzliche Grüße
Ihr Lokführerzentrum`;
const EMAIL_FOLLOWUP_1 = `Guten Tag {{firstName}},

kurze Erinnerung: Ihre geförderte Weiterbildung zum Lokführer ist weiterhin möglich. Der Bedarf an Lokführern ist hoch.

Jetzt Eignung prüfen: {{magiclink}}

Herzliche Grüße
Ihr Lokführerzentrum`;
const EMAIL_FOLLOWUP_2 = `Guten Tag {{firstName}},

wir möchten Ihnen die Chance auf eine geförderte Weiterbildung zum Lokführer nicht vorenthalten. Falls es passt, melden Sie sich gern.

Eignungscheck starten: {{magiclink}}

Herzliche Grüße
Ihr Lokführerzentrum`;

interface SeedDef {
  slug: string;
  step: number;
  channel: "WHATSAPP" | "EMAIL";
  name: string;
  subject: string | null;
  body: string;
  metaTemplateName: string | null;
}

function buildSeeds(): SeedDef[] {
  const seeds: SeedDef[] = [];
  const wa = [WA_ERSTKONTAKT, WA_FOLLOWUP_1, WA_FOLLOWUP_2];
  const email = [EMAIL_ERSTKONTAKT, EMAIL_FOLLOWUP_1, EMAIL_FOLLOWUP_2];
  const subjects = [
    "Ihre geförderte Weiterbildung zum Lokführer",
    "Erinnerung: Weiterbildung zum Lokführer",
    "Letzte Info: Eignungscheck Lokführer",
  ];
  REACTIVATION_CAMPAIGN.steps.forEach((s, i) => {
    seeds.push({
      slug: s.whatsappTemplateSlug,
      step: s.step,
      channel: "WHATSAPP",
      name: `Reaktivierung ${s.label} (WhatsApp)`,
      subject: null,
      body: wa[i] ?? WA_ERSTKONTAKT,
      metaTemplateName: s.whatsappTemplateSlug,
    });
    seeds.push({
      slug: s.emailTemplateSlug,
      step: s.step,
      channel: "EMAIL",
      name: `Reaktivierung ${s.label} (E-Mail)`,
      subject: subjects[i] ?? subjects[0]!,
      body: email[i] ?? EMAIL_ERSTKONTAKT,
      metaTemplateName: null,
    });
  });
  return seeds;
}

export class CampaignTemplateService {
  private ensurePromise: Promise<void> | null = null;

  ensureTemplates(): Promise<void> {
    if (!this.ensurePromise) {
      this.ensurePromise = this.seed().catch((err) => {
        this.ensurePromise = null;
        throw err;
      });
    }
    return this.ensurePromise;
  }

  private async seed(): Promise<void> {
    for (const def of buildSeeds()) {
      const existing = await automationTemplateRepository.findBySlug(def.slug);
      if (existing) continue;
      await automationTemplateRepository.upsert({
        slug: def.slug,
        trigger: AutomationTrigger.MANUAL,
        channel:
          def.channel === "WHATSAPP"
            ? CommunicationChannel.WHATSAPP
            : CommunicationChannel.EMAIL,
        category: "reactivation",
        status: "draft",
        language: "de",
        name: def.name,
        subject: def.subject,
        body: def.body,
        requiresConsent:
          def.channel === "WHATSAPP" ? ConsentType.WHATSAPP : null,
        metaTemplateName: def.metaTemplateName,
        metaApprovalStatus: def.channel === "WHATSAPP" ? "not_submitted" : null,
      });
    }
  }

  async resolveTemplates(): Promise<CampaignTemplateInfo[]> {
    await this.ensureTemplates();
    const out: CampaignTemplateInfo[] = [];
    for (const def of buildSeeds()) {
      const t = await automationTemplateRepository.findBySlug(def.slug);
      const approved = t?.metaApprovalStatus === "approved";
      out.push({
        slug: def.slug,
        name: t?.name ?? def.name,
        channel: def.channel,
        step: def.step,
        exists: Boolean(t),
        metaApprovalStatus: t?.metaApprovalStatus ?? null,
        // Email is always sendable; WhatsApp needs Meta approval.
        sendable: def.channel === "EMAIL" ? Boolean(t) : approved,
      });
    }
    return out;
  }
}

export const campaignTemplateService = new CampaignTemplateService();
