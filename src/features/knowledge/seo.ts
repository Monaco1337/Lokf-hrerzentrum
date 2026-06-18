/**
 * Structured-data (JSON-LD / schema.org) builders for the knowledge platform.
 *
 * Pure functions returning plain JSON-LD objects. They are rendered via the
 * <JsonLd> component. Keeping them here (not inline in pages) guarantees a
 * consistent @context, stable @id linking and reuse across routes — the basis
 * for entity dominance and AI retrieval.
 */
import { absoluteUrl, getSiteUrl, SITE_NAME } from "@/lib/site";

import type { Crumb, GuideStep, QA } from "./types";

/** A JSON-LD value tree without resorting to `any`. */
export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type JsonLdNode = { [key: string]: JsonLdValue };

const ORG_ID = `${getSiteUrl()}/#organization`;
const WEBSITE_ID = `${getSiteUrl()}/#website`;

/** Organization node — the central brand entity everything links back to. */
export function organizationSchema(): JsonLdNode {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: site,
    logo: `${site}/brand/logo-full.png`,
    description:
      "Plattform für die geförderte Weiterbildung und Umschulung zum Lokführer (Triebfahrzeugführer) sowie Wissen, Daten und Karriere rund um die deutsche Bahnbranche.",
    areaServed: "DE",
    knowsAbout: [
      "Lokführer",
      "Triebfahrzeugführer",
      "Umschulung Lokführer",
      "Bildungsgutschein",
      "Quereinstieg Bahn",
      "Eisenbahnberufe",
    ],
    sameAs: [],
  };
}

/** WebSite node enabling sitelinks/search affordance. */
export function webSiteSchema(): JsonLdNode {
  const site = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: site,
    inLanguage: "de-DE",
    publisher: { "@id": ORG_ID },
  };
}

/** BreadcrumbList from an ordered list of crumbs. */
export function breadcrumbSchema(crumbs: Crumb[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

interface ArticleArgs {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
}

/** Article node for guides/pillars, linked to the publishing org. */
export function articleSchema(args: ArticleArgs): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: args.headline,
    description: args.description,
    inLanguage: "de-DE",
    mainEntityOfPage: absoluteUrl(args.path),
    datePublished: args.datePublished,
    dateModified: args.dateModified,
    author: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
    isPartOf: { "@id": WEBSITE_ID },
  };
}

/** FAQPage node from question/answer pairs. */
export function faqSchema(items: QA[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((qa) => ({
      "@type": "Question",
      name: qa.question,
      acceptedAnswer: { "@type": "Answer", text: qa.answer },
    })),
  };
}

interface OccupationArgs {
  name: string;
  description: string;
  /** Monthly gross median in EUR. */
  salaryMedian: number;
  salaryMin: number;
  salaryMax: number;
}

/** Occupation node for the profession entity (rich career data). */
export function occupationSchema(args: OccupationArgs): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "Occupation",
    name: args.name,
    description: args.description,
    occupationLocation: { "@type": "Country", name: "Deutschland" },
    estimatedSalary: {
      "@type": "MonetaryAmountDistribution",
      name: "Monatsbrutto",
      currency: "EUR",
      duration: "P1M",
      median: args.salaryMedian,
      percentile10: args.salaryMin,
      percentile90: args.salaryMax,
    },
  };
}

interface DatasetArgs {
  name: string;
  description: string;
  path: string;
  dateModified: string;
}

/** Dataset node for the salary atlas (citable data asset). */
export function datasetSchema(args: DatasetArgs): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: args.name,
    description: args.description,
    url: absoluteUrl(args.path),
    inLanguage: "de-DE",
    dateModified: args.dateModified,
    isAccessibleForFree: true,
    creator: { "@id": ORG_ID },
    publisher: { "@id": ORG_ID },
  };
}

interface HowToArgs {
  name: string;
  description: string;
  steps: GuideStep[];
}

/** HowTo node for procedural guides (e.g. Bildungsgutschein beantragen). */
export function howToSchema(args: HowToArgs): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: args.name,
    description: args.description,
    inLanguage: "de-DE",
    step: args.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.title,
      text: s.body,
    })),
  };
}

interface EmployerOrgArgs {
  name: string;
  description: string;
  /** e.g. "Deutschland" or a region label. */
  areaServed: string;
}

/**
 * Organization node describing an *employer* entity (a separate company, not the
 * publishing org). Used on employer hub pages so the company is a first-class
 * entity in the graph.
 */
export function employerOrganizationSchema(args: EmployerOrgArgs): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: args.name,
    description: args.description,
    areaServed: args.areaServed,
    industry: "Eisenbahnverkehr",
  };
}

interface DefinedTermArgs {
  name: string;
  description: string;
  path: string;
  sameAs?: string[];
}

/** DefinedTerm node for glossary entries, tied to a DefinedTermSet. */
export function definedTermSchema(args: DefinedTermArgs): JsonLdNode {
  const node: JsonLdNode = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: args.name,
    description: args.description,
    url: absoluteUrl(args.path),
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: "Bahn- & Lokführer-Glossar",
      url: absoluteUrl("/glossar"),
    },
  };
  if (args.sameAs && args.sameAs.length > 0) node.sameAs = args.sameAs;
  return node;
}
