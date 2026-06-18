/**
 * Seeds the standard, admin-editable template library (10 templates) and the
 * standard automation rules (10 rules) used to demonstrate the configurable
 * automation system. Everything is registered in the demo registry so it stays
 * cleanly separable from production data.
 */
import { prisma } from "../db/prisma";
import { demoSeedRepository } from "../repositories/DemoSeedRepository";
import { DEMO_BATCH } from "./demo/demoConstants";

interface TplSeed {
  slug: string;
  channel: "WHATSAPP" | "EMAIL" | "INTERNAL";
  category: string;
  name: string;
  subject: string | null;
  body: string;
  requiresConsent: string | null;
}

const TEMPLATES: TplSeed[] = [
  {
    slug: "std.wa.welcome",
    channel: "WHATSAPP",
    category: "welcome",
    name: "WhatsApp Willkommen",
    subject: null,
    body: "Hallo {{first_name}} 👋, willkommen bei {{company_name}}! Schön, dass du Lokführer:in werden möchtest. Wir begleiten dich Schritt für Schritt. Dein nächster Schritt: {{secure_form_link}}",
    requiresConsent: "WHATSAPP",
  },
  {
    slug: "std.wa.documents",
    channel: "WHATSAPP",
    category: "documents",
    name: "WhatsApp Unterlagen anfordern",
    subject: null,
    body: "Hallo {{first_name}}, für deinen Bildungsgutschein brauchen wir noch: {{missing_documents}}. Du kannst sie hier sicher hochladen: {{upload_link}}. Bei Fragen meldet sich {{owner_name}}.",
    requiresConsent: "WHATSAPP",
  },
  {
    slug: "std.wa.reminder.form",
    channel: "WHATSAPP",
    category: "reminder",
    name: "WhatsApp Reminder Formular nicht geöffnet",
    subject: null,
    body: "Hallo {{first_name}}, wir haben dir das Formular geschickt, aber noch keine Rückmeldung erhalten. Es dauert nur 3 Minuten: {{secure_form_link}}",
    requiresConsent: "WHATSAPP",
  },
  {
    slug: "std.wa.reminder.docs",
    channel: "WHATSAPP",
    category: "reminder",
    name: "WhatsApp Reminder Unterlagen fehlen",
    subject: null,
    body: "Hallo {{first_name}}, es fehlen noch Unterlagen ({{missing_documents}}), damit wir deinen Antrag bei der Agentur vorbereiten können. Upload: {{upload_link}}",
    requiresConsent: "WHATSAPP",
  },
  {
    slug: "std.wa.docs.query",
    channel: "WHATSAPP",
    category: "documents",
    name: "WhatsApp Rückfrage Unterlagen",
    subject: null,
    body: "Hallo {{first_name}}, kurze Rückfrage zu deinen Unterlagen: passt alles soweit oder brauchst du Hilfe beim Hochladen? {{owner_name}} ist für dich da.",
    requiresConsent: "WHATSAPP",
  },
  {
    slug: "std.wa.booking",
    channel: "WHATSAPP",
    category: "appointment",
    name: "WhatsApp Terminlink senden",
    subject: null,
    body: "Hallo {{first_name}}, lass uns telefonieren! Such dir einfach einen passenden Termin aus: {{booking_link}}",
    requiresConsent: "WHATSAPP",
  },
  {
    slug: "std.wa.booking.confirm",
    channel: "WHATSAPP",
    category: "appointment",
    name: "WhatsApp Terminbestätigung",
    subject: null,
    body: "Super, {{first_name}}! Dein Termin ist bestätigt: {{appointment_date}} um {{appointment_time}} Uhr. {{owner_name}} freut sich auf das Gespräch.",
    requiresConsent: "WHATSAPP",
  },
  {
    slug: "std.wa.reactivation",
    channel: "WHATSAPP",
    category: "reactivation",
    name: "WhatsApp Reaktivierung",
    subject: null,
    body: "Hallo {{first_name}}, wir haben länger nichts voneinander gehört. Dein Weg zum Lokführer-Job ist weiter möglich – sollen wir gemeinsam weitermachen? {{secure_form_link}}",
    requiresConsent: "WHATSAPP",
  },
  {
    slug: "std.email.summary",
    channel: "EMAIL",
    category: "followup",
    name: "E-Mail Zusammenfassung nächster Schritt",
    subject: "Deine nächsten Schritte zur Lokführer-Weiterbildung",
    body: "Hallo {{full_name}},\n\nvielen Dank für das Gespräch. Hier deine nächsten Schritte:\n\n1. Unterlagen hochladen: {{upload_link}}\n2. Termin bei der Agentur: {{booking_link}}\n\nFehlende Unterlagen: {{missing_documents}}\n\nBei Fragen erreichst du {{owner_name}} jederzeit.\n\nViele Grüße\n{{company_name}}",
    requiresConsent: "EMAIL",
  },
  {
    slug: "std.internal.sla",
    channel: "INTERNAL",
    category: "escalation",
    name: "Interne Eskalation SLA",
    subject: null,
    body: "⚠️ SLA überschritten für {{full_name}} ({{phone}}). Letzter Kontakt liegt zu lange zurück. Bitte umgehend {{owner_name}} informieren und Lead prüfen.",
    requiresConsent: null,
  },
];

interface RuleSeed {
  name: string;
  description: string;
  trigger: string;
  conditions: Array<{ type: string; value?: string | number | boolean }>;
  actions: Array<Record<string, unknown>>;
}

