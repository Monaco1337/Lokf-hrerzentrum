import type { Metadata } from "next";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import { CtaBlock, Prose, RelatedGrid } from "@/features/knowledge/components/blocks";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import { REGIONS } from "@/features/knowledge/content/bundeslaender";
import { CITIES } from "@/features/knowledge/content/staedte";
import { articleSchema, breadcrumbSchema } from "@/features/knowledge/seo";
import type { Crumb, RelatedLink } from "@/features/knowledge/types";

const PATH = "/regionen";

export const metadata: Metadata = {
  title: "Lokführer werden — alle Bundesländer im Überblick",
  description:
    "Regionale Hubs für alle 16 Bundesländer: Arbeitsmarkt, Umschulung, Bildungsgutschein, Arbeitgeber und Gehalt für angehende Lokführer.",
  alternates: { canonical: PATH },
};

export default function RegionenIndexPage() {
  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "Regionen", path: PATH },
  ];

  const regionLinks: RelatedLink[] = REGIONS.map((r) => ({
    title: r.name,
    description: `${r.employerSlugs.length} Arbeitgeber · ${r.citySlugs.length} Städte mit Detailseite`,
    href: `/regionen/${r.slug}`,
  }));

  const cityLinks: RelatedLink[] = CITIES.slice(0, 6).map((c) => ({
    title: c.name,
    description: `Standort in ${c.bundeslandName}.`,
    href: `/staedte/${c.slug}`,
  }));

  return (
    <KnowledgeShell activePath={PATH}>
      <ArticleHero
        crumbs={crumbs}
        eyebrow="Regionen"
        title="Lokführer werden in Deutschland — nach Bundesland"
        lede="Der Bahnarbeitsmarkt ist regional verschieden. Wähle dein Bundesland für Arbeitsmarkt, Umschulung, Förderung, Arbeitgeber und Gehalt vor Ort."
      />

      <div className="space-y-12">
        <Prose
          paragraphs={[
            "Jede Region hat eigene Schwerpunkte: dichte Ballungsraumnetze, starke Güterverkehrsknoten oder Pendlerachsen ins Umland. Diese Übersicht führt dich zu den 16 Bundesländer-Hubs mit konkreten, lokalen Informationen.",
          ]}
        />
        <RelatedGrid title="Alle Bundesländer" links={regionLinks} />
        <RelatedGrid title="Beliebte Städte" links={cityLinks} />
        <CtaBlock />
      </div>

      <JsonLd
        data={[
          articleSchema({
            headline: "Lokführer werden in Deutschland — nach Bundesland",
            description:
              "Regionale Übersicht aller Bundesländer für die Umschulung und Karriere als Lokführer.",
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
