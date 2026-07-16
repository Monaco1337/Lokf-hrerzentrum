import { describe, expect, it } from "vitest";

import { analyzeReply } from "@/server/services/ReplyIntentClassifier";
import { EMPLOYMENT_QUICK_REPLY } from "@/server/services/EmploymentReplyClassifier";
import { intentToPath, pathForAnalysis } from "@/server/services/workflow/pathMapping";
import { ROUTER_PATHS } from "@/features/fairtrain-funnel/automation/workflow/graph";

/**
 * The deterministic fallback (no LLM key) must always resolve a reply to a
 * single router path. Covers quick-reply buttons, emoji, free text and mixed
 * forms — the guarantee that the engine follows exactly one branch, and never a
 * wrong one (uncertain → unclear).
 */
function pathFor(input: { body?: string; buttonId?: string; buttonTitle?: string }): string {
  return pathForAnalysis(analyzeReply(input));
}

describe("workflow reply → router path (deterministic fallback)", () => {
  it("quick-reply button 'Beschäftigt' → employed", () => {
    expect(pathFor({ buttonId: EMPLOYMENT_QUICK_REPLY.EMPLOYED })).toBe("employed");
  });

  it("quick-reply button 'Arbeitssuchend' → job_seeking", () => {
    expect(pathFor({ buttonId: EMPLOYMENT_QUICK_REPLY.JOB_SEEKING })).toBe("job_seeking");
  });

  it("quick-reply button 'Sonstige' → other", () => {
    expect(pathFor({ buttonId: EMPLOYMENT_QUICK_REPLY.OTHER })).toBe("other");
  });

  it("free text 'Ich bin aktuell arbeitslos' → job_seeking", () => {
    expect(pathFor({ body: "Ich bin aktuell arbeitslos" })).toBe("job_seeking");
  });

  it("free text 'Ich bin fest angestellt, aber interessiert' → employed", () => {
    expect(pathFor({ body: "Ich bin fest angestellt, aber interessiert" })).toBe("employed");
  });

  it("free text 'Ich brauche erst mehr Informationen' → more_info", () => {
    expect(pathFor({ body: "Ich brauche erst mehr Informationen" })).toBe("more_info");
  });

  it("callback 'Bitte rufen Sie mich an' → callback", () => {
    expect(pathFor({ body: "Bitte rufen Sie mich an" })).toBe("callback");
  });

  it("consultation 'Ich möchte eine Beratung' → consultation", () => {
    expect(pathFor({ body: "Ich möchte eine Beratung" })).toBe("consultation");
  });

  it("rejection 'Kein Interesse' → no_interest", () => {
    expect(pathFor({ body: "Kein Interesse" })).toBe("no_interest");
  });

  it("opt-out 'STOPP' → stop", () => {
    expect(pathFor({ body: "STOPP" })).toBe("stop");
  });

  it("opt-out 'keine Nachrichten mehr' → stop", () => {
    expect(pathFor({ body: "Bitte keine Nachrichten mehr." })).toBe("stop");
  });

  it("phone emoji '📞' → callback", () => {
    expect(pathFor({ body: "📞" })).toBe("callback");
  });

  it("stop emoji '🛑' → stop", () => {
    expect(pathFor({ body: "🛑" })).toBe("stop");
  });

  it("ambiguous emoji '🙂👍' → unclear (never a wrong branch)", () => {
    const a = analyzeReply({ body: "🙂👍" });
    expect(pathForAnalysis(a)).toBe("unclear");
    expect(a.manualReview).toBe(true);
  });

  it("unrecognised gibberish → unclear (manual review)", () => {
    const a = analyzeReply({ body: "asdf qwer zzz" });
    expect(pathForAnalysis(a)).toBe("unclear");
    expect(a.manualReview).toBe(true);
  });

  it("priority: callback wins over kein Interesse in one message", () => {
    expect(pathFor({ body: "Eigentlich kein Interesse, aber rufen Sie mich an" })).toBe("callback");
  });

  it("priority: STOPP wins over everything", () => {
    expect(pathFor({ body: "Kein Interesse, keine weiteren Nachrichten bitte" })).toBe("stop");
  });

  it("intentToPath maps every intent to a valid router path", () => {
    const intents = [
      "stop",
      "no_interest",
      "callback",
      "consultation",
      "question",
      "employed",
      "job_seeking",
      "job_insecure",
      "career_change",
      "general_interest",
      "other",
    ] as const;
    const valid = new Set(ROUTER_PATHS);
    for (const i of intents) expect(valid.has(intentToPath(i))).toBe(true);
  });
});
