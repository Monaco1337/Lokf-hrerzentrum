/**
 * Seeds automation templates for lead.created trigger.
 * Idempotent — safe to run multiple times (upsert by slug).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL_BODY = `Hallo {{name}},

vielen Dank für dein Interesse an der Lokführer-Ausbildung über {{source_domain}}.

Wir haben deine Anfrage erhalten und melden uns zeitnah bei dir.

Viele Grüße
dein Fairtrain-Team`;

const WHATSAPP_BODY = `Hallo {{name}}, danke für dein Interesse an der Lokführer-Ausbildung. Wir haben deine Anfrage erhalten und melden uns zeitnah bei dir. Viele Grüße, dein Fairtrain-Team`;

const TEMPLATES = [
  {
    slug: "lead.created.email",
    trigger: "LEAD_CREATED",
    channel: "EMAIL",
    name: "Willkommen per E-Mail",
    subject: "Danke für dein Interesse an der Lokführer-Ausbildung",
    body: EMAIL_BODY,
    enabled: true,
    requiresConsent: "EMAIL",
  },
  {
    slug: "lead.created.whatsapp",
    trigger: "LEAD_CREATED",
    channel: "WHATSAPP",
    name: "Willkommen per WhatsApp",
    subject: null,
    body: WHATSAPP_BODY,
    enabled: true,
    requiresConsent: "WHATSAPP",
  },
] as const;

async function main() {
  for (const t of TEMPLATES) {
    await prisma.automationTemplate.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        trigger: t.trigger,
        channel: t.channel,
        name: t.name,
        subject: t.subject,
        body: t.body,
        enabled: t.enabled,
        requiresConsent: t.requiresConsent,
      },
      update: {
        name: t.name,
        subject: t.subject,
        body: t.body,
        enabled: t.enabled,
        requiresConsent: t.requiresConsent,
      },
    });
    // eslint-disable-next-line no-console
    console.info(`[seed] automation template: ${t.slug}`);
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
