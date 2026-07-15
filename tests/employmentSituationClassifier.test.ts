import { describe, expect, it } from "vitest";

import {
  ALL_SITUATION_TAGS_V2,
  classifyEmploymentSituation,
  SITUATION_CONFIDENCE_THRESHOLD,
  SITUATION_EMPLOYMENT_STATUS_V2,
  SITUATION_FUNNEL_PHASE,
  SITUATION_INTENT,
  SITUATION_QUICK_REPLY,
  SITUATION_TAG_V2,
  type EmploymentSituationCategory,
} from "@/server/services/EmploymentSituationClassifier";
import { FunnelPhase } from "@/features/fairtrain-funnel/funnelPhase";

const ALL: EmploymentSituationCategory[] = [
  "fixed_term_or_termination",
  "short_time_or_business_risk",
  "health_related",
  "stable_employment",
  "other",
];

describe("emoji-only replies", () => {
  it("classifies each colour emoji", () => {
    expect(classifyEmploymentSituation({ body: "🟡" }).category).toBe(
      "fixed_term_or_termination",
    );
    expect(classifyEmploymentSituation({ body: "🔵" }).category).toBe(
      "short_time_or_business_risk",
    );
    expect(classifyEmploymentSituation({ body: "🩺" }).category).toBe(
      "health_related",
    );
    expect(classifyEmploymentSituation({ body: "⚪" }).category).toBe(
      "stable_employment",
    );
    expect(classifyEmploymentSituation({ body: "💬" }).category).toBe("other");
  });

  it("marks emoji-only as source=emoji with high confidence", () => {
    const c = classifyEmploymentSituation({ body: "🟡" });
    expect(c.source).toBe("emoji");
    expect(c.signalDetected).toBe(true);
    expect(c.confidence).toBeGreaterThanOrEqual(0.9);
    expect(c.matchedKeywords).toContain("🟡");
  });
});

describe("text-only replies", () => {
  it("GELB – Befristung / Kündigung", () => {
    for (const s of [
      "gelb",
      "Mein Vertrag ist befristet",
      "Mein Vertrag läuft aus",
      "Mir droht die Kündigung",
    ]) {
      expect(classifyEmploymentSituation({ body: s }).category).toBe(
        "fixed_term_or_termination",
      );
    }
  });

  it("BLAU – Kurzarbeit / Betriebskrise", () => {
    for (const s of [
      "blau",
      "Wir sind in Kurzarbeit",
      "Die Firma hat wirtschaftliche Schwierigkeiten",
      "Insolvenz droht",
    ]) {
      expect(classifyEmploymentSituation({ body: s }).category).toBe(
        "short_time_or_business_risk",
      );
    }
  });

  it("GESUNDHEIT – gesundheitliche Gründe", () => {
    for (const s of [
      "gesundheitlich",
      "Ich habe Rückenprobleme",
      "psychische Belastung",
      "Reha steht an",
      "Rentenversicherung / LTA",
    ]) {
      expect(classifyEmploymentSituation({ body: s }).category).toBe(
        "health_related",
      );
    }
  });

  it("WEISS – Arbeitsplatz sicher", () => {
    for (const s of [
      "weiß",
      "Mein Arbeitsplatz ist sicher",
      "Ich bin unbefristet fest angestellt",
      "Alles stabil, nur interessiert",
    ]) {
      expect(classifyEmploymentSituation({ body: s }).category).toBe(
        "stable_employment",
      );
    }
  });

  it("ANDERE – sonstige Situation", () => {
    for (const s of [
      "Keine der Optionen passt richtig.",
      "Trifft nicht zu",
      "andere Situation",
    ]) {
      const c = classifyEmploymentSituation({ body: s });
      expect(c.category).toBe("other");
      expect(c.manualReview).toBe(true);
    }
  });
});

describe("quick-reply buttons", () => {
  it("maps the stable payload ids", () => {
    for (const cat of ALL) {
      const c = classifyEmploymentSituation({
        buttonId: SITUATION_QUICK_REPLY[cat],
      });
      expect(c.category).toBe(cat);
      expect(c.source).toBe("quick_reply");
    }
  });

  it("falls back to a tolerant colour/label title match", () => {
    expect(
      classifyEmploymentSituation({ buttonTitle: "🟡 Befristet / Kündigung" })
        .category,
    ).toBe("fixed_term_or_termination");
    expect(
      classifyEmploymentSituation({ buttonTitle: "⚪ Arbeitsplatz sicher" })
        .category,
    ).toBe("stable_employment");
  });
});

