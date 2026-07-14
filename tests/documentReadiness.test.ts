import { describe, expect, it } from "vitest";

import { computeReadiness } from "@/features/fairtrain-funnel/documents/readiness";
import {
  DocumentStatus,
  DocumentType,
  type LeadDetail,
} from "@/features/fairtrain-funnel/types";

function makeLead(overrides: Partial<LeadDetail> = {}): LeadDetail {
  return {
    id: "lead_test",
    firstName: "Anna",
    lastName: "Beispiel",
    email: "anna@example.com",
    phone: "+49 123",
    city: "Berlin",
    funnelPath: "UNEMPLOYED",
    employmentStatus: "UNEMPLOYED",
    preferredLocation: "BERLIN",
    acceptsShiftWork: true,
    score: 100,
    priority: "HOT",
    status: "QUALIFIED",
    slaBreachedAt: null,
    nextFollowUpAt: null,
    assignedTo: null,
    assignedToId: null,
    assignedToUser: null,
    assignedAt: null,
    source: null,
    whatsappStatus: "offen",
    whatsappReachability: "unbekannt",
    leadQualityStatus: "unbewertet",
    leadScore: 0,
    lastWhatsappMessageAt: null,
    lastWhatsappDeliveredAt: null,
    lastWhatsappReadAt: null,
    lastWhatsappReplyAt: null,
    lastWhatsappErrorAt: null,
    lastWhatsappErrorReason: null,
    lastInboundMessage: null,
    lastInboundMessageAt: null,
    optOut: false,
    optOutAt: null,
    whatsappMarketing: true,
    tags: [],
    contactState: "none",
    reactivationExcluded: false,
    lastManualContactAt: null,
    lastManualContactBy: null,
    lastManualContactChannel: null,
    leadType: "neu",
    campaign: null,
    campaignStatus: null,
    campaignStep: 0,
    communicationStarted: false,
    firstContactSentAt: null,
    automationPaused: false,
    campaignCompleted: false,
    employmentSnapshot: null,
    nextCampaignActionAt: null,
    motivationText: "Ich bin motiviert weil ich seit Jahren in Bewegung sein moechte.",
    utm: null,
    birthDate: null,
    birthPlace: null,
    street: null,
    houseNumber: null,
    postalCode: null,
    addressCity: null,
    nationality: null,
    agencyCity: null,
    agencyCustomerNumber: null,
    agencyCaseWorker: null,
    unemployedSince: null,
    careerHistory: null,
    schoolEducation: null,
    graduationYear: null,
    languages: null,
    computerSkills: null,
    interests: null,
    acceptsTravelHotel: null,
    acceptsPsychLoad: null,
    hasNoKbaDrugEntries: null,
    availability: null,
    agencyStatus: null,
    hasEducationVoucher: null,
    hasDrivingLicense: null,
    createdAt: new Date("2026-01-01T10:00:00Z"),
    updatedAt: new Date("2026-01-01T10:00:00Z"),
    ...overrides,
  };
}

describe("computeReadiness", () => {
  it("marks all standard docs ready when the lead profile is complete (Berlin)", () => {
    const readiness = computeReadiness(makeLead(), null);
    expect(readiness[DocumentType.CV]).toBe(DocumentStatus.READY_TO_GENERATE);
    expect(readiness[DocumentType.AA_REASONING]).toBe(
      DocumentStatus.READY_TO_GENERATE,
    );
    expect(readiness[DocumentType.LOCATION_INFO]).toBe(
      DocumentStatus.READY_TO_GENERATE,
    );
    expect(readiness[DocumentType.MASTER_BUNDLE]).toBe(
      DocumentStatus.READY_TO_GENERATE,
    );
  });

  it("excludes HOUSING_SAALFELD readiness for Berlin-only leads", () => {
    const lead = makeLead({ preferredLocation: "BERLIN" });
    const readiness = computeReadiness(lead, null);
    expect(readiness[DocumentType.HOUSING_SAALFELD]).toBe(
      DocumentStatus.MISSING_DATA,
    );
    // Master bundle should still be ready because the housing doc is not
    // applicable for Berlin-only leads.
    expect(readiness[DocumentType.MASTER_BUNDLE]).toBe(
      DocumentStatus.READY_TO_GENERATE,
    );
  });

  it("requires HOUSING_SAALFELD readiness for Saalfeld leads", () => {
    const lead = makeLead({ preferredLocation: "SAALFELD" });
    const readiness = computeReadiness(lead, null);
    expect(readiness[DocumentType.HOUSING_SAALFELD]).toBe(
      DocumentStatus.READY_TO_GENERATE,
    );
  });

  it("blocks AA_REASONING when motivationText is empty", () => {
    const lead = makeLead({ motivationText: null });
    const readiness = computeReadiness(lead, null);
    expect(readiness[DocumentType.AA_REASONING]).toBe(
      DocumentStatus.MISSING_DATA,
    );
    expect(readiness[DocumentType.MASTER_BUNDLE]).toBe(
      DocumentStatus.MISSING_DATA,
    );
  });

  it("is deterministic across repeated calls", () => {
    const lead = makeLead();
    const a = computeReadiness(lead, null);
    const b = computeReadiness(lead, null);
    expect(a).toEqual(b);
  });
});
