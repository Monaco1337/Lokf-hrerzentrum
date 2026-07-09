/**
 * LeadImportService — Alt-Lead Excel/CSV import.
 *
 * Two phases:
 *   preview()  — parse + validate + dedup, NO writes (drives the overview UI).
 *   commit()   — same analysis, then create the Alt-Leads + batch + row audit.
 *
 * Imported leads are created with the reactivation defaults and are NEVER run
 * through new-lead automation (onLeadCreated is skipped). No message is sent at
 * import time — sending only starts after a manual campaign release.
 */
import {
  isValidE164,
  normalizePhoneForWhatsApp,
} from "@/features/fairtrain-funnel/automation/PhoneNormalizer";
import { REACTIVATION_CAMPAIGN_KEY } from "@/features/fairtrain-funnel/campaign/types";
import {
  EmploymentStatus,
  FunnelPath,
  LeadPriority,
  LeadStatus,
  PreferredLocation,
} from "@/features/fairtrain-funnel/types";

import {
  campaignRepository,
  type ImportRowInput,
} from "../repositories/CampaignRepository";
import { leadRepository } from "../repositories/LeadRepository";
import {
  type ImportColumnKey,
  parseLeadImport,
  type ParsedImportRow,
} from "./import/leadImportParser";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Placeholder / junk numbers (e.g. "+4900000000000", "+491111111111") pass a
 * naive E.164 check but are not reachable and — worse — their repeated tail
 * digits collide in tail-based dedup, wrongly dropping unrelated leads. Treat
 * any number with a run of 8+ identical digits as no WhatsApp contact so the
 * lead still imports via e-mail without polluting the dedup index.
 */
function isPlaceholderPhone(digits: string): boolean {
  return /(\d)\1{7,}/.test(digits);
}

export type ImportRowStatus = "imported" | "duplicate" | "invalid";

export interface AnalyzedRow {
  rowIndex: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  phoneNormalized: string | null;
  emailNormalized: string | null;
  status: ImportRowStatus;
  errorReason: string | null;
  hasWhatsapp: boolean;
  hasEmail: boolean;
  raw: Record<string, string>;
}

export interface ImportAnalysis {
  headers: string[];
  mapping: Partial<Record<ImportColumnKey, string>>;
  counters: {
    totalRows: number;
    imported: number;
    duplicates: number;
    invalid: number;
    alreadyContacted: number;
    whatsappAvailable: number;
    emailAvailable: number;
  };
  rows: AnalyzedRow[];
}

export interface ImportCommitResult {
  batchId: string;
  counters: ImportAnalysis["counters"];
}

function classify(
  row: ParsedImportRow,
  baseKeys: { phoneTails: Set<string>; emails: Set<string> },
  fileTails: Set<string>,
  fileEmails: Set<string>,
): AnalyzedRow {
  const firstName = row.firstName.trim();
  const lastName = row.lastName.trim();
  const emailRaw = row.email.trim().toLowerCase();
  const emailValid = EMAIL_RE.test(emailRaw);
  const emailNormalized = emailValid ? emailRaw : null;

  const phoneNorm = row.phone ? normalizePhoneForWhatsApp(row.phone) : "";
  const phoneDigits = phoneNorm.replace(/\D/g, "");
  const phoneValid =
    phoneNorm !== "" &&
    isValidE164(phoneNorm) &&
    !isPlaceholderPhone(phoneDigits);
  const phoneNormalized = phoneValid ? phoneNorm : null;
  const phoneTail = phoneValid ? phoneDigits.slice(-8) : null;

  const base = {
    rowIndex: row.rowIndex,
    firstName,
    lastName,
    email: emailRaw,
    phone: phoneNorm,
    city: row.city.trim(),
    phoneNormalized,
    emailNormalized,
    hasWhatsapp: phoneValid,
    hasEmail: emailValid,
    raw: row.raw,
  };

  // Invalid: no usable name, or no usable contact channel at all.
  if (!firstName && !lastName) {
    return { ...base, status: "invalid", errorReason: "Kein Name" };
  }
  if (!phoneValid && !emailValid) {
    return {
      ...base,
      status: "invalid",
      errorReason: "Keine gültige Telefonnummer oder E-Mail",
    };
  }

  // Duplicate against the existing base (already in our system).
  const inBaseByPhone = phoneTail !== null && baseKeys.phoneTails.has(phoneTail);
  const inBaseByEmail =
    emailNormalized !== null && baseKeys.emails.has(emailNormalized);
  if (inBaseByPhone || inBaseByEmail) {
    return {
      ...base,
      status: "duplicate",
      errorReason: "Bereits im System vorhanden",
    };
  }

  // Duplicate within the uploaded file.
  const inFileByPhone = phoneTail !== null && fileTails.has(phoneTail);
  const inFileByEmail =
    emailNormalized !== null && fileEmails.has(emailNormalized);
  if (inFileByPhone || inFileByEmail) {
    return {
      ...base,
      status: "duplicate",
      errorReason: "Dublette in der Datei",
    };
  }

  if (phoneTail) fileTails.add(phoneTail);
  if (emailNormalized) fileEmails.add(emailNormalized);
  return { ...base, status: "imported", errorReason: null };
}

