import { describe, expect, it } from "vitest";

import {
  releaseTierLimit,
  parseCampaignStatus,
  REACTIVATION_CAMPAIGN,
  REACTIVATION_TEMPLATE_SLUGS,
  campaignStepConfig,
} from "@/features/fairtrain-funnel/campaign/types";
import { classifyCampaignReply } from "@/server/services/CampaignInboundService";
import { parseLeadImport } from "@/server/services/import/leadImportParser";

describe("release tiers", () => {
  it("maps tiers to numeric caps", () => {
    expect(releaseTierLimit("test5")).toBe(5);
    expect(releaseTierLimit("10")).toBe(10);
    expect(releaseTierLimit("50")).toBe(50);
    expect(releaseTierLimit("100")).toBe(100);
    expect(releaseTierLimit("all")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("campaign status parsing", () => {
  it("accepts known values and rejects unknown", () => {
    expect(parseCampaignStatus("erstkontakt_versendet")).toBe(
      "erstkontakt_versendet",
    );
    expect(parseCampaignStatus("bogus")).toBeUndefined();
    expect(parseCampaignStatus(null)).toBeUndefined();
  });
});

describe("campaign config", () => {
  it("has 3 steps at day offsets 0/3/7 and 6 template slugs", () => {
    expect(REACTIVATION_CAMPAIGN.steps.map((s) => s.dayOffset)).toEqual([0, 3, 7]);
    expect(REACTIVATION_TEMPLATE_SLUGS).toHaveLength(6);
    expect(campaignStepConfig(2)?.label).toBe("Follow-up 1");
  });
});

describe("quick-reply classification", () => {
  it("classifies 'Ja, Interesse' as hot + task", () => {
    const c = classifyCampaignReply({
      buttonId: "alt_lead_interesse",
      buttonTitle: "Ja, Interesse",
      body: "Ja, Interesse",
      at: new Date(),
    });
    expect(c?.campaignStatus).toBe("interessiert");
    expect(c?.quality).toBe("hot");
    expect(c?.scoreDelta).toBe(30);
    expect(c?.createTask).toBe(true);
  });

  it("classifies 'Mehr Infos' as warm", () => {
    const c = classifyCampaignReply({
      buttonId: "alt_lead_mehr_infos",
      body: "",
      at: new Date(),
    });
    expect(c?.campaignStatus).toBe("informationswunsch");
    expect(c?.quality).toBe("warm");
    expect(c?.scoreDelta).toBe(20);
  });

  it("classifies 'Kein Interesse' as ausgeschlossen (wins over 'interesse' substring)", () => {
    const c = classifyCampaignReply({
      buttonTitle: "Kein Interesse",
      body: "Kein Interesse",
      at: new Date(),
    });
    expect(c?.campaignStatus).toBe("kein_interesse");
    expect(c?.quality).toBe("ausgeschlossen");
  });

  it("returns null for a plain text reply (generic stop only)", () => {
    const c = classifyCampaignReply({
      body: "Hallo, worum geht es genau?",
      at: new Date(),
    });
    expect(c).toBeNull();
  });
});

describe("lead import parser", () => {
  it("auto-detects German headers and maps rows, dropping empty ones", () => {
    const csv = [
      "Vorname;Nachname;E-Mail;Telefon;Ort",
      "Max;Mustermann;max@example.com;0170 1234567;Berlin",
      "Erika;Musterfrau;erika@example.com;+49 171 7654321;Hamburg",
      ";;;;",
    ].join("\n");
    const parsed = parseLeadImport(Buffer.from(csv, "utf8"));
    expect(parsed.mapping.firstName).toBe("Vorname");
    expect(parsed.mapping.phone).toBe("Telefon");
    const nonEmpty = parsed.rows.filter(
      (r) => r.firstName || r.lastName || r.email || r.phone,
    );
    expect(nonEmpty).toHaveLength(2);
    expect(nonEmpty[0]?.firstName).toBe("Max");
    expect(nonEmpty[1]?.city).toBe("Hamburg");
  });

  it("derives the surname when the 'Name' column holds the full name", () => {
    const csv = [
      "Vorname;Name;E-Mail;Telefon",
      "Peter;Peter Thomas;peter@example.com;+491716523911",
      "Sven;Sven;sven@example.com;+491733027877",
      "Georgios;Georgios Samouladas;g@example.com;+4915150958211",
    ].join("\n");
    const parsed = parseLeadImport(Buffer.from(csv, "utf8"));
    expect(parsed.mapping.lastName).toBe("Name");
    expect(parsed.rows[0]?.lastName).toBe("Thomas");
    // "Sven"/"Sven": the surname is unknown, not a repeat of the first name.
    expect(parsed.rows[1]?.lastName).toBe("");
    expect(parsed.rows[2]?.lastName).toBe("Samouladas");
  });
});
