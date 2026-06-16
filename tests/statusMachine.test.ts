import { describe, expect, it } from "vitest";

import {
  ALLOWED_TRANSITIONS,
  allowedNextStatuses,
  isTerminal,
  isTransitionAllowed,
} from "@/features/fairtrain-funnel/statusMachine";
import { LeadStatus } from "@/features/fairtrain-funnel/types";

describe("statusMachine", () => {
  it("allows NEW -> QUALIFIED", () => {
    expect(
      isTransitionAllowed(LeadStatus.NEW, LeadStatus.QUALIFIED),
    ).toBe(true);
  });

  it("forbids NEW -> CONTACTED (must qualify first)", () => {
    expect(
      isTransitionAllowed(LeadStatus.NEW, LeadStatus.CONTACTED),
    ).toBe(false);
  });

  it("allows HOT -> CONTACTED", () => {
    expect(
      isTransitionAllowed(LeadStatus.HOT, LeadStatus.CONTACTED),
    ).toBe(true);
  });

  it("forbids HOT -> DOC_PENDING (must contact first)", () => {
    expect(
      isTransitionAllowed(LeadStatus.HOT, LeadStatus.DOC_PENDING),
    ).toBe(false);
  });

  it("treats CLOSED, REJECTED, BLOCKED as terminal", () => {
    expect(isTerminal(LeadStatus.CLOSED)).toBe(true);
    expect(isTerminal(LeadStatus.REJECTED)).toBe(true);
    expect(isTerminal(LeadStatus.BLOCKED)).toBe(true);
    expect(ALLOWED_TRANSITIONS[LeadStatus.CLOSED]).toEqual([]);
    expect(ALLOWED_TRANSITIONS[LeadStatus.REJECTED]).toEqual([]);
    expect(ALLOWED_TRANSITIONS[LeadStatus.BLOCKED]).toEqual([]);
  });

  it("covers every status with an entry in the transition map", () => {
    for (const status of Object.values(LeadStatus)) {
      expect(ALLOWED_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("never has self-transitions", () => {
    for (const status of Object.values(LeadStatus)) {
      expect(ALLOWED_TRANSITIONS[status]).not.toContain(status);
    }
  });

  it("returns the same list via allowedNextStatuses", () => {
    expect(allowedNextStatuses(LeadStatus.NEW)).toEqual(
      ALLOWED_TRANSITIONS[LeadStatus.NEW],
    );
  });

  it("supports the happy-path through to GUTSCHEIN_APPROVED -> CLOSED", () => {
    const happy = [
      [LeadStatus.NEW, LeadStatus.QUALIFIED],
      [LeadStatus.QUALIFIED, LeadStatus.HOT],
      [LeadStatus.HOT, LeadStatus.CONTACTED],
      [LeadStatus.CONTACTED, LeadStatus.DOC_PENDING],
      [LeadStatus.DOC_PENDING, LeadStatus.DOC_READY],
      [LeadStatus.DOC_READY, LeadStatus.AA_APPOINTMENT_PENDING],
      [LeadStatus.AA_APPOINTMENT_PENDING, LeadStatus.AA_APPOINTMENT_DONE],
      [LeadStatus.AA_APPOINTMENT_DONE, LeadStatus.GUTSCHEIN_PENDING],
      [LeadStatus.GUTSCHEIN_PENDING, LeadStatus.GUTSCHEIN_APPROVED],
      [LeadStatus.GUTSCHEIN_APPROVED, LeadStatus.CLOSED],
    ] as const;
    for (const [from, to] of happy) {
      expect(isTransitionAllowed(from, to)).toBe(true);
    }
  });
});