export class LeadImportService {
  async analyze(
    buffer: Buffer,
    overrideMapping?: Partial<Record<ImportColumnKey, string>>,
  ): Promise<ImportAnalysis> {
    const parsed = parseLeadImport(buffer, overrideMapping);
    const baseKeys = await leadRepository.allContactKeys();
    const fileTails = new Set<string>();
    const fileEmails = new Set<string>();

    const rows = parsed.rows
      // drop fully-empty trailing rows
      .filter(
        (r) => r.firstName || r.lastName || r.email || r.phone || r.city,
      )
      .map((r) => classify(r, baseKeys, fileTails, fileEmails));

    const counters = {
      totalRows: rows.length,
      imported: rows.filter((r) => r.status === "imported").length,
      duplicates: rows.filter(
        (r) =>
          r.status === "duplicate" &&
          r.errorReason === "Dublette in der Datei",
      ).length,
      invalid: rows.filter((r) => r.status === "invalid").length,
      alreadyContacted: rows.filter(
        (r) =>
          r.status === "duplicate" &&
          r.errorReason === "Bereits im System vorhanden",
      ).length,
      whatsappAvailable: rows.filter(
        (r) => r.status === "imported" && r.hasWhatsapp,
      ).length,
      emailAvailable: rows.filter((r) => r.status === "imported" && r.hasEmail)
        .length,
    };

    return { headers: parsed.headers, mapping: parsed.mapping, counters, rows };
  }

  async preview(
    buffer: Buffer,
    overrideMapping?: Partial<Record<ImportColumnKey, string>>,
  ): Promise<ImportAnalysis> {
    return this.analyze(buffer, overrideMapping);
  }

  /**
   * Create the Alt-Leads for every "imported" row, plus the batch + per-row
   * audit. Leads are created with reactivation defaults and are NOT enqueued —
   * sending requires a separate manual release.
   */
  async commit(
    buffer: Buffer,
    filename: string,
    actorId: string,
    overrideMapping?: Partial<Record<ImportColumnKey, string>>,
  ): Promise<ImportCommitResult> {
    const analysis = await this.analyze(buffer, overrideMapping);

    const batchId = await campaignRepository.createBatch({
      filename,
      campaign: REACTIVATION_CAMPAIGN_KEY,
      createdById: actorId,
      ...analysis.counters,
    });

    const rowInputs: ImportRowInput[] = [];
    for (const row of analysis.rows) {
      if (row.status !== "imported") {
        rowInputs.push({
          rowIndex: row.rowIndex,
          rawJson: JSON.stringify(row.raw),
          status: row.status,
          errorReason: row.errorReason,
          phoneNormalized: row.phoneNormalized,
          emailNormalized: row.emailNormalized,
        });
        continue;
      }

      const lead = await leadRepository.create({
        firstName: row.firstName || "—",
        lastName: row.lastName || "—",
        email: row.emailNormalized ?? "",
        phone: row.phoneNormalized ?? "",
        city: row.city || null,
        // Neutral pipeline defaults — Alt-Leads are not scored on import.
        funnelPath: FunnelPath.EMPLOYED,
        employmentStatus: EmploymentStatus.EMPLOYED_FULL,
        preferredLocation: PreferredLocation.UNDECIDED,
        acceptsShiftWork: false,
        motivationText: null,
        score: 0,
        priority: LeadPriority.COLD,
        status: LeadStatus.NEW,
        source: REACTIVATION_CAMPAIGN_KEY,
        utm: null,
        assignedTo: null,
        // Reactivation defaults (Spec).
        leadType: "alt_lead",
        campaign: REACTIVATION_CAMPAIGN_KEY,
        campaignStatus: "alt_lead_importiert",
        employmentSnapshot: "arbeitslos_nein",
        communicationStarted: false,
        firstContactSentAt: null,
        automationPaused: true,
        campaignCompleted: false,
      });

      rowInputs.push({
        rowIndex: row.rowIndex,
        rawJson: JSON.stringify(row.raw),
        status: "imported",
        leadId: lead.id,
        phoneNormalized: row.phoneNormalized,
        emailNormalized: row.emailNormalized,
      });
    }

    await campaignRepository.addRows(batchId, rowInputs);

    return { batchId, counters: analysis.counters };
  }
}

export const leadImportService = new LeadImportService();
