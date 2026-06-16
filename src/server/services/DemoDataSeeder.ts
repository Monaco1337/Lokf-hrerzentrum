/**
 * DemoDataSeeder — pure data-creation helpers for the demo dataset.
 *
 * Split from DemoDataService to keep individual files under the
 * `max-lines` budget. The seeder writes rows AND tracks them in the
 * demo registry so the cleanup phase can later remove only demo data.
 */
import { hash } from "bcryptjs";

import {
  AuditAction,
  CallOutcome,
  CommunicationChannel,
  CommunicationDirection,
  DocumentStatus,
  DocumentType,
  EmploymentStatus,
  FunnelPath,
  LeadPriority,
  LeadStatus,
  PreferredLocation,
  Role,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { demoSeedRepository } from "../repositories/DemoSeedRepository";

export const DEMO_TAG = "[DEMO]";
export const DEMO_BATCH = "default";
const DEMO_PASSWORD = "demo";
const PASSWORD_ROUNDS = 12;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

export interface SeededLead {
  id: string;
  firstName: string;
  lastName: string;
  status: LeadStatus;
  assignedToId: string;
  score: number;
  priority: LeadPriority;
  createdAt: Date;
}

export interface SeededUsers {
  manager: string;
  agents: string[];
}

export async function seedDemoUsers(): Promise<SeededUsers> {
  const passwordHash = await hash(DEMO_PASSWORD, PASSWORD_ROUNDS);
  const wanted: Array<{ name: string; email: string; role: Role }> = [
    {
      name: `${DEMO_TAG} Mitarbeiter 1`,
      email: "demo.partner1@fairtrain.local",
      role: Role.PARTNER_MANAGER,
    },
    {
      name: `${DEMO_TAG} Mitarbeiter 2`,
      email: "demo.partner2@fairtrain.local",
      role: Role.PARTNER_AGENT,
    },
    {
      name: `${DEMO_TAG} Mitarbeiter 3`,
      email: "demo.partner3@fairtrain.local",
      role: Role.PARTNER_AGENT,
    },
  ];

  const ids: string[] = [];
  for (const u of wanted) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    const created = existing
      ? await prisma.user.update({
          where: { email: u.email },
          data: { name: u.name, role: u.role, isActive: true },
        })
      : await prisma.user.create({
          data: {
            name: u.name,
            email: u.email,
            role: u.role,
            passwordHash,
            isActive: true,
          },
        });
    await demoSeedRepository.track("User", created.id, DEMO_BATCH);
    ids.push(created.id);
  }

  return {
    manager: ids[0]!,
    agents: [ids[1]!, ids[2]!],
  };
}

interface LeadBlueprint {
  first: string;
  last: string;
  city: string;
  email: string;
  phone: string;
  status: LeadStatus;
  score: number;
  priority: LeadPriority;
  ageDays: number;
  assignedTo: string;
  followUpInHours?: number;
  slaBreached?: boolean;
}

function locationFor(city: string): PreferredLocation {
  if (city === "Berlin") return PreferredLocation.BERLIN;
  if (city === "Halle" || city === "Erfurt") return PreferredLocation.SAALFELD;
  return PreferredLocation.UNDECIDED;
}

