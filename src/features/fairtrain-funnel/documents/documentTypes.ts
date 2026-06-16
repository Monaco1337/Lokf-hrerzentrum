/**
 * Document templates and required-field metadata.
 *
 * The PDF engine is intentionally NOT wired up in the MVP. Each template
 * declares which Lead fields it needs; `DocumentService.computeReadiness`
 * uses this to derive MISSING_DATA vs READY_TO_GENERATE deterministically.
 *
 * A later implementation of `generate()` only swaps the renderer - the
 * interface and storage model stay stable.
 */
import {
  DocumentType,
  type LeadDetail,
  type PreferredLocation,
  type SensitiveAnswersData,
} from "../types";

type LeadFieldKey = keyof LeadDetail;

export interface DocumentTemplate {
  type: DocumentType;
  title: string;
  description: string;
  /** Lead fields that must be non-null/non-empty for readiness. */
  requiredLeadFields: ReadonlyArray<LeadFieldKey>;
  /** Optional gating predicate (e.g. only Saalfeld leads need housing info). */
  isApplicable?: (
    lead: LeadDetail,
    sensitive: SensitiveAnswersData | null,
  ) => boolean;
}

export const DOCUMENT_TEMPLATES: ReadonlyArray<DocumentTemplate> = [
  {
    type: DocumentType.CV,
    title: "Lebenslauf",
    description: "Strukturierter Lebenslauf für die Arbeitsagentur und den Bildungsträger.",
    requiredLeadFields: ["firstName", "lastName", "email", "phone"],
  },
  {
    type: DocumentType.AA_REASONING,
    title: "Begründung für die Arbeitsagentur",
    description:
      "Argumentationspapier zur Vorlage bei der Agentur für Arbeit für die Bildungsgutscheinprüfung.",
    requiredLeadFields: ["firstName", "lastName", "employmentStatus", "motivationText"],
  },
  {
    type: DocumentType.AA_GUIDE,
    title: "Gesprächsleitfaden Arbeitsagentur",
    description:
      "Leitfaden mit Argumenten und typischen Fragen für das Vermittlungsgespräch.",
    requiredLeadFields: ["funnelPath", "preferredLocation"],
  },
  {
    type: DocumentType.LOCATION_INFO,
    title: "Standortinformation",
    description: "Detailinformationen zum gewählten Weiterbildungsstandort.",
    requiredLeadFields: ["preferredLocation"],
  },
  {
    type: DocumentType.HOUSING_SAALFELD,
    title: "Unterbringungsinformation Saalfeld",
    description: "Informationen zur kostenfreien Einzimmer-Unterbringung in Saalfeld.",
    requiredLeadFields: ["preferredLocation"],
    isApplicable: (lead) => {
      const loc: PreferredLocation = lead.preferredLocation;
      return loc === "SAALFELD" || loc === "UNDECIDED";
    },
  },
  {
    type: DocumentType.WEITERBILDUNG_INFO,
    title: "Weiterbildungs-Infopaket",
    description:
      "Übersicht über Inhalte, Ablauf und Abschluss der 15-monatigen Lokführer-Weiterbildung.",
    requiredLeadFields: ["funnelPath"],
  },
  {
    type: DocumentType.MASTER_BUNDLE,
    title: "Master-Dokument (Gesamtbundle)",
    description:
      "Aggregiertes PDF-Bundle mit allen anwendbaren Einzeldokumenten.",
    // Master bundle requires all non-bundle templates to be ready - checked
    // by DocumentService.computeReadiness as an aggregate, not by these fields.
    requiredLeadFields: [],
  },
];

export const NON_BUNDLE_TYPES: ReadonlyArray<DocumentType> = DOCUMENT_TEMPLATES
  .filter((t) => t.type !== DocumentType.MASTER_BUNDLE)
  .map((t) => t.type);

export function getTemplate(type: DocumentType): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES.find((t) => t.type === type);
}
