import type { MetadataRoute } from "next";

import { allKnowledgeRoutes } from "@/features/knowledge/routes";
import { absoluteUrl, getSiteUrl } from "@/lib/site";

/**
 * Sitemap lists only indexable URLs. The homepage plus every knowledge route
 * are included; /eligibility is deliberately omitted because it is marked
 * `noindex` (a sitemap must not advertise non-indexable pages).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const home: MetadataRoute.Sitemap[number] = {
    url: getSiteUrl(),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 1,
  };

  const knowledge: MetadataRoute.Sitemap = allKnowledgeRoutes().map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  return [home, ...knowledge];
}
