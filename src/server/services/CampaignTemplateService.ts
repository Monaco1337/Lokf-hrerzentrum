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
  type MetaTemplateButton,
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
  /** The value the CRM template points to (the EXACT approved Meta name). */
  metaTemplateName: string | null;
  /**
   * The historical default we seeded before (= the slug). Used as a guard when
   * upgrading existing rows: we only rewrite `metaTemplateName` when it is still
   * this legacy value (or empty), never when an operator set a custom name.
   */
  legacyMetaTemplateName?: string | null;
  /**
   * Ordered Meta body parameters mapping onto the approved template's numbered
   * placeholders ({{1}}, {{2}} …). Every reactivation WhatsApp template greets
   * by first name ({{1}}); the follow-ups additionally carry the Eignungscheck
   * URL as {{2}}. Must match the approved template's placeholder count exactly
   * (else Meta rejects with #132000).
   */
  metaBodyParams?: string[];
  /** Interactive Meta buttons, in the approved template's order. */
  metaButtons?: MetaTemplateButton[];
}

/**
 * Quick-reply buttons of the approved "alt_leads_erstkontakt_1" template. Payload
 * is left empty on purpose: the buttons render automatically from the approved
 * template, and inbound classification reads the tapped button's title — so we
 * must NOT send extra button components (which would risk a parameter error).
 */
const ERSTKONTAKT_BUTTONS: MetaTemplateButton[] = [
  { type: "quick_reply", text: "Beschäftigt" },
  { type: "quick_reply", text: "Arbeitssuchend" },
  { type: "quick_reply", text: "Sonstige Situation" },
];

/**
 * Eignungscheck link used as {{2}} in the approved follow-up templates. Punycode
 * host on purpose: WhatsApp's in-app browser (iOS) does not reliably resolve the
 * Umlaut host, so a Unicode link 404s when tapped — the Punycode form always
 * resolves and still lands the user on lokführerzentrum.de/eignungscheck.
 */
const EIGNUNGSCHECK_URL = "https://www.xn--lokfhrerzentrum-2vb.de/eignungscheck";

/** EXACT approved Meta template names, per reactivation step (index 0/1/2). */
const WA_APPROVED_META_NAMES = [
  "alt_leads_erstkontakt_1",
  "alt_leads_followup_1_v3",
  "alt_leads_followup_2_v2",
] as const;

/** Ordered body params per step: Erstkontakt = {{1}} only; follow-ups += URL. */
const WA_BODY_PARAMS: string[][] = [
  ["{{first_name}}"],
  ["{{first_name}}", EIGNUNGSCHECK_URL],
  ["{{first_name}}", EIGNUNGSCHECK_URL],
];

const WA_BUTTONS: MetaTemplateButton[][] = [ERSTKONTAKT_BUTTONS, [], []];

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
      metaTemplateName: WA_APPROVED_META_NAMES[i] ?? s.whatsappTemplateSlug,
      legacyMetaTemplateName: s.whatsappTemplateSlug,
      metaBodyParams: WA_BODY_PARAMS[i] ?? ["{{first_name}}"],
      metaButtons: WA_BUTTONS[i] ?? [],
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
      if (existing) {
        // Align the campaign's WhatsApp templates with their approved Meta
        // counterparts (name + numbered params + buttons). We NEVER touch the
        // approval flag or the chosen sender number — those stay operator-owned.
        // Guards make this safe/idempotent: the name is only rewritten while it
        // is still the legacy default (or empty), and params only while they are
        // empty or the legacy 1-param default — a real operator customisation is
        // always preserved. Email templates are left untouched.
        if (def.channel === "WHATSAPP") {
          const patch: {
            metaTemplateName?: string | null;
            metaBodyParams?: string[];
            metaButtons?: MetaTemplateButton[];
          } = {};

          const nameIsDefault =
            existing.metaTemplateName == null ||
            existing.metaTemplateName === def.legacyMetaTemplateName;
          if (
            def.metaTemplateName &&
            nameIsDefault &&
            existing.metaTemplateName !== def.metaTemplateName
          ) {
            patch.metaTemplateName = def.metaTemplateName;
          }

          const paramsAreDefault =
            existing.metaBodyParams.length === 0 ||
            (existing.metaBodyParams.length === 1 &&
              existing.metaBodyParams[0] === "{{first_name}}");
          if (
            def.metaBodyParams &&
            def.metaBodyParams.length > 0 &&
            paramsAreDefault &&
            JSON.stringify(existing.metaBodyParams) !==
              JSON.stringify(def.metaBodyParams)
          ) {
            patch.metaBodyParams = def.metaBodyParams;
          }

          if (
            def.metaButtons &&
            def.metaButtons.length > 0 &&
            existing.metaButtons.length === 0
          ) {
            patch.metaButtons = def.metaButtons;
          }

          if (Object.keys(patch).length > 0) {
            await automationTemplateRepository.update(existing.id, patch);
          }
        }
        continue;
      }
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
        metaBodyParams: def.metaBodyParams ?? [],
        metaButtons: def.metaButtons ?? [],
      });
    }
  }

  async resolveTemplates(): Promise<CampaignTemplateInfo[]> {
    await this.ensureTemplates();
    const out: CampaignTemplateInfo[] = [];
    for (const def of buildSeeds()) {
      const t = await automationTemplateRepository.findBySlug(def.slug);
      let approved = t?.metaApprovalStatus === "approved";
      let senderConfigured = Boolean(t?.senderPhoneNumberId?.trim());
      let effective = t;

      // Mirror the send-time resolution: if the slug row itself is not sendable,
      // reflect an approved WhatsApp template with the same Meta name so the UI
      // correctly shows "Freigegeben" (and the operator can release).
      if (def.channel === "WHATSAPP" && !(approved && senderConfigured)) {
        const metaName = (t?.metaTemplateName ?? def.metaTemplateName)?.trim();
        if (metaName) {
          const alt =
            await automationTemplateRepository.findApprovedWhatsappByMetaName(
              metaName,
            );
          if (alt) {
            effective = alt;
            approved = true;
            senderConfigured = true;
          }
        }
      }

      out.push({
        slug: def.slug,
        name: effective?.name ?? def.name,
        channel: def.channel,
        step: def.step,
        exists: Boolean(t),
        metaApprovalStatus: effective?.metaApprovalStatus ?? null,
        // Email is always sendable; WhatsApp needs Meta approval AND a sender.
        sendable:
          def.channel === "EMAIL"
            ? Boolean(t)
            : approved && senderConfigured,
        senderConfigured: def.channel === "EMAIL" ? true : senderConfigured,
      });
    }
    return out;
  }
}

export const campaignTemplateService = new CampaignTemplateService();
