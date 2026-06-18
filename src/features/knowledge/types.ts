/**
 * Shared content types for the knowledge platform. Pure data shapes — no React,
 * no server imports — so they can be consumed by content modules, SEO builders
 * and UI components alike.
 */

/** A single glossary / encyclopedia entity. */
export interface GlossaryTerm {
  slug: string;
  /** Canonical display name. */
  term: string;
  /** Abbreviation, if the term is commonly abbreviated (e.g. "PZB"). */
  abbr?: string;
  /** Coarse category for grouping in the index. */
  category:
    | "Beruf"
    | "Technik"
    | "Qualifikation"
    | "Förderung"
    | "Behörde"
    | "Karriere"
    | "Vorschrift"
    | "Signal"
    | "Fahrzeug"
    | "Betrieb"
    | "Bremse"
    | "Infrastruktur"
    | "Arbeitgeber";
  /** One- to two-sentence answer-first definition (snippet/LLM friendly). */
  short: string;
  /** Full body, one string per paragraph. */
  body: string[];
  /** Search/alias variants. */
  synonyms?: string[];
  /** Authoritative external references for entity linking (Wikipedia/GND). */
  sameAs?: string[];
  /** Related glossary slugs for internal linking. */
  related?: string[];
}

/** A breadcrumb node. */
export interface Crumb {
  name: string;
  path: string;
}

/** A compact key-fact shown in article hero rails. */
export interface KeyFact {
  label: string;
  value: string;
  hint?: string;
}

/** A frequently asked question with answer. */
export interface QA {
  question: string;
  answer: string;
}

/** A step inside a HowTo-style guide. */
export interface GuideStep {
  title: string;
  body: string;
}

/** An internal link card. */
export interface RelatedLink {
  title: string;
  description: string;
  href: string;
}

/** A single segment of the salary dataset. */
export interface SalarySegment {
  segment: string;
  /** Verkehrsart / context label. */
  context: string;
  /** Monthly gross, low end (EUR). */
  min: number;
  /** Monthly gross, median (EUR). */
  median: number;
  /** Monthly gross, high end incl. typical allowances (EUR). */
  max: number;
}

/** A federal state (Bundesland) hub entity. */
export interface RegionData {
  slug: string;
  name: string;
  /** KFZ / short tag, e.g. "NRW". */
  kfz?: string;
  capital?: string;
  intro: string[];
  /** Regional labour-market characterisation (unique per state). */
  arbeitsmarkt: string[];
  /** Regional specifics (network, hubs, particularities). */
  besonderheiten: string[];
  /** Funding notes specific to the state / its agencies. */
  foerderung: string[];
  /** Short qualitative salary tendency for the region. */
  salaryNote: string;
  /** Employers operating in this state (slugs into EMPLOYERS). */
  employerSlugs: string[];
  /** Cities in this state that have their own page (slugs into CITIES). */
  citySlugs: string[];
  keyFacts: KeyFact[];
  faq: QA[];
}

/** A priority city hub entity. */
export interface CityData {
  slug: string;
  name: string;
  bundeslandSlug: string;
  bundeslandName: string;
  intro: string[];
  lokfuehrerWerden: string[];
  umschulung: string[];
  bildungsgutschein: string[];
  gehalt: string[];
  /** Local employers (slugs into EMPLOYERS). */
  employerSlugs: string[];
  keyFacts: KeyFact[];
  faq: QA[];
}

/** A railway employer hub entity. */
export interface EmployerData {
  slug: string;
  name: string;
  /** Combined classification label, e.g. "DB-Konzern · Nahverkehr". */
  kind: string;
  /** Verkehrsart for the comparison table. */
  verkehrsart: string;
  /** Short coverage label, e.g. "bundesweit" or "Schwerpunkt NRW". */
  coverage: string;
  profile: string[];
  einsatzgebiete: string[];
  standorte: string[];
  gehalt: string[];
  arbeitsbedingungen: string[];
  karrierewege: string[];
  bewerbungsprozess: string[];
  /** States this employer operates in (slugs into REGIONS). */
  regionSlugs: string[];
  keyFacts: KeyFact[];
  faq: QA[];
}
