/**
 * DemoDataSeederActivity — per-lead activity for the demo dataset:
 * audit trail, WhatsApp + e-mail threads, calls, notes, generated documents,
 * uploaded files, applicant magic-links, plus standalone contact inquiries.
 */
import {
  AuditAction,
  CallOutcome,
  CommunicationChannel,
  CommunicationDirection,
  DocumentStatus,
  DocumentType,
  LeadStatus,
  MagicLinkScope,
  PORTAL_DOCUMENT_ORDER,
  type PortalDocumentKind,
  type PortalDocumentStatus,
  type PortalLinkStatus,
  UploadedFileKind,
} from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";
import { demoSeedRepository } from "../repositories/DemoSeedRepository";
import type { SeededLead } from "./DemoDataSeeder";
import {
  DEMO_BATCH,
  DEMO_SOURCE,
  DEMO_TAG,
  fakeHex,
  hoursFromNow,
  minutesAfter,
} from "./demo/demoConstants";

const PHASE_RANK: Record<string, number> = {
  [LeadStatus.NEW]: 0,
  [LeadStatus.CONTACT_PENDING]: 0,
  [LeadStatus.QUALIFIED]: 1,
  [LeadStatus.HOT]: 1,
  [LeadStatus.CONTACTED]: 1,
  [LeadStatus.CALL_SCHEDULED]: 1,
  [LeadStatus.BRIEFING_SENT]: 1,
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

function rankOf(status: LeadStatus): number {
  return PHASE_RANK[status] ?? 0;
}

function docStatusFor(leadStatus: LeadStatus, idx: number): DocumentStatus {
  const rank = rankOf(leadStatus);
  if (idx >= rank) return DocumentStatus.MISSING_DATA;
  if (idx === rank - 1) return DocumentStatus.READY_TO_GENERATE;
  return DocumentStatus.GENERATED;
}

async function seedComms(lead: SeededLead, idx: number): Promise<void> {
  const t0 = lead.createdAt;
  const events: Array<{
    channel: CommunicationChannel;
    direction: CommunicationDirection;
    payload: string;
    at: Date;
  }> = [
    {
      channel: CommunicationChannel.WHATSAPP,
      direction: CommunicationDirection.OUT,
      payload:
        "Hallo! Danke für deine Anfrage zur Lokführer-Weiterbildung — wir melden uns gleich persönlich. 🚆",
      at: minutesAfter(t0, 5),
    },
    {
      channel: CommunicationChannel.WHATSAPP,
      direction: CommunicationDirection.IN,
      payload: "Super, danke! Wann kann ich mit dem Start rechnen?",
      at: minutesAfter(t0, 42),
    },
  ];

  // Give roughly every second lead an e-mail thread too, so the e-mail inbox
  // and the communication hub both demonstrate real threads.
  if (idx % 2 === 0) {
    events.push(
      {
        channel: CommunicationChannel.EMAIL,
        direction: CommunicationDirection.OUT,
        payload:
          "Guten Tag, anbei die Infos zur 15-monatigen Weiterbildung sowie zum Bildungsgutschein der Agentur für Arbeit. Viele Grüße, Ihr Lokführer.de-Team",
        at: minutesAfter(t0, 90),
      },
      {
        channel: CommunicationChannel.EMAIL,
        direction: CommunicationDirection.IN,
        payload:
          "Vielen Dank für die Unterlagen. Welche Dokumente benötigen Sie von mir für den Bildungsgutschein?",
        at: minutesAfter(t0, 240),
      },
    );
  }

  for (const e of events) {
    const row = await prisma.communicationEvent.create({
      data: {
        leadId: lead.id,
        channel: e.channel,
        direction: e.direction,
        payload: e.payload,
        createdAt: e.at,
      },
    });
    await demoSeedRepository.track("CommunicationEvent", row.id, DEMO_BATCH);
  }
}

async function seedCallsAndNotes(lead: SeededLead): Promise<void> {
  const rank = rankOf(lead.status);
  const outcomeByPhase: CallOutcome =
    rank >= 3
      ? CallOutcome.APPOINTMENT_SET
      : rank >= 1
        ? CallOutcome.TALKED
        : CallOutcome.ATTEMPT_NO_ANSWER;

  const call = await prisma.callLog.create({
    data: {
      leadId: lead.id,
      userId: lead.assignedToId,
      outcome: outcomeByPhase,
      note: "Erstkontakt geführt — Interessent ist motiviert, nächste Schritte besprochen.",
      nextStep: "Unterlagen anfordern und Agenturtermin vorbereiten.",
      durationSeconds: 60 * (3 + Math.floor(Math.random() * 8)),
      createdAt: minutesAfter(lead.createdAt, 120),
    },
  });
  await demoSeedRepository.track("CallLog", call.id, DEMO_BATCH);

  const note = await prisma.note.create({
    data: {
      leadId: lead.id,
      author: lead.assignedToId,
      body: "Sehr interessiert. Bevorzugter Standort passt zum Profil, Schichtarbeit ok.",
      createdAt: minutesAfter(lead.createdAt, 180),
    },
  });
  await demoSeedRepository.track("Note", note.id, DEMO_BATCH);
}

async function seedAudit(lead: SeededLead): Promise<void> {
  const created = await prisma.auditLog.create({
    data: {
      actor: "system",
      action: AuditAction.LEAD_CREATED,
      entityType: "Lead",
      entityId: lead.id,
      details: JSON.stringify({ demo: true, source: DEMO_SOURCE }),
      createdAt: lead.createdAt,
    },
  });
  await demoSeedRepository.track("AuditLog", created.id, DEMO_BATCH);

  const called = await prisma.auditLog.create({
    data: {
      actor: lead.assignedToId,
      action: AuditAction.CALL_LOGGED,
      entityType: "Lead",
      entityId: lead.id,
      details: JSON.stringify({ demo: true }),
      createdAt: minutesAfter(lead.createdAt, 120),
    },
  });
  await demoSeedRepository.track("AuditLog", called.id, DEMO_BATCH);
}

async function seedDocuments(lead: SeededLead): Promise<void> {
  const plan: Array<{ type: DocumentType; status: DocumentStatus }> = [
    { type: DocumentType.CV, status: docStatusFor(lead.status, 0) },
    { type: DocumentType.AA_REASONING, status: docStatusFor(lead.status, 1) },
    { type: DocumentType.AA_GUIDE, status: docStatusFor(lead.status, 2) },
  ];
  for (const d of plan) {
    const generatedAt =
      d.status === DocumentStatus.GENERATED
        ? minutesAfter(lead.createdAt, 300)
        : null;
    const row = await prisma.document.create({
      data: {
        leadId: lead.id,
        type: d.type,
        status: d.status,
        generatedAt,
        createdAt: lead.createdAt,
        updatedAt: lead.createdAt,
      },
    });
    await demoSeedRepository.track("Document", row.id, DEMO_BATCH);
  }
}

async function seedUploads(lead: SeededLead): Promise<void> {
  // Applicants in the document phase or later have uploaded their files.
  if (rankOf(lead.status) < 1) return;
  const files: Array<{ kind: UploadedFileKind; name: string; mime: string; size: number }> = [
    { kind: UploadedFileKind.CV, name: "Lebenslauf.pdf", mime: "application/pdf", size: 184_320 },
    { kind: UploadedFileKind.ID, name: "Personalausweis.jpg", mime: "image/jpeg", size: 521_114 },
  ];
  if (rankOf(lead.status) >= 2) {
    files.push({
      kind: UploadedFileKind.CERTIFICATE,
      name: "Schulzeugnis.pdf",
      mime: "application/pdf",
      size: 246_500,
    });
  }
  for (const f of files) {
    const row = await prisma.uploadedFile.create({
      data: {
        leadId: lead.id,
        kind: f.kind,
        originalName: f.name,
        mimeType: f.mime,
        sizeBytes: f.size,
        storageKey: `demo/${lead.id}/${f.kind.toLowerCase()}`,
        sha256: fakeHex(`${lead.id}:${f.kind}`),
        uploadedAt: minutesAfter(lead.createdAt, 360),
      },
    });
    await demoSeedRepository.track("UploadedFile", row.id, DEMO_BATCH);
  }
}

async function seedMagicLink(lead: SeededLead): Promise<void> {
  // Active applicant portal access for the document/agency phases.
  const rank = rankOf(lead.status);
  if (rank < 1 || rank > 3) return;
  const used = rank >= 2;
  const row = await prisma.magicLinkToken.create({
    data: {
      tokenHash: fakeHex(`token:${lead.id}`),
      leadId: lead.id,
      scope: used ? MagicLinkScope.UPLOAD_DOCS : MagicLinkScope.COMPLETE_PROFILE,
      expiresAt: hoursFromNow(72),
      usedAt: used ? minutesAfter(lead.createdAt, 400) : null,
      createdAt: minutesAfter(lead.createdAt, 60),
    },
  });
  await demoSeedRepository.track("MagicLinkToken", row.id, DEMO_BATCH);
}

function portalDocStatus(
  kind: PortalDocumentKind,
  rank: number,
): PortalDocumentStatus {
  switch (kind) {
    case "LEBENSLAUF":
    case "AUSWEIS":
      return rank >= 1 ? "UPLOADED" : "REQUESTED";
    case "FUEHRERSCHEIN":
      return rank >= 2 ? "UPLOADED" : rank >= 1 ? "REQUESTED" : "MISSING";
    case "ZEUGNISSE":
      return rank >= 2 ? "UPLOADED" : "MISSING";
    case "BILDUNGSGUTSCHEIN":
      return rank >= 4 ? "APPROVED" : rank >= 2 ? "UPLOADED" : rank >= 1 ? "REQUESTED" : "MISSING";
    default:
      return "MISSING";
  }
}

async function seedPortal(lead: SeededLead): Promise<void> {
  const rank = rankOf(lead.status);

  for (const kind of PORTAL_DOCUMENT_ORDER) {
    const status = portalDocStatus(kind, rank);
    const uploaded = status === "UPLOADED" || status === "APPROVED";
    const row = await prisma.portalDocument.create({
      data: {
        leadId: lead.id,
        kind,
        status,
        fileName: uploaded ? `${kind}_Bewerber.pdf` : null,
        requestedAt: status === "REQUESTED" ? minutesAfter(lead.createdAt, 60) : null,
        uploadedAt: uploaded ? minutesAfter(lead.createdAt, 400) : null,
        reviewedAt: status === "APPROVED" ? minutesAfter(lead.createdAt, 500) : null,
        createdAt: lead.createdAt,
        updatedAt: lead.createdAt,
      },
    });
    await demoSeedRepository.track("PortalDocument", row.id, DEMO_BATCH);
  }

  const status: PortalLinkStatus =
    rank >= 4 ? "COMPLETED" : rank >= 1 ? "OPENED" : "ACTIVE";
  const link = await prisma.portalLink.create({
    data: {
      tokenHash: fakeHex(`portal:${lead.id}`),
      leadId: lead.id,
      status,
      expiresAt: hoursFromNow(72 * 7),
      openedAt: rank >= 1 ? minutesAfter(lead.createdAt, 30) : null,
      submittedAt: rank >= 2 ? minutesAfter(lead.createdAt, 410) : null,
      completedAt: rank >= 4 ? minutesAfter(lead.createdAt, 520) : null,
      formData: JSON.stringify({
        availability: "ab sofort",
        agencyStatus: "Agentur für Arbeit",
        hasEducationVoucher: rank >= 3,
        hasDrivingLicense: true,
      }),
      createdAt: minutesAfter(lead.createdAt, 20),
      updatedAt: lead.createdAt,
    },
  });
  await demoSeedRepository.track("PortalLink", link.id, DEMO_BATCH);
}

export async function seedDemoActivity(leads: SeededLead[]): Promise<void> {
  let idx = 0;
  for (const lead of leads) {
    await seedAudit(lead);
    await seedComms(lead, idx);
    await seedCallsAndNotes(lead);
    await seedDocuments(lead);
    await seedUploads(lead);
    await seedMagicLink(lead);
    await seedPortal(lead);
    idx += 1;
  }

  const inquiries = [
    {
      firstName: "Jonas",
      lastName: "Krüger",
      email: "jonas.krueger@example.com",
      phone: "+49 151 0000 9001",
      message: "Wie lange dauert die Weiterbildung genau und wann ist der nächste Start?",
    },
    {
      firstName: "Emma",
      lastName: "Hoffmann",
      email: "emma.hoffmann@example.com",
      phone: null,
      message: "Gibt es die Möglichkeit, die Ausbildung in Saalfeld zu starten?",
    },
    {
      firstName: "Tobias",
      lastName: "Lang",
      email: "tobias.lang@example.com",
      phone: "+49 151 0000 9003",
      message: "Übernimmt die Agentur für Arbeit wirklich die kompletten Kosten?",
    },
  ];
  for (const i of inquiries) {
    const row = await prisma.contactInquiry.create({
      data: {
        firstName: `${DEMO_TAG} ${i.firstName}`,
        lastName: i.lastName,
        email: i.email,
        phone: i.phone,
        message: i.message,
        source: DEMO_SOURCE,
      },
    });
    await demoSeedRepository.track("ContactInquiry", row.id, DEMO_BATCH);
  }
}
