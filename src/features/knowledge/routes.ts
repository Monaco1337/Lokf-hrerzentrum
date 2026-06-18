/**
 * Central registry of the public knowledge/SEO routes.
 *
 * One source of truth so the sitemap, the knowledge header navigation and the
 * internal-linking blocks never drift apart. Adding a page here automatically
 * surfaces it in the sitemap and (where flagged) in the primary knowledge nav.
 */
import { GLOSSARY } from "./content/glossar";

export interface KnowledgeRoute {
  path: string;
  /** Sitemap priority 0–1. */
  priority: number;
  changeFrequency:
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly";
  /** Short label for in-site navigation. */
  navLabel?: string;
  /** Whether the route appears in the primary knowledge nav. */
  inNav?: boolean;
}

/**
 * Static knowledge routes (hubs, pillars, data + funding pages). Glossary
 * detail pages are appended dynamically from the content registry.
 */
export const KNOWLEDGE_ROUTES: ReadonlyArray<KnowledgeRoute> = [
  { path: "/wissen", priority: 0.9, changeFrequency: "weekly", navLabel: "Wissen", inNav: true },
  {
    path: "/lokfuehrer-werden",
    priority: 0.9,
    changeFrequency: "monthly",
    navLabel: "Lokführer werden",
    inNav: true,
  },
  {
    path: "/gehalt/lokfuehrer",
    priority: 0.8,
    changeFrequency: "monthly",
    navLabel: "Gehalt",
    inNav: true,
  },
  {
    path: "/foerderung/bildungsgutschein",
    priority: 0.8,
    changeFrequency: "monthly",
    navLabel: "Förderung",
    inNav: true,
  },
  {
    path: "/karriere/quereinstieg-lokfuehrer",
    priority: 0.7,
    changeFrequency: "monthly",
  },
  { path: "/glossar", priority: 0.6, changeFrequency: "monthly", navLabel: "Glossar", inNav: true },
];

/** Routes shown in the primary knowledge navigation, in order. */
export const KNOWLEDGE_NAV = KNOWLEDGE_ROUTES.filter((r) => r.inNav);

/** Every indexable knowledge route incl. dynamic glossary detail pages. */
export function allKnowledgeRoutes(): KnowledgeRoute[] {
  const glossaryRoutes: KnowledgeRoute[] = GLOSSARY.map((term) => ({
    path: `/glossar/${term.slug}`,
    priority: 0.5,
    changeFrequency: "yearly" as const,
  }));
  return [...KNOWLEDGE_ROUTES, ...glossaryRoutes];
}
