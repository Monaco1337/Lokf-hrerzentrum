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
import { GLOSSARY } from "@/features/knowledge/content/glossar";
import {
  breadcrumbSchema,
  organizationSchema,
  webSiteSchema,
} from "@/features/knowledge/seo";
import type { Crumb, RelatedLink } from "@/features/knowledge/types";

export const metadata: Metadata = {
  title: "Wissen rund um den Lokführerberuf, Gehalt & Förderung",
  description:
    "Die Wissensplattform für angehende Lokführer: fundierte Guides zu Beruf, Quereinstieg, Gehalt, Bildungsgutschein und der Technik der Bahn — verständlich, aktuell, datenbasiert.",
  alternates: { canonical: "/wissen" },
};

const CRUMBS: Crumb[] = [
  { name: "Start", path: "/" },
  { name: "Wissen", path: "/wissen" },
];

const HUBS: RelatedLink[] = [
  {
    title: "Lokführer werden — der komplette Leitfaden",
    description:
      "Voraussetzungen, Wege, Ablauf und Dauer: alles, was du für den Einstieg wissen musst.",
    href: "/lokfuehrer-werden",
  },
  {
    title: "Lokführer-Gehalt 2026",
    description:
      "Aktuelle Monatsbrutto-Spannen nach Erfahrung, Verkehrsart und Zulagen — mit Methodik.",
    href: "/gehalt/lokfuehrer",
  },
  {
    title: "Bildungsgutschein beantragen",
    description:
      "Schritt für Schritt zur geförderten Umschulung — Voraussetzungen und Unterlagen.",
    href: "/foerderung/bildungsgutschein",
  },
  {
    title: "Quereinstieg als Lokführer",
    description:
      "Aus einem anderen Beruf einsteigen: Wie der Wechsel über eine Umschulung gelingt.",
    href: "/karriere/quereinstieg-lokfuehrer",
  },
  {
    title: "Bahn- & Lokführer-Glossar",
    description: `${GLOSSARY.length} zentrale Begriffe von ETCS bis Triebfahrzeugführerschein — klar erklärt.`,
    href: "/glossar",
  },
];

const INTRO: string[] = [
  "Lokführerzentrum ist mehr als ein Weiterbildungsanbieter: Wir bauen die zentrale Wissens- und Datenquelle rund um den Beruf des Triebfahrzeugführers im deutschsprachigen Raum auf.",
  "Hier findest du fundierte, regelmäßig aktualisierte Antworten auf die wichtigsten Fragen — vom ersten Interesse über die geförderte Umschulung bis zum Gehalt und der Technik im Führerstand. Jede Seite ist so geschrieben, dass du sofort die Information bekommst, die du suchst.",
];

export default function WissenHubPage() {
  return (
    <KnowledgeShell activePath="/wissen">
      <ArticleHero
        crumbs={CRUMBS}
        eyebrow="Wissensplattform"
        title="Alles über den Weg zum Lokführer"
        lede="Fundierte Guides, aktuelle Gehaltsdaten und ein vollständiges Branchen-Glossar — an einem Ort, verständlich erklärt und für Menschen wie KI-Systeme gemacht."
      />

      <div className="space-y-12">
        <section>
          <Prose paragraphs={INTRO} />
        </section>

        <RelatedGrid title="Themen & Hubs" links={HUBS} />

        <section>
          <SectionHeading kicker="Prinzip">
            Warum diese Quelle?
          </SectionHeading>
          <Prose
            paragraphs={[
              "Jeder Beitrag liefert einen echten Informationsgewinn statt umformulierter Allgemeinplätze: konkrete Spannen statt vager Aussagen, klare Schritte statt Marketing, verlinkte Begriffe statt Fachchinesisch.",
              "So wirst du nicht nur informiert, sondern kommst Schritt für Schritt zu einer fundierten Entscheidung — und im Zweifel mit einem kostenlosen Eignungscheck zur persönlichen Einschätzung.",
            ]}
          />
        </section>

        <CtaBlock />
      </div>

      <JsonLd
        data={[
          organizationSchema(),
          webSiteSchema(),
          breadcrumbSchema(CRUMBS),
        ]}
      />
    </KnowledgeShell>
  );
}