function buildRules(tpl: Record<string, string>): RuleSeed[] {
  return [
    {
      name: "Neuer Lead mit WhatsApp-Opt-in → Willkommen",
      description: "Begrüßt neue Leads mit WhatsApp-Einwilligung automatisch.",
      trigger: "LEAD_CREATED",
      conditions: [{ type: "hasWhatsappConsent" }],
      actions: [{ type: "sendTemplateSimulation", templateId: tpl["std.wa.welcome"] }],
    },
    {
      name: "Neuer Lead → Aufgabe Erstkontakt prüfen",
      description: "Erstellt für jeden neuen Lead eine Erstkontakt-Aufgabe.",
      trigger: "LEAD_CREATED",
      conditions: [],
      actions: [{ type: "createTask", taskTitle: "Erstkontakt prüfen" }],
    },
    {
      name: "Formular nach 2h nicht geöffnet → Reminder 1",
      description: "Erinnert, wenn das Formular nach 2 Stunden nicht geöffnet wurde.",
      trigger: "LEAD_CREATED",
      conditions: [
        { type: "hasWhatsappConsent" },
        { type: "noFormOpenedForHours", value: 2 },
      ],
      actions: [{ type: "sendTemplateSimulation", templateId: tpl["std.wa.reminder.form"] }],
    },
    {
      name: "Formular nach 24h nicht abgeschlossen → Reminder 2",
      description: "Zweite Erinnerung bei nicht abgeschlossenem Formular.",
      trigger: "LEAD_CREATED",
      conditions: [
        { type: "hasWhatsappConsent" },
        { type: "noFormOpenedForHours", value: 24 },
      ],
      actions: [{ type: "sendTemplateSimulation", templateId: tpl["std.wa.reminder.docs"] }],
    },
    {
      name: "Unterlagen fehlen nach 48h → Aufgabe nachfordern",
      description: "Erstellt eine Aufgabe, wenn Unterlagen 48h fehlen.",
      trigger: "DOCUMENT_REQUESTED",
      conditions: [
        { type: "missingDocuments" },
        { type: "noUploadForHours", value: 48 },
      ],
      actions: [{ type: "createTask", taskTitle: "Unterlagen nachfordern" }],
    },
    {
      name: "Unterlagen vollständig → Status Prüfung läuft",
      description: "Setzt den Lead auf Unterlagenprüfung, sobald alles da ist.",
      trigger: "DOCUMENT_UPLOADED",
      conditions: [],
      actions: [{ type: "changeLeadStatus", status: "DOC_PENDING" }],
    },
    {
      name: "Agenturtermin gebucht → Terminbestätigung",
      description: "Bestätigt einen gebuchten Agenturtermin per WhatsApp (Simulation).",
      trigger: "APPOINTMENT_CREATED",
      conditions: [{ type: "hasWhatsappConsent" }],
      actions: [{ type: "sendTemplateSimulation", templateId: tpl["std.wa.booking.confirm"] }],
    },
    {
      name: "SLA überschritten → Eskalation im Leitstand",
      description: "Markiert den Lead als eskaliert und benachrichtigt das Team.",
      trigger: "SLA_EXCEEDED",
      conditions: [],
      actions: [
        { type: "markEscalated", note: "SLA überschritten" },
        { type: "notifyAdminSimulation", note: "SLA-Eskalation prüfen" },
      ],
    },
    {
      name: "Nachricht fehlgeschlagen → Aufgabe Alternativkontakt",
      description: "Erstellt eine Aufgabe, wenn eine Nachricht nicht zugestellt wurde.",
      trigger: "MESSAGE_FAILED",
      conditions: [],
      actions: [{ type: "createTask", taskTitle: "Alternativkontakt prüfen" }],
    },
    {
      name: "Lead qualifiziert → Bildungsgutschein vorbereiten",
      description: "Bereitet den Bildungsgutschein-Schritt für qualifizierte Leads vor.",
      trigger: "LEAD_STATUS_CHANGED",
      conditions: [{ type: "scoreGreaterThan", value: 70 }],
      actions: [
        { type: "createTask", taskTitle: "Bildungsgutschein vorbereiten" },
        { type: "addActivityLog", note: "Lead für Bildungsgutschein vorgemerkt" },
      ],
    },
  ];
}

export async function seedDemoTemplatesAndRules(): Promise<void> {
  const tplIds: Record<string, string> = {};
  for (const t of TEMPLATES) {
    const row = await prisma.automationTemplate.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        trigger: "MANUAL",
        channel: t.channel,
        category: t.category,
        status: "active",
        language: "de",
        name: t.name,
        subject: t.subject,
        body: t.body,
        enabled: true,
        requiresConsent: t.requiresConsent,
      },
      update: { name: t.name, body: t.body, category: t.category },
    });
    await demoSeedRepository.track("AutomationTemplate", row.id, DEMO_BATCH);
    tplIds[t.slug] = row.id;
  }

  const rules = buildRules(tplIds);
  for (const r of rules) {
    const row = await prisma.automationRule.create({
      data: {
        name: r.name,
        description: r.description,
        trigger: r.trigger,
        conditions: JSON.stringify(r.conditions),
        actions: JSON.stringify(r.actions),
        status: "active",
        runMode: "demo",
      },
    });
    await demoSeedRepository.track("AutomationRule", row.id, DEMO_BATCH);
  }
}
