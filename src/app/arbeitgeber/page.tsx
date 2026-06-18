import type { Metadata } from "next";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import { CtaBlock, Prose, SectionHeading } from "@/features/knowledge/components/blocks";
import { ComparisonTable } from "@/features/knowledge/components/ComparisonTable";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import { EMPLOYERS } from "@/features/knowledge/content/arbeitgeber";
import { articleSchema, breadcrumbSchema } from "@/features/knowledge/seo";
import type { Crumb } from "@/features/knowledge/types";

const PATH = "/arbeitgeber";

export const metadata: Metadata = {
  title: "Bahn-Arbeitgeber für Lokführer im Vergleich",
  description:
    "Alle wichtigen Arbeitgeber für Lokführer in Deutschland im Vergleich: DB-Konzern und Wettbewerber, Nah-, Fern- und Güterverkehr.",
  alternates: { canonical: PATH },
};

export default function ArbeitgeberIndexPage() {
  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "Arbeitgeber", path: PATH },
  ];

  return (
    <KnowledgeShell activePath={PATH}>
      <ArticleHero
        crumbs={crumbs}
        eyebrow="Arbeitgeber"
        title="Bahn-Arbeitgeber für Lokführer im Vergleich"
        lede="Vom DB-Konzern bis zu den Wettbewerbern: Wer fährt wo, in welcher Verkehrsart und mit welchen Schwerpunkten? Hier findest du den Überblick und die Detailprofile."
      />

      <div className="space-y-12">
        <Prose
          paragraphs={[
            "Der Markt für Lokführer ist breiter als die Deutsche Bahn allein. Neben DB Regio, DB Fernverkehr und DB Cargo gibt es zahlreiche Wettbewerber im Nah- und Güterverkehr — oft mit regionalem Schwerpunkt.",
          ]}
        />
        <section>
          <SectionHeading kicker="Vergleich">Alle Arbeitgeber auf einen Blick</SectionHeading>
          <ComparisonTable employers={EMPLOYERS} />
        </section>
        <CtaBlock />
      </div>

      <JsonLd
        data={[
          articleSchema({
            headline: "Bahn-Arbeitgeber für Lokführer im Vergleich",
            description: "Übersicht und Vergleich der wichtigsten Arbeitgeber für Lokführer in Deutschland.",
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
