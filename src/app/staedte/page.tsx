import type { Metadata } from "next";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import { CtaBlock, Prose, RelatedGrid } from "@/features/knowledge/components/blocks";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import { CITIES } from "@/features/knowledge/content/staedte";
import { articleSchema, breadcrumbSchema } from "@/features/knowledge/seo";
import type { Crumb, RelatedLink } from "@/features/knowledge/types";

const PATH = "/staedte";

export const metadata: Metadata = {
  title: "Lokführer werden — alle Städte im Überblick",
  description:
    "Lokale Hubs für die wichtigsten Bahnstädte Deutschlands: Umschulung, Bildungsgutschein, Arbeitgeber und Gehalt vor Ort.",
  alternates: { canonical: PATH },
};

export default function StaedteIndexPage() {
  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "Städte", path: PATH },
  ];

  const cityLinks: RelatedLink[] = CITIES.map((c) => ({
    title: c.name,
    description: `${c.bundeslandName} · ${c.employerSlugs.length} Arbeitgeber vor Ort`,
    href: `/staedte/${c.slug}`,
  }));

  return (
    <KnowledgeShell activePath={PATH}>
      <ArticleHero
        crumbs={crumbs}
        eyebrow="Städte"
        title="Lokführer werden — nach Stadt"
        lede="Konkret und lokal: Für die wichtigsten Bahnstädte zeigen wir Umschulung, Förderung, Arbeitgeber vor Ort und die Gehaltsübersicht."
      />

      <div className="space-y-12">
        <Prose
          paragraphs={[
            "Wo du wohnst, entscheidet über Wege, Arbeitgeber und Einsatzgebiete. Diese Übersicht führt dich zu den Standort-Hubs mit lokalen Informationen.",
          ]}
        />
        <RelatedGrid title="Alle Städte" links={cityLinks} />
        <CtaBlock />
      </div>

      <JsonLd
        data={[
          articleSchema({
            headline: "Lokführer werden — nach Stadt",
            description: "Übersicht der wichtigsten Bahnstädte für Umschulung und Karriere als Lokführer.",
            path: PATH,
            datePublished: "2026-01-01",
            dateModified: "2026-01-01",
          }),
          breadcrumbSchema(crumbs),
        ]}
      />
    </KnowledgeShell>
  );
}
