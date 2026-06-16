/**
 * Pure document readiness calculation.
 *
 * Separated from DocumentService so it can be tested without DB/Prisma.
 */
import {
  DocumentStatus,
  DocumentType,
  type LeadDetail,
  type SensitiveAnswersData,
} from "../types";

import {
  DOCUMENT_TEMPLATES,
  NON_BUNDLE_TYPES,
  getTemplate,
} from "./documentTypes";

export type Readiness = Record<DocumentType, DocumentStatus>;

function isNonEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

export function computeReadiness(
  lead: LeadDetail,
  sensitive: SensitiveAnswersData | null,
): Readiness {
  const result: Partial<Readiness> = {};

  for (const template of DOCUMENT_TEMPLATES) {
    if (template.type === DocumentType.MASTER_BUNDLE) continue;

    if (template.isApplicable && !template.isApplicable(lead, sensitive)) {
      result[template.type] = DocumentStatus.MISSING_DATA;
      continue;
    }

    const missing = template.requiredLeadFields.filter(
      (field) => !isNonEmpty(lead[field]),
    );
    result[template.type] =
      missing.length === 0
        ? DocumentStatus.READY_TO_GENERATE
        : DocumentStatus.MISSING_DATA;
  }

  const applicableNonBundle = NON_BUNDLE_TYPES.filter((type) => {
    const tpl = getTemplate(type);
    if (!tpl) return false;
    return tpl.isApplicable ? tpl.isApplicable(lead, sensitive) : true;
  });

  const allReady = applicableNonBundle.every(
    (type) => result[type] === DocumentStatus.READY_TO_GENERATE,
  );
  result[DocumentType.MASTER_BUNDLE] = allReady
    ? DocumentStatus.READY_TO_GENERATE
    : DocumentStatus.MISSING_DATA;

  return result as Readiness;
}