export async function seedDemoLeads(users: SeededUsers): Promise<SeededLead[]> {
  const blueprints: LeadBlueprint[] = [
    {
      first: "Max",
      last: "Mustermann",
      city: "Berlin",
      email: "max.mustermann@example.com",
      phone: "+49 151 1111 1001",
      status: LeadStatus.HOT,
      score: 92,
      priority: LeadPriority.HOT,
      ageDays: 1,
      assignedTo: users.agents[0]!,
      followUpInHours: 2,
    },
    {
      first: "Lisa",
      last: "Schneider",
      city: "Leipzig",
      email: "lisa.schneider@example.com",
      phone: "+49 151 1111 1002",
      status: LeadStatus.DOC_PENDING,
      score: 71,
      priority: LeadPriority.WARM,
      ageDays: 3,
      assignedTo: users.agents[1]!,
      followUpInHours: 26,
    },
    {
      first: "Tim",
      last: "Wagner",
      city: "Dresden",
      email: "tim.wagner@example.com",
      phone: "+49 151 1111 1003",
      status: LeadStatus.AA_APPOINTMENT_PENDING,
      score: 64,
      priority: LeadPriority.WARM,
      ageDays: 5,
      assignedTo: users.agents[0]!,
      followUpInHours: -4,
      slaBreached: true,
    },
    {
      first: "Sarah",
      last: "Becker",
      city: "Erfurt",
      email: "sarah.becker@example.com",
      phone: "+49 151 1111 1004",
      status: LeadStatus.GUTSCHEIN_PENDING,
      score: 78,
      priority: LeadPriority.WARM,
      ageDays: 9,
      assignedTo: users.agents[1]!,
      followUpInHours: 48,
    },
    {
      first: "Leon",
      last: "Fischer",
      city: "Halle",
      email: "leon.fischer@example.com",
      phone: "+49 151 1111 1005",
      status: LeadStatus.GUTSCHEIN_APPROVED,
      score: 88,
      priority: LeadPriority.HOT,
      ageDays: 14,
      assignedTo: users.manager,
    },
    {
      first: "Anna",
      last: "Müller",
      city: "Berlin",
      email: "anna.mueller@example.com",
      phone: "+49 151 1111 1006",
      status: LeadStatus.ENROLLED,
      score: 95,
      priority: LeadPriority.HOT,
      ageDays: 21,
      assignedTo: users.manager,
    },
  ];

  const out: SeededLead[] = [];
  for (const b of blueprints) {
    const createdAt = daysAgo(b.ageDays);
    const followUpAt =
      b.followUpInHours == null ? null : hoursAgo(-b.followUpInHours);
    const slaBreachedAt = b.slaBreached ? hoursAgo(24) : null;

    const lead = await prisma.lead.create({
      data: {
        firstName: `${DEMO_TAG} ${b.first}`,
        lastName: b.last,
        email: b.email,
        phone: b.phone,
        city: b.city,
        funnelPath: FunnelPath.UNEMPLOYED,
        employmentStatus: EmploymentStatus.UNEMPLOYED,
        preferredLocation: locationFor(b.city),
        acceptsShiftWork: true,
        motivationText:
          "Demo-Eintrag — automatisch generiert für Test & UI-Validierung.",
        score: b.score,
        priority: b.priority,
        status: b.status,
        assignedTo: null,
        assignedToId: b.assignedTo,
        assignedAt: createdAt,
        slaBreachedAt,
        nextFollowUpAt: followUpAt,
        source: "demo",
        createdAt,
        updatedAt: createdAt,
      },
    });
    await demoSeedRepository.track("Lead", lead.id, DEMO_BATCH);
    out.push({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      status: b.status,
      assignedToId: b.assignedTo,
      score: b.score,
      priority: b.priority,
      createdAt,
    });

    const initialHistory = await prisma.statusHistory.create({
      data: {
        leadId: lead.id,
        fromStatus: null,
        toStatus: LeadStatus.NEW,
        changedBy: "system",
        reason: "Lead erstellt (Demo)",
        createdAt,
      },
    });
    await demoSeedRepository.track("StatusHistory", initialHistory.id, DEMO_BATCH);

    if (b.status !== LeadStatus.NEW) {
      const transition = await prisma.statusHistory.create({
        data: {
          leadId: lead.id,
          fromStatus: LeadStatus.NEW,
          toStatus: b.status,
          changedBy: b.assignedTo,
          reason: "Statuswechsel (Demo)",
          createdAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
        },
      });
      await demoSeedRepository.track("StatusHistory", transition.id, DEMO_BATCH);
    }
  }
  return out;
}

function docStatusFor(leadStatus: LeadStatus, idx: number): DocumentStatus {
  const phaseRank: Record<string, number> = {
    [LeadStatus.NEW]: 0,
    [LeadStatus.QUALIFIED]: 0,
    [LeadStatus.HOT]: 1,
    [LeadStatus.CONTACTED]: 1,
    [LeadStatus.DOC_PENDING]: 1,
    [LeadStatus.DOC_READY]: 2,
    [LeadStatus.AA_APPOINTMENT_PENDING]: 2,
    [LeadStatus.AA_APPOINTMENT_DONE]: 3,
    [LeadStatus.GUTSCHEIN_PENDING]: 3,
    [LeadStatus.GUTSCHEIN_APPROVED]: 4,
    [LeadStatus.ENROLLED]: 4,
    [LeadStatus.STARTED]: 4,
    [LeadStatus.CLOSED]: 4,
  };
  const rank = phaseRank[leadStatus] ?? 0;
  if (idx >= rank) return DocumentStatus.MISSING_DATA;
  if (idx === rank - 1) return DocumentStatus.READY_TO_GENERATE;
  return DocumentStatus.GENERATED;
}

