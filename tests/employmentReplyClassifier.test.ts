import { describe, expect, it } from "vitest";

import {
  ALL_SITUATION_TAGS,
  classifyEmploymentFreeText,
  classifyEmploymentQuickReply,
  classifyEmploymentReply,
  EMPLOYMENT_QUICK_REPLY,
  SITUATION_EMPLOYMENT_STATUS,
  SITUATION_FUNNEL_TAG,
  SITUATION_TAG,
} from "@/server/services/EmploymentReplyClassifier";
import { buildInboundEventContext } from "@/server/services/AutomationRuleEngine";

describe("quick-reply classification", () => {
  it("maps the three stable payload ids", () => {
    expect(
      classifyEmploymentQuickReply({ buttonId: EMPLOYMENT_QUICK_REPLY.EMPLOYED }),
    ).toBe("employed");
    expect(
      classifyEmploymentQuickReply({ buttonId: EMPLOYMENT_QUICK_REPLY.JOB_SEEKING }),
    ).toBe("job_seeking");
    expect(
      classifyEmploymentQuickReply({ buttonId: EMPLOYMENT_QUICK_REPLY.OTHER }),
    ).toBe("other");
  });

  it("falls back to a tolerant title match", () => {
    expect(classifyEmploymentQuickReply({ buttonTitle: "Beschäftigt" })).toBe(
      "employed",
    );
    expect(classifyEmploymentQuickReply({ buttonTitle: "Arbeitssuchend" })).toBe(
      "job_seeking",
    );
    expect(
      classifyEmploymentQuickReply({ buttonTitle: "Sonstige Situation" }),
    ).toBe("other");
  });

  it("returns null for a non-situation button", () => {
    expect(classifyEmploymentQuickReply({ buttonTitle: "Hallo" })).toBeNull();
  });
});

describe("free-text classification", () => {
  it("recognises employed phrasing", () => {
    for (const s of ["bin beschäftigt", "fest angestellt", "noch im Job", "ich arbeite bei der DB"]) {
      expect(classifyEmploymentFreeText(s)).toBe("employed");
    }
  });

  it("recognises job-seeking phrasing (even with umlaut folding)", () => {
    for (const s of ["arbeitssuchend", "arbeitslos", "ich suche Arbeit", "bin auf Jobsuche"]) {
      expect(classifyEmploymentFreeText(s)).toBe("job_seeking");
    }
  });

  it("does not let 'arbeite' shadow 'arbeitssuchend'", () => {
    expect(classifyEmploymentFreeText("arbeitssuchend")).toBe("job_seeking");
  });

  it("returns null when nothing matches", () => {
    expect(classifyEmploymentFreeText("weiß nicht")).toBeNull();
    expect(classifyEmploymentFreeText("")).toBeNull();
  });
});

describe("full classification (three answer paths)", () => {
  it("quick-reply wins over free text", () => {
    const c = classifyEmploymentReply({
      buttonId: EMPLOYMENT_QUICK_REPLY.EMPLOYED,
      body: "arbeitssuchend",
    });
    expect(c.situation).toBe("employed");
    expect(c.source).toBe("quick_reply");
  });

  it("uses free text when there is no button", () => {
    const c = classifyEmploymentReply({ body: "ich bin arbeitssuchend" });
    expect(c.situation).toBe("job_seeking");
    expect(c.source).toBe("freetext");
  });

  it("falls back to 'other' for an ambiguous reply", () => {
    const c = classifyEmploymentReply({ body: "hmm keine ahnung" });
    expect(c.situation).toBe("other");
    expect(c.source).toBe("fallback");
  });
});

describe("mapping tables are consistent", () => {
  it("has a tag, funnel tag and employmentStatus per situation", () => {
    for (const s of ["employed", "job_seeking", "other"] as const) {
      expect(SITUATION_TAG[s]).toBeTruthy();
      expect(SITUATION_FUNNEL_TAG[s]).toBeTruthy();
      expect(SITUATION_EMPLOYMENT_STATUS[s]).toBeTruthy();
    }
    expect(ALL_SITUATION_TAGS).toHaveLength(3);
  });

  it("funnel phase is 'geklärt' for employed/job_seeking and 'klärung' for other", () => {
    expect(SITUATION_FUNNEL_TAG.employed).toBe("funnel_status_geklaert");
    expect(SITUATION_FUNNEL_TAG.job_seeking).toBe("funnel_status_geklaert");
    expect(SITUATION_FUNNEL_TAG.other).toBe("funnel_klaerung_erforderlich");
  });
});

describe("inbound event context (drives the new builder conditions)", () => {
  it("captures quick-reply + detected situation for a button reply", () => {
    const ctx = buildInboundEventContext({
      buttonId: EMPLOYMENT_QUICK_REPLY.JOB_SEEKING,
      body: "",
    });
    expect(ctx.replyReceived).toBe(true);
    expect(ctx.quickReplySituation).toBe("job_seeking");
    expect(ctx.detectedSituation).toBe("job_seeking");
  });

  it("has no quick-reply but a detected situation for free text", () => {
    const ctx = buildInboundEventContext({ body: "bin fest angestellt" });
    expect(ctx.quickReplySituation).toBeNull();
    expect(ctx.detectedSituation).toBe("employed");
  });

  it("detects 'other' for an unrecognised free-text reply", () => {
    const ctx = buildInboundEventContext({ body: "???" });
    expect(ctx.quickReplySituation).toBeNull();
    expect(ctx.detectedSituation).toBe("other");
  });
});
