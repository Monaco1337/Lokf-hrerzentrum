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
  category: "Beruf" | "Technik" | "Qualifikation" | "Förderung" | "Behörde" | "Karriere";
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
