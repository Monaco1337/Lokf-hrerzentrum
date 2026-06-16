/**
 * DemoDataSeederOps — operational work items for the demo dataset:
 * tasks (Aufgaben kanban) and automation templates + send logs (Automationen).
 */
import {
  AutomationLogStatus,
  AutomationTrigger,
  CommunicationChannel,
  ConsentType,
  TaskPriority,
  TaskStatus,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { demoSeedRepository } from "../repositories/DemoSeedRepository";
import type { SeededLead, SeededUsers } from "./DemoDataSeeder";
import {
  DEMO_BATCH,
  DEMO_TAG,
  daysAgo,
  hoursAgo,
  hoursFromNow,
  minutesAfter,
} from "./demo/demoConstants";

interface TaskBlueprint {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  leadIdx: number | null;
  agentIdx: number; // -1 = manager
  dueInHours: number | null;
  done?: boolean;
}

const TASKS: TaskBlueprint[] = [
  { title: "Erstkontakt anrufen", description: "Neuen Hot-Lead innerhalb der SLA telefonisch erreichen.", status: TaskStatus.OPEN, priority: TaskPriority.URGENT, leadIdx: 0, agentIdx: 0, dueInHours: -2 },
  { title: "Rückruf vereinbaren", description: "Bewerber bevorzugt nachmittags — Termin abstimmen.", status: TaskStatus.PLANNED, priority: TaskPriority.HIGH, leadIdx: 4, agentIdx: 1, dueInHours: 6 },
  { title: "Unterlagen prüfen", description: "Hochgeladenen Lebenslauf und Ausweis sichten.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.NORMAL, leadIdx: 7, agentIdx: 1, dueInHours: 24 },
  { title: "Lebenslauf nachfordern", description: "Fehlendes Schulzeugnis beim Bewerber anfordern.", status: TaskStatus.WAIT_APPLICANT, priority: TaskPriority.NORMAL, leadIdx: 6, agentIdx: 0, dueInHours: 48 },
  { title: "Agenturtermin koordinieren", description: "Termin bei der Agentur für Arbeit organisieren.", status: TaskStatus.WAIT_AGENCY, priority: TaskPriority.HIGH, leadIdx: 8, agentIdx: 2, dueInHours: 72 },
  { title: "Bildungsgutschein-Antrag einreichen", description: "Gutscheinantrag finalisieren und einreichen.", status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, leadIdx: 10, agentIdx: -1, dueInHours: 30 },
  { title: "Willkommenspaket versenden", description: "Onboarding-Mail an eingeschriebenen Teilnehmer.", status: TaskStatus.DONE, priority: TaskPriority.NORMAL, leadIdx: 12, agentIdx: 0, dueInHours: null, done: true },
  { title: "Wochen-Review Vertrieb", description: "Pipeline-Durchsicht mit dem Team.", status: TaskStatus.PLANNED, priority: TaskPriority.LOW, leadIdx: null, agentIdx: -1, dueInHours: 96 },
];

export async function seedDemoTasks(
  users: SeededUsers,
  leads: SeededLead[],
): Promise<void> {
  for (const t of TASKS) {
    const assigneeId =
      t.agentIdx === -1 ? users.manager : users.agents[t.agentIdx]!;
    const leadId = t.leadIdx == null ? null : leads[t.leadIdx]?.id ?? null;
    const dueAt = t.dueInHours == null ? null : hoursFromNow(t.dueInHours);
    const completedAt = t.done ? hoursAgo(6) : null;

    const row = await prisma.task.create({
      data: {
        title: `${DEMO_TAG} ${t.title}`,
        description: t.description,
        status: t.status,
        priority: t.priority,
        leadId,
        assigneeId,
        createdById: users.manager,
        dueAt,
        completedAt,
        createdAt: daysAgo(2),
        updatedAt: daysAgo(1),
      },
    });
    await demoSeedRepository.track("Task", row.id, DEMO_BATCH);
  }
}

interface TemplateBlueprint {
  slug: string;
  channel: typeof CommunicationChannel.EMAIL | typeof CommunicationChannel.WHATSAPP;
  name: string;
  subject: string | null;
  body: string;
  requiresConsent: ConsentType | null;
}

const TEMPLATES: TemplateBlueprint[] = [
  {
    slug: "demo.lead.created.email",
    channel: CommunicationChannel.EMAIL,
    name: `${DEMO_TAG} Begrüßung per E-Mail`,
    subject: "Willkommen bei Lokführer.de — deine nächsten Schritte",
    body: "Hallo {{name}},\n\ndanke für dein Interesse an der Lokführer-Weiterbildung. Wir prüfen deinen Bildungsgutschein und melden uns kurzfristig.\n\nViele Grüße\nDein Lokführer.de-Team",
    requiresConsent: ConsentType.EMAIL,
  },
  {
    slug: "demo.lead.created.whatsapp",
    channel: CommunicationChannel.WHATSAPP,
    name: `${DEMO_TAG} Begrüßung per WhatsApp`,
    subject: null,
    body: "Hallo {{name}} 👋 danke für deine Anfrage! Wir melden uns gleich persönlich zu deiner Lokführer-Weiterbildung.",
    requiresConsent: ConsentType.WHATSAPP,
  },
];

export async function seedDemoAutomation(leads: SeededLead[]): Promise<void> {
  const templateIds: Record<string, string> = {};
  for (const tpl of TEMPLATES) {
    const row = await prisma.automationTemplate.upsert({
      where: { slug: tpl.slug },
      create: {
        slug: tpl.slug,
        trigger: AutomationTrigger.LEAD_CREATED,
        channel: tpl.channel,
        name: tpl.name,
        subject: tpl.subject,
        body: tpl.body,
        enabled: true,
        requiresConsent: tpl.requiresConsent,
      },
      update: { name: tpl.name, enabled: true },
    });
    await demoSeedRepository.track("AutomationTemplate", row.id, DEMO_BATCH);
    templateIds[tpl.channel] = row.id;
  }

  // One send log per lead, alternating channel + a couple of skipped/failed
  // outcomes so the Automationen log demonstrates every state.
  let i = 0;
  for (const lead of leads) {
    const tpl = TEMPLATES[i % TEMPLATES.length]!;
    const status: AutomationLogStatus =
      i % 7 === 3
        ? AutomationLogStatus.SKIPPED_NO_CONSENT
        : i % 7 === 5
          ? AutomationLogStatus.FAILED
          : AutomationLogStatus.SENT;
    const sent = status === AutomationLogStatus.SENT;
    const row = await prisma.automationLog.create({
      data: {
        leadId: lead.id,
        templateId: templateIds[tpl.channel] ?? null,
        trigger: AutomationTrigger.LEAD_CREATED,
        channel: tpl.channel,
        status,
        renderedSubject: tpl.subject,
        renderedBody: tpl.body.replace("{{name}}", lead.firstName),
        providerMessageId: sent ? `demo-msg-${i}` : null,
        errorCode: status === AutomationLogStatus.FAILED ? "PROVIDER_TIMEOUT" : null,
        errorMessage:
          status === AutomationLogStatus.FAILED
            ? "Zeitüberschreitung beim Provider (Demo)"
            : null,
        isTest: true,
        triggeredBy: "system",
        createdAt: minutesAfter(lead.createdAt, 6),
      },
    });
    await demoSeedRepository.track("AutomationLog", row.id, DEMO_BATCH);
    i += 1;
  }
}
