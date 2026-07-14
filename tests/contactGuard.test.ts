import { describe, expect, it } from "vitest";

import { ContactState, LeadStatus } from "@/features/fairtrain-funnel/types";
import {
  ContactGuardService,
  type GuardableLead,
} from "@/server/services/ContactGuardService";

const guard = new ContactGuardService();

function lead(overrides: Partial<GuardableLead> = {}): GuardableLead {
  return {
    status: LeadStatus.NEW,
    contactState: ContactState.NONE,
    reactivationExcluded: false,
    automationPaused: false,
    lastManualContactAt: null,
    communicationStarted: false,
    lastManualContactBy: null,
    lastManualContactChannel: null,
    ...overrides,
  };
}

describe("ContactGuardService.evaluate", () => {
  it("allows an untouched NEW lead", () => {
    expect(guard.evaluate(lead()).blocked).toBe(false);
  });

  it("blocks when reactivationExcluded", () => {
    const d = guard.evaluate(lead({ reactivationExcluded: true }));
    expect(d.blocked).toBe(true);
    expect(d.code).toBe("reactivation_excluded");
  });

  it("blocks when automations are paused", () => {
    const d = guard.evaluate(lead({ automationPaused: true }));
    expect(d.blocked).toBe(true);
    expect(d.code).toBe("automation_paused");
  });

  it("blocks each protective contact state", () => {
    for (const state of [
      ContactState.WAITING_FOR_FUNNEL,
      ContactState.WAITING_FOR_DOCUMENTS,
      ContactState.MANUALLY_CONTACTED,
      ContactState.CONVERSATION_COMPLETED,
      ContactState.NO_INTEREST,
    ]) {
      const d = guard.evaluate(lead({ contactState: state }));
      expect(d.blocked, `state ${state}`).toBe(true);
      expect(d.code).toBe(`contact_state:${state}`);
    }
  });

  it("blocks when a manual contact timestamp is set", () => {
    const d = guard.evaluate(lead({ lastManualContactAt: new Date() }));
    expect(d.blocked).toBe(true);
    expect(d.code).toBe("manual_contact");
  });

  it("does NOT block documents_received on its own (ready for a human)", () => {
    expect(
      guard.evaluate(lead({ contactState: ContactState.DOCUMENTS_RECEIVED }))
        .blocked,
    ).toBe(false);
  });
});

describe("ContactGuardService.isReactivationBlocked", () => {
  it("allows a truly cold lead (NEW, no handling)", () => {
    expect(guard.isReactivationBlocked(lead())).toBe(false);
    expect(guard.isReactivationBlocked(lead({ status: LeadStatus.QUALIFIED }))).toBe(
      false,
    );
    expect(guard.isReactivationBlocked(lead({ status: LeadStatus.HOT }))).toBe(false);
    expect(
      guard.isReactivationBlocked(lead({ status: LeadStatus.CONTACT_PENDING })),
    ).toBe(false);
  });

  it("excludes leads already contacted / in the funnel / with docs / appointment", () => {
    for (const status of [
      LeadStatus.CONTACTED,
      LeadStatus.REPLIED,
      LeadStatus.FORWARDED,
      LeadStatus.LANDINGPAGE_OPENED,
      LeadStatus.FUNNEL_STARTED,
      LeadStatus.FUNNEL_COMPLETED,
      LeadStatus.DOC_PENDING,
      LeadStatus.DOC_READY,
      LeadStatus.CALL_SCHEDULED,
      LeadStatus.AA_APPOINTMENT_PENDING,
      LeadStatus.CLOSED,
      LeadStatus.REJECTED,
      LeadStatus.LOST,
    ]) {
      expect(guard.isReactivationBlocked(lead({ status })), status).toBe(true);
    }
  });

  it("excludes leads whose campaign communication already started", () => {
    expect(guard.isReactivationBlocked(lead({ communicationStarted: true }))).toBe(
      true,
    );
  });

  it("excludes leads that already uploaded documents", () => {
    expect(
      guard.isReactivationBlocked(
        lead({ contactState: ContactState.DOCUMENTS_RECEIVED }),
      ),
    ).toBe(true);
  });

  it("excludes leads handled manually (waiting for Eignungscheck)", () => {
    expect(
      guard.isReactivationBlocked(
        lead({
          contactState: ContactState.WAITING_FOR_FUNNEL,
          reactivationExcluded: true,
          automationPaused: true,
        }),
      ),
    ).toBe(true);
  });
});