describe("legacy reactivation buttons defer to the old flow", () => {
  it("does NOT hijack the legacy Beschäftigt / Arbeitssuchend / Sonstige buttons", () => {
    for (const id of [
      "situation_beschaeftigt",
      "situation_arbeitssuchend",
      "situation_sonstige",
    ]) {
      const c = classifyEmploymentSituation({ buttonId: id });
      expect(c.signalDetected).toBe(false);
    }
  });

  it("does NOT hijack the legacy 'Sonstige Situation' even if the title arrives", () => {
    const c = classifyEmploymentSituation({
      buttonId: "situation_sonstige",
      buttonTitle: "Sonstige Situation",
      body: "Sonstige Situation",
    });
    expect(c.signalDetected).toBe(false);
  });

  it("still handles the NEW 💬 ANDERE button (own payload id)", () => {
    const c = classifyEmploymentSituation({ buttonId: "situation_andere" });
    expect(c.signalDetected).toBe(true);
    expect(c.category).toBe("other");
  });
});

describe("mixed emoji + free text (always analyse the whole message)", () => {
  it("🟡 + matching text → GELB with very high confidence", () => {
    const c = classifyEmploymentSituation({
      body: "🟡 Mein Vertrag läuft im Dezember aus.",
    });
    expect(c.category).toBe("fixed_term_or_termination");
    expect(c.source).toBe("freetext");
    expect(c.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it("WEISS + Interesse: sicher, aber möchte sich verändern", () => {
    const c = classifyEmploymentSituation({
      body: "Mein Arbeitsplatz ist sicher, ich möchte mich aber langfristig verändern.",
    });
    expect(c.category).toBe("stable_employment");
    expect(c.interest).toBe(true);
  });
});

describe("conflict resolution by priority", () => {
  it("business risk beats stable employment (fest angestellt + Stellenabbau → BLAU)", () => {
    const c = classifyEmploymentSituation({
      body: "Ich bin fest angestellt, aber meine Firma baut Stellen ab.",
    });
    expect(c.category).toBe("short_time_or_business_risk");
  });

  it("health beats fixed-term (befristet + Rücken → GESUNDHEIT)", () => {
    const c = classifyEmploymentSituation({
      body: "Mein Vertrag ist befristet und ich habe Rückenprobleme.",
    });
    expect(c.category).toBe("health_related");
  });

  it("fixed-term beats short-time when both colour words appear", () => {
    const c = classifyEmploymentSituation({
      body: "befristet und kurzarbeit",
    });
    expect(c.category).toBe("fixed_term_or_termination");
  });
});

describe("opt-out (priority 1) and no-signal fallback", () => {
  it("flags an exact STOP keyword as opt-out", () => {
    expect(classifyEmploymentSituation({ body: "STOPP" }).optOut).toBe(true);
    expect(classifyEmploymentSituation({ body: "Abmelden" }).optOut).toBe(true);
  });

  it("returns signalDetected=false for a reply without any situation signal", () => {
    const c = classifyEmploymentSituation({ body: "Wie viel kostet das?" });
    expect(c.signalDetected).toBe(false);
    expect(c.manualReview).toBe(true);
  });

  it("empty reply → no signal", () => {
    expect(classifyEmploymentSituation({ body: "" }).signalDetected).toBe(false);
  });
});

describe("intent + funnel + tag mapping", () => {
  it("routes precheck / callback / manual_review correctly", () => {
    expect(SITUATION_INTENT.fixed_term_or_termination).toBe("precheck");
    expect(SITUATION_INTENT.short_time_or_business_risk).toBe("precheck");
    expect(SITUATION_INTENT.health_related).toBe("callback");
    expect(SITUATION_INTENT.stable_employment).toBe("callback");
    expect(SITUATION_INTENT.other).toBe("manual_review");
  });

  it("maps every category to a funnel phase, tag and employment status", () => {
    expect(SITUATION_FUNNEL_PHASE.fixed_term_or_termination).toBe(
      FunnelPhase.WAITING_PRECHECK,
    );
    expect(SITUATION_FUNNEL_PHASE.health_related).toBe(
      FunnelPhase.CALLBACK_REQUIRED,
    );
    expect(SITUATION_FUNNEL_PHASE.stable_employment).toBe(
      FunnelPhase.CONSULTATION_REQUIRED,
    );
    expect(SITUATION_FUNNEL_PHASE.other).toBe(FunnelPhase.MANUAL_CLARIFICATION);
    for (const cat of ALL) {
      expect(SITUATION_TAG_V2[cat]).toBeTruthy();
      expect(SITUATION_EMPLOYMENT_STATUS_V2[cat]).toBeTruthy();
    }
    expect(ALL_SITUATION_TAGS_V2).toHaveLength(5);
  });

  it("confidence below the threshold forces manual review", () => {
    const c = classifyEmploymentSituation({ body: "Wie viel kostet das?" });
    expect(c.confidence).toBeLessThan(SITUATION_CONFIDENCE_THRESHOLD);
    expect(c.manualReview).toBe(true);
  });
});
