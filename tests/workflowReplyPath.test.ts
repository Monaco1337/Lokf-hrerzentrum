import { describe, expect, it } from "vitest";

import { analyzeReply } from "@/server/services/ReplyIntentClassifier";
import { EMPLOYMENT_QUICK_REPLY } from "@/server/services/EmploymentReplyClassifier";
import { intentToPath } from "@/server/services/workflow/pathMapping";

/**
 * The deterministic fallback (no LLM key) must always resolve a reply to a
 * single router path. This covers quick-reply, free text and mixed forms — the
 * guarantee that the engine follows exactly one branch.
 */
function pathFor(input: { body?: string; buttonId?: string }): string {
  return intentToPath(analyzeReply(input).intent);
}

describe("workflow reply → router path (deterministic fallback)", () => {
  it("quick-reply button 'Beschäftigt' → employed", () => {
    expect(pathFor({ buttonId: EMPLOYMENT_QUICK_REPLY.EMPLOYED })).toBe("employed");
  });

  it("free text 'Ich suche momentan Arbeit.' → job_seeking", () => {
    expect(pathFor({ body: "Ich suche momentan Arbeit." })).toBe("job_seeking");
  });

  it("mixed 'Ich bin fest angestellt, möchte mich aber verändern.' → employed", () => {
    expect(pathFor({ body: "Ich bin fest angestellt, möchte mich aber verändern." })).toBe("employed");
  });

  it("callback request 'Bitte rufen Sie mich an.' → callback", () => {
    expect(pathFor({ body: "Bitte rufen Sie mich an." })).toBe("callback");
  });

  it("rejection 'Momentan passt es leider nicht.' → no_interest", () => {
    expect(pathFor({ body: "Momentan passt es leider nicht." })).toBe("no_interest");
  });

  it("opt-out 'Ich möchte keine weiteren Nachrichten.' → no_interest", () => {
    expect(pathFor({ body: "Ich möchte keine weiteren Nachrichten." })).toBe("no_interest");
  });

  it("question 'Was kostet das?' → more_info", () => {
    expect(pathFor({ body: "Was kostet das?" })).toBe("more_info");
  });

  it("unrecognised gibberish → other (manual review, never a wrong branch)", () => {
    const a = analyzeReply({ body: "asdf qwer zzz" });
    expect(intentToPath(a.intent)).toBe("other");
    expect(a.manualReview).toBe(true);
  });

  it("intentToPath maps every intent to a valid path", () => {
    const intents = [
      "stop",
      "no_interest",
      "callback",
      "question",
      "employed",
      "job_seeking",
      "job_insecure",
      "career_change",
      "general_interest",
      "other",
    ] as const;
    const valid = new Set(["job_seeking", "employed", "more_info", "callback", "no_interest", "other"]);
    for (const i of intents) expect(valid.has(intentToPath(i))).toBe(true);
  });
});
