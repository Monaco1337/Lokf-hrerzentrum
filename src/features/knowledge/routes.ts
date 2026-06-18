/**
 * Central registry of the public knowledge/SEO routes.
 *
 * One source of truth so the sitemap, the knowledge header navigation and the
 * internal-linking blocks never drift apart. Static hubs/pillars are listed
 * explicitly; the dynamic detail pages (regions, cities, employers, glossary)
 * are appended from the content registries.
 */
import { EMPLOYERS } from "./content/arbeitgeber";
import { REGIONS } from "./content/bundeslaender";
import { GLOSSARY } from "./content/glossar";
import { CITIES } from "./content/staedte";

export interface KnowledgeRoute {
  path: string;
  /** Sitemap priority 0–1. */
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  /** Short label for in-site navigation. */
  navLabel?: string;
  /** Whether the route appears in the primary knowledge nav. */
  inNav?: boolean;
}

/** Static knowledge routes (hubs, pillars, indexes, data/funding/trust pages). */
export const KNOWLEDGE_ROUTES: ReadonlyArray<KnowledgeRoute> = [
  { path: "/wissen", priority: 0.9, changeFrequency: "weekly", navLabel: "Wissen", inNav: true },
  {
    path: "/lokfuehrer-werden",
    priority: 0.9,
    changeFrequency: "monthly",
    navLabel: "Lokführer werden",
    inNav: true,
  },
  { path: "/gehalt/lokfuehrer", priority: 0.8, changeFrequency: "monthly", navLabel: "Gehalt", inNav: true },
  {
    path: "/foerderung/bildungsgutschein",
    priority: 0.8,
    changeFrequency: "monthly",
    navLabel: "Förderung",
    inNav: true,
  },
  { path: "/karriere/quereinstieg-lokfuehrer", priority: 0.7, changeFrequency: "monthly" },
  { path: "/regionen", priority: 0.8, changeFrequency: "monthly", navLabel: "Regionen", inNav: true },
  { path: "/staedte", priority: 0.7, changeFrequency: "monthly" },
  { path: "/arbeitgeber", priority: 0.8, changeFrequency: "monthly", navLabel: "Arbeitgeber", inNav: true },
  { path: "/glossar", priority: 0.6, changeFrequency: "monthly", navLabel: "Glossar", inNav: true },
  { path: "/methodik", priority: 0.4, changeFrequency: "yearly" },
  { path: "/ueber-uns", priority: 0.4, changeFrequency: "yearly" },
  { path: "/redaktion", priority: 0.4, changeFrequency: "yearly" },
];

/** Routes shown in the primary knowledge navigation, in order. */
export const KNOWLEDGE_NAV = KNOWLEDGE_ROUTES.filter((r) => r.inNav);

/** Every indexable knowledge route incl. all dynamic detail pages. */
export function allKnowledgeRoutes(): KnowledgeRoute[] {
  const region: KnowledgeRoute[] = REGIONS.map((r) => ({
    path: `/regionen/${r.slug}`,
    priority: 0.6,
    changeFrequency: "monthly" as const,
  }));
  const city: KnowledgeRoute[] = CITIES.map((c) => ({
    path: `/staedte/${c.slug}`,
    priority: 0.6,
    changeFrequency: "monthly" as const,
  }));
  const employer: KnowledgeRoute[] = EMPLOYERS.map((e) => ({
    path: `/arbeitgeber/${e.slug}`,
    priority: 0.6,
    changeFrequency: "monthly" as const,
  }));
  const glossary: KnowledgeRoute[] = GLOSSARY.map((t) => ({
    path: `/glossar/${t.slug}`,
    priority: 0.5,
    changeFrequency: "yearly" as const,
  }));
  return [...KNOWLEDGE_ROUTES, ...region, ...city, ...employer, ...glossary];
}
