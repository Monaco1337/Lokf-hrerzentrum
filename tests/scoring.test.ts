import { describe, expect, it } from "vitest";

import { computeScore } from "@/features/fairtrain-funnel/scoring/scoring";
import type { ScoringInput } from "@/features/fairtrain-funnel/types";

function baseInput(overrides: Partial<ScoringInput> = {}): ScoringInput {
  return {
    funnelPath: "UNEMPLOYED",
    preferredLocation: "BERLIN",
    acceptsShiftWork: true,
    hasMpuIssue: false,
    hasDrugIssue: false,
    motivationText:
      "Ich bin hoch motiviert, weil ich seit Jahren in Bewegung sein moechte.",
    isInterestedInProgram: true,
    isProfileComplete: true,
    ...overrides,
  };
}

describe("computeScore", () => {
  it("yields HOT for a fully qualified unemployed lead in Berlin", () => {
    const result = computeScore(baseInput());
    expect(result.score).toBe(100);
    expect(result.priority).toBe("HOT");
    expect(result.blockedReasons).toEqual([]);
  });

  it("removes unemployed bonus for employed leads", () => {
    const result = computeScore(baseInput({ funnelPath: "EMPLOYED" }));
    expect(result.score).toBe(75);
    expect(result.priority).toBe("WARM");
  });

  it("does not award location bonus for UNDECIDED", () => {
    const result = computeScore(
      baseInput({ preferredLocation: "UNDECIDED" }),
    );
    expect(result.score).toBe(80);
    expect(result.priority).toBe("HOT");
  });

  it("blocks on MPU issue regardless of score", () => {
    const result = computeScore(baseInput({ hasMpuIssue: true }));
    expect(result.priority).toBe("BLOCKED");
    expect(result.blockedReasons).toContain("MPU_ISSUE");
    expect(result.score).toBeLessThan(100); // exclusion bonus removed
  });

  it("blocks on drug issue", () => {
    const result = computeScore(baseInput({ hasDrugIssue: true }));
    expect(result.priority).toBe("BLOCKED");
    expect(result.blockedReasons).toContain("DRUG_ISSUE");
  });

  it("blocks when shift work is rejected", () => {
    const result = computeScore(baseInput({ acceptsShiftWork: false }));
    expect(result.priority).toBe("BLOCKED");
    expect(result.blockedReasons).toContain("NO_SHIFT_WORK");
  });

  it("blocks when program interest is missing", () => {
    const result = computeScore(baseInput({ isInterestedInProgram: false }));
    expect(result.priority).toBe("BLOCKED");
    expect(result.blockedReasons).toContain("NO_PROGRAM_INTEREST");
  });

  it("denies motivation bonus for short text", () => {
    const result = computeScore(baseInput({ motivationText: "kurz" }));
    expect(result.score).toBe(90);
  });

  it("denies completeness bonus when profile incomplete", () => {
    const result = computeScore(baseInput({ isProfileComplete: false }));
    expect(result.score).toBe(90);
  });

  it("classifies COLD when below threshold", () => {
    const result = computeScore(
      baseInput({
        funnelPath: "EMPLOYED",
        preferredLocation: "UNDECIDED",
        motivationText: null,
        isProfileComplete: false,
      }),
    );
    expect(result.score).toBeLessThan(50);
    expect(result.priority).toBe("COLD");
  });
});
