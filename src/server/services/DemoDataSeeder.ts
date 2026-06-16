/**
 * DemoDataSeeder — team members + lead population for the demo dataset.
 *
 * Split across DemoDataSeeder / DemoDataSeederActivity / DemoDataSeederOps to
 * stay within the per-file max-lines budget. Every row written here is also
 * registered in the demo registry so cleanup only ever removes demo data.
 */
import { hash } from "bcryptjs";

import {
  EmploymentStatus,
  FunnelPath,
  LeadPriority,
  LeadStatus,
  PreferredLocation,
  Role,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { demoSeedRepository } from "../repositories/DemoSeedRepository";
import {
  DEMO_BATCH,
  DEMO_PASSWORD,
  DEMO_PASSWORD_ROUNDS,
  DEMO_SOURCE,
  DEMO_TAG,
  daysAgo,
  hoursAgo,
} from "./demo/demoConstants";

export interface SeededLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  status: LeadStatus;
  assignedToId: string;
  score: number;
  priority: LeadPriority;
  createdAt: Date;
}

export interface SeededUsers {
  manager: string;
  agents: string[];
  all: string[];
}

export async function seedDemoUsers(): Promise<SeededUsers> {
  const passwordHash = await hash(DEMO_PASSWORD, DEMO_PASSWORD_ROUNDS);
  const wanted: Array<{ name: string; email: string; role: Role }> = [
    {
      name: `${DEMO_TAG} Markus Vogel`,
      email: "demo.manager@fairtrain.local",
      role: Role.PARTNER_MANAGER,
    },
    {
      name: `${DEMO_TAG} Julia Hartmann`,
      email: "demo.agent1@fairtrain.local",
      role: Role.PARTNER_AGENT,
    },
    {
      name: `${DEMO_TAG} Kevin Roth`,
      email: "demo.agent2@fairtrain.local",
      role: Role.PARTNER_AGENT,
    },
    {
      name: `${DEMO_TAG} Sandra Köhler`,
      email: "demo.agent3@fairtrain.local",
      role: Role.PARTNER_AGENT,
    },
  ];

  const ids: string[] = [];
  for (const u of wanted) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    const created = existing
      ? await prisma.user.update({
          where: { email: u.email },
          data: {
            name: u.name,
            role: u.role,
            isActive: true,
            lastLoginAt: hoursAgo(Math.floor(Math.random() * 20) + 1),
          },
        })
      : await prisma.user.create({
          data: {
            name: u.name,
            email: u.email,
            role: u.role,
            passwordHash,
            isActive: true,
            lastLoginAt: hoursAgo(Math.floor(Math.random() * 20) + 1),
          },
        });
    await demoSeedRepository.track("User", created.id, DEMO_BATCH);
    ids.push(created.id);
  }

  return {
    manager: ids[0]!,
    agents: [ids[1]!, ids[2]!, ids[3]!],
    all: ids,
  };
}

interface LeadBlueprint {
  first: string;
  last: string;
  city: string;
  status: LeadStatus;
  score: number;
  priority: LeadPriority;
  ageDays: number;
  agentIdx: number; // index into users.agents, or -1 for manager
  followUpInHours?: number;
  slaBreached?: boolean;
}

function locationFor(city: string): PreferredLocation {
  if (city === "Berlin" || city === "Potsdam") return PreferredLocation.BERLIN;
  if (city === "Halle" || city === "Erfurt" || city === "Jena")
    return PreferredLocation.SAALFELD;
  return PreferredLocation.UNDECIDED;
}

/**
 * 14 leads spanning the full Lokführer-Weiterbildung / Bildungsgutschein
 * funnel — from raw inbound to enrolled — with a realistic spread of
 * priorities, owners, overdue follow-ups, SLA breaches and agency stages.
 */