export async function seedDemoActivity(leads: SeededLead[]): Promise<void> {
  for (const lead of leads) {
    const audit1 = await prisma.auditLog.create({
      data: {
        actor: "system",
        action: AuditAction.LEAD_CREATED,
        entityType: "Lead",
        entityId: lead.id,
        details: JSON.stringify({ demo: true }),
        createdAt: lead.createdAt,
      },
    });
    await demoSeedRepository.track("AuditLog", audit1.id, DEMO_BATCH);

    const wa = await prisma.communicationEvent.create({
      data: {
        leadId: lead.id,
        channel: CommunicationChannel.WHATSAPP,
        direction: CommunicationDirection.OUT,
        payload: "Hi! Vielen Dank für deine Anfrage — wir melden uns gleich.",
        createdAt: new Date(lead.createdAt.getTime() + 5 * 60 * 1000),
      },
    });
    await demoSeedRepository.track("CommunicationEvent", wa.id, DEMO_BATCH);

    const call1 = await prisma.callLog.create({
      data: {
        leadId: lead.id,
        userId: lead.assignedToId,
        outcome: CallOutcome.TALKED,
        note: "Erstgespräch geführt — Lead ist motiviert, Unterlagen folgen.",
        nextStep: "Lebenslauf anfordern.",
        createdAt: new Date(lead.createdAt.getTime() + 2 * 60 * 60 * 1000),
      },
    });
    await demoSeedRepository.track("CallLog", call1.id, DEMO_BATCH);

    const audit2 = await prisma.auditLog.create({
      data: {
        actor: lead.assignedToId,
        action: AuditAction.CALL_LOGGED,
        entityType: "Lead",
        entityId: lead.id,
        details: JSON.stringify({ outcome: CallOutcome.TALKED }),
        createdAt: new Date(lead.createdAt.getTime() + 2 * 60 * 60 * 1000),
      },
    });
    await demoSeedRepository.track("AuditLog", audit2.id, DEMO_BATCH);

    const note = await prisma.note.create({
      data: {
        leadId: lead.id,
        author: lead.assignedToId,
        body: "Sehr interessiert. Bevorzugter Standort passt zum Profil.",
        createdAt: new Date(lead.createdAt.getTime() + 3 * 60 * 60 * 1000),
      },
    });
    await demoSeedRepository.track("Note", note.id, DEMO_BATCH);

    const docPlan: Array<{ type: DocumentType; status: DocumentStatus }> = [
      { type: DocumentType.CV, status: docStatusFor(lead.status, 0) },
      { type: DocumentType.AA_REASONING, status: docStatusFor(lead.status, 1) },
      { type: DocumentType.AA_GUIDE, status: docStatusFor(lead.status, 2) },
    ];
    for (const d of docPlan) {
      const row = await prisma.document.create({
        data: {
          leadId: lead.id,
          type: d.type,
          status: d.status,
          createdAt: lead.createdAt,
          updatedAt: lead.createdAt,
        },
      });
      await demoSeedRepository.track("Document", row.id, DEMO_BATCH);
    }
  }

  const inquiryBlueprints = [
    {
      firstName: "Jonas",
      lastName: "Krüger",
      email: "jonas.krueger@example.com",
      phone: "+49 151 0000 9001",
      message: "Wie lange dauert die Weiterbildung?",
    },
    {
      firstName: "Emma",
      lastName: "Hoffmann",
      email: "emma.hoffmann@example.com",
      phone: null,
      message: "Gibt es die Möglichkeit, in Saalfeld zu starten?",
    },
  ];
  for (const i of inquiryBlueprints) {
    const row = await prisma.contactInquiry.create({
      data: {
        firstName: `${DEMO_TAG} ${i.firstName}`,
        lastName: i.lastName,
        email: i.email,
        phone: i.phone,
        message: i.message,
        source: "demo",
      },
    });
    await demoSeedRepository.track("ContactInquiry", row.id, DEMO_BATCH);
  }
}
