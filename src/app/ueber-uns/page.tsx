import type { Metadata } from "next";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import {
  CtaBlock,
  Prose,
  RelatedGrid,
  SectionHeading,
} from "@/features/knowledge/components/blocks";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import {
  articleSchema,
  breadcrumbSchema,
  organizationSchema,
  webSiteSchema,
} from "@/features/knowledge/seo";
import type { Crumb, RelatedLink } from "@/features/knowledge/types";

const PATH = "/ueber-uns";

export const metadata: Metadata = {
  title: "Über uns — Lokführerzentrum",
  description:
    "Wer wir sind und warum es uns gibt: unabhängige, verlässliche Orientierung rund um Umschulung, Karriere und Arbeitsmarkt für Lokführer in Deutschland.",
  alternates: { canonical: PATH },
};

export default function UeberUnsPage() {
  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "Über uns", path: PATH },
  ];

  const links: RelatedLink[] = [
    { title: "Methodik & Quellen", description: "Wie unsere Daten entstehen.", href: "/methodik" },
    { title: "Redaktion & Prüfung", description: "Wer Inhalte erstellt und prüft.", href: "/redaktion" },
    { title: "Wissen", description: "Der Einstieg in unser Wissensportal.", href: "/wissen" },
  ];

  return (
    <KnowledgeShell activePath={PATH} showTrust={false}>
      <ArticleHero
        crumbs={crumbs}
        eyebrow="Über uns"
        title="Über Lokführerzentrum"
        lede="Wir machen den Weg in den Lokführerberuf transparent — mit verlässlichem Wissen, klaren Daten und konkreter Orientierung für die geförderte Umschulung."
        updated="2026"
      />

      <div className="space-y-12">
        <section>
          <SectionHeading kicker="Auftrag">Warum es uns gibt</SectionHeading>
          <Prose
            paragraphs={[
              "Der Bedarf an Triebfahrzeugführern ist hoch, doch der Weg in den Beruf ist für Quereinsteiger oft unübersichtlich: Welche Voraussetzungen gelten, wie funktioniert die Förderung, welche Arbeitgeber gibt es, was verdient man?",
              "Wir bündeln diese Fragen an einem Ort — neutral, strukturiert und mit Fokus auf den deutschsprachigen Bahnarbeitsmarkt.",
            ]}
          />
        </section>

        <section>
          <SectionHeading kicker="Anspruch">Wofür wir stehen</SectionHeading>
          <Prose
            paragraphs={[
              "Verlässlichkeit vor Reichweite: Wir kennzeichnen Schätzungen, verweisen auf zuständige Stellen und vermeiden überzogene Versprechen.",
              "Nützlichkeit pro Seite: Jede Region, Stadt und jeder Arbeitgeber bekommt eigenständige, konkrete Informationen statt austauschbarer Massentexte.",
            ]}
          />
        </section>

        <RelatedGrid title="Mehr Transparenz" links={links} />

        <CtaBlock />
      </div>

      <JsonLd
        data={[
          organizationSchema(),
          webSiteSchema(),
          articleSchema({
            headline: "Über Lokführerzentrum",
            description: "Auftrag, Anspruch und Selbstverständnis der Plattform.",
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