const BLUEPRINTS: LeadBlueprint[] = [
  { first: "Max", last: "Mustermann", city: "Berlin", status: LeadStatus.NEW, score: 84, priority: LeadPriority.HOT, ageDays: 0, agentIdx: 0, followUpInHours: 2 },
  { first: "Lisa", last: "Schneider", city: "Leipzig", status: LeadStatus.CONTACT_PENDING, score: 71, priority: LeadPriority.WARM, ageDays: 0, agentIdx: 1, followUpInHours: -3, slaBreached: true },
  { first: "Tim", last: "Wagner", city: "Dresden", status: LeadStatus.CONTACTED, score: 64, priority: LeadPriority.WARM, ageDays: 1, agentIdx: 2, followUpInHours: -20, slaBreached: true },
  { first: "Sarah", last: "Becker", city: "Erfurt", status: LeadStatus.QUALIFIED, score: 90, priority: LeadPriority.HOT, ageDays: 2, agentIdx: 0, followUpInHours: 5 },
  { first: "Leon", last: "Fischer", city: "Halle", status: LeadStatus.CALL_SCHEDULED, score: 77, priority: LeadPriority.WARM, ageDays: 2, agentIdx: 1, followUpInHours: 26 },
  { first: "Anna", last: "Müller", city: "Berlin", status: LeadStatus.BRIEFING_SENT, score: 81, priority: LeadPriority.WARM, ageDays: 4, agentIdx: 2, followUpInHours: 48 },
  { first: "Jonas", last: "Weber", city: "Potsdam", status: LeadStatus.DOC_PENDING, score: 68, priority: LeadPriority.WARM, ageDays: 5, agentIdx: 0, followUpInHours: -6, slaBreached: true },
  { first: "Marie", last: "Schulz", city: "Jena", status: LeadStatus.DOC_READY, score: 88, priority: LeadPriority.HOT, ageDays: 7, agentIdx: 1, followUpInHours: 12 },
  { first: "Paul", last: "Hofmann", city: "Erfurt", status: LeadStatus.AA_APPOINTMENT_PENDING, score: 74, priority: LeadPriority.WARM, ageDays: 9, agentIdx: 2, followUpInHours: 30 },
  { first: "Laura", last: "Koch", city: "Halle", status: LeadStatus.AA_APPOINTMENT_DONE, score: 79, priority: LeadPriority.WARM, ageDays: 12, agentIdx: -1 },
  { first: "Felix", last: "Richter", city: "Berlin", status: LeadStatus.GUTSCHEIN_PENDING, score: 83, priority: LeadPriority.WARM, ageDays: 15, agentIdx: -1, followUpInHours: 72 },
  { first: "Nina", last: "Klein", city: "Leipzig", status: LeadStatus.GUTSCHEIN_APPROVED, score: 91, priority: LeadPriority.HOT, ageDays: 19, agentIdx: -1 },
  { first: "David", last: "Wolf", city: "Dresden", status: LeadStatus.ENROLLED, score: 94, priority: LeadPriority.HOT, ageDays: 24, agentIdx: 0 },
  { first: "Sophie", last: "Neumann", city: "Saalfeld", status: LeadStatus.STARTED, score: 96, priority: LeadPriority.HOT, ageDays: 33, agentIdx: 1 },
];

function emailFor(first: string, last: string): string {
  return `${first}.${last}@example.com`.toLowerCase();
}

export async function seedDemoLeads(users: SeededUsers): Promise<SeededLead[]> {
  const out: SeededLead[] = [];
  let phoneSeq = 1001;

  for (const b of BLUEPRINTS) {
    const createdAt = daysAgo(b.ageDays);
    const followUpAt =
      b.followUpInHours == null ? null : hoursAgo(-b.followUpInHours);
    const slaBreachedAt = b.slaBreached ? hoursAgo(26) : null;
    const assignedToId =
      b.agentIdx === -1 ? users.manager : users.agents[b.agentIdx]!;
    const email = emailFor(b.first, b.last);
    const phone = `+49 151 2200 ${phoneSeq}`;
    phoneSeq += 1;

    const lead = await prisma.lead.create({
      data: {
        firstName: `${DEMO_TAG} ${b.first}`,
        lastName: b.last,
        email,
        phone,
        city: b.city,
        funnelPath: FunnelPath.UNEMPLOYED,
        employmentStatus: EmploymentStatus.UNEMPLOYED,
        preferredLocation: locationFor(b.city),
        acceptsShiftWork: true,
        motivationText:
          "Demo-Eintrag — automatisch generiert, um Funnel, Pipeline und Reporting zu demonstrieren.",
        score: b.score,
        priority: b.priority,
        status: b.status,
        assignedTo: null,
        assignedToId,
        assignedAt: createdAt,
        assignedById: assignedToId,
        slaBreachedAt,
        nextFollowUpAt: followUpAt,
        source: DEMO_SOURCE,
        utm: "demo/seed",
        createdAt,
        updatedAt: createdAt,
      },
    });
    await demoSeedRepository.track("Lead", lead.id, DEMO_BATCH);

    const initial = await prisma.statusHistory.create({
      data: {
        leadId: lead.id,
        fromStatus: null,
        toStatus: LeadStatus.NEW,
        changedBy: "system",
        reason: "Lead erstellt (Demo)",
        createdAt,
      },
    });
    await demoSeedRepository.track("StatusHistory", initial.id, DEMO_BATCH);

    if (b.status !== LeadStatus.NEW) {
      const transition = await prisma.statusHistory.create({
        data: {
          leadId: lead.id,
          fromStatus: LeadStatus.NEW,
          toStatus: b.status,
          changedBy: assignedToId,
          reason: "Statuswechsel (Demo)",
          createdAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
        },
      });
      await demoSeedRepository.track("StatusHistory", transition.id, DEMO_BATCH);
    }

    out.push({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email,
      phone,
      city: b.city,
      status: b.status,
      assignedToId,
      score: b.score,
      priority: b.priority,
      createdAt,
    });
  }

  return out;
}
