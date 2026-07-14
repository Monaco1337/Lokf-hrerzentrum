import { describe, expect, it } from "vitest";

import {
  analyzeReply,
  MANUAL_REVIEW_THRESHOLD,
} from "@/server/services/ReplyIntentClassifier";
import { EMPLOYMENT_QUICK_REPLY } from "@/server/services/EmploymentReplyClassifier";

describe("ReplyIntentClassifier — analyzeReply (Antwort analysieren KI)", () => {
  it("quick-reply is authoritative (employed)", () => {
    const a = analyzeReply({ buttonId: EMPLOYMENT_QUICK_REPLY.EMPLOYED });
    expect(a.employment).toBe("employed");
    expect(a.flags.employed).toBe(true);
    expect(a.interest).toBe("yes");
    expect(a.source).toBe("quick_reply");
    expect(a.confidence).toBe(1);
    expect(a.manualReview).toBe(false);
  });

  it("'Ich bin aktuell beschäftigt, habe aber Interesse.' → Interesse=Ja, Beschäftigt", () => {
    const a = analyzeReply({ body: "Ich bin aktuell beschäftigt, habe aber Interesse." });
    expect(a.interest).toBe("yes");
    expect(a.flags.employed).toBe(true);
    expect(a.flags.interest).toBe(true);
  });

  it("'Ich suche momentan Arbeit.' → Interesse=Ja, Arbeitssuchend", () => {
    const a = analyzeReply({ body: "Ich suche momentan Arbeit." });
    expect(a.interest).toBe("yes");
    expect(a.flags.jobSeeking).toBe(true);
    expect(a.employment).toBe("job_seeking");
  });

  it("'Ich bin fest angestellt, möchte mich aber verändern.' → Beschäftigt + Veränderung", () => {
    const a = analyzeReply({ body: "Ich bin fest angestellt, möchte mich aber verändern." });
    expect(a.interest).toBe("yes");
    expect(a.flags.careerChange).toBe(true);
    // still recognised as employed (spec: Situation = Beschäftigt).
    expect(a.flags.employed).toBe(true);
  });

  it("'Ich möchte keine weiteren Nachrichten.' → Opt-out / STOPP", () => {
    const a = analyzeReply({ body: "Ich möchte keine weiteren Nachrichten." });
    expect(a.intent).toBe("stop");
    expect(a.flags.stop).toBe(true);
    expect(a.interest).toBe("no");
  });

  it("'Bitte rufen Sie mich an.' → Rückruf gewünscht", () => {
    const a = analyzeReply({ body: "Bitte rufen Sie mich an." });
    expect(a.intent).toBe("callback");
    expect(a.flags.callback).toBe(true);
  });

  it("'Momentan passt es leider nicht.' → Kein Interesse", () => {
    const a = analyzeReply({ body: "Momentan passt es leider nicht." });
    expect(a.intent).toBe("no_interest");
    expect(a.flags.noInterest).toBe(true);
    expect(a.interest).toBe("no");
  });

  it("detects an insecure job situation", () => {
    const a = analyzeReply({ body: "Mein Arbeitsplatz ist unsicher, die Firma macht Kurzarbeit." });
    expect(a.flags.jobInsecure).toBe(true);
    expect(a.interest).toBe("yes");
  });

  it("detects a question", () => {
    const a = analyzeReply({ body: "Wie viel Gehalt bekomme ich denn?" });
    expect(a.flags.question).toBe(true);
  });

  it("flags ambiguous free text for manual review (no auto-action)", () => {
    const a = analyzeReply({ body: "🙂👍" });
    expect(a.manualReview).toBe(true);
    expect(a.confidence).toBeLessThan(MANUAL_REVIEW_THRESHOLD);
  });

  it("empty reply → manual review", () => {
    const a = analyzeReply({ body: "" });
    expect(a.manualReview).toBe(true);
  });
});
