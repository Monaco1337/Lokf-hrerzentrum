import type { Metadata } from "next";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import {
  CtaBlock,
  Prose,
  SectionHeading,
  StepList,
} from "@/features/knowledge/components/blocks";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import { articleSchema, breadcrumbSchema } from "@/features/knowledge/seo";
import type { Crumb, GuideStep } from "@/features/knowledge/types";

const PATH = "/redaktion";

export const metadata: Metadata = {
  title: "Redaktion & Prüfung — wie Inhalte entstehen",
  description:
    "Unser redaktioneller Prozess: Erstellung durch die Fachredaktion, fachliche Prüfung, Quellenangabe und regelmäßige Aktualisierung der Inhalte.",
  alternates: { canonical: PATH },
};

const PROCESS: GuideStep[] = [
  {
    title: "Recherche & Erstellung",
    body: "Die Fachredaktion erstellt Inhalte auf Basis primärer und öffentlich nachprüfbarer Quellen und ordnet sie verständlich ein.",
  },
  {
    title: "Fachliche Prüfung",
    body: "Fachlich relevante Inhalte (z. B. zu Vorschriften, Technik und Förderung) werden vor Veröffentlichung gegengeprüft.",
  },
  {
    title: "Quellen & Kennzeichnung",
    body: "Quantitative Angaben werden als Spannen gekennzeichnet, zuständige Stellen verlinkt und der Stand der Daten ausgewiesen.",
  },
  {
    title: "Aktualisierung",
    body: "Inhalte werden regelmäßig überprüft und bei rechtlichen oder marktbezogenen Änderungen aktualisiert.",
  },
];

export default function RedaktionPage() {
  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "Redaktion", path: PATH },
  ];

  return (
    <KnowledgeShell activePath={PATH} showTrust={false}>
      <ArticleHero
        crumbs={crumbs}
        eyebrow="Redaktion"
        title="Redaktion & Prüfung"
        lede="So entstehen unsere Inhalte: von der Recherche über die fachliche Prüfung bis zur regelmäßigen Aktualisierung. Verantwortlich ist die Redaktion von Lokführerzentrum.de."
        updated="2026"
      />

      <div className="space-y-12">
        <section>
          <SectionHeading kicker="Prozess">Unser redaktioneller Prozess</SectionHeading>
          <div className="mt-2">
            <StepList steps={PROCESS} />
          </div>
        </section>

        <section>
          <SectionHeading kicker="Verantwortung">Rollen in der Redaktion</SectionHeading>
          <Prose
            paragraphs={[
              "Die Fachredaktion verantwortet Recherche, Erstellung und Pflege der Inhalte. Fachlich sensible Themen durchlaufen zusätzlich eine fachliche Prüfung.",
              "Wir benennen Verantwortlichkeiten transparent und erweitern dieses Profil um namentliche Autoren- und Prüferangaben, sobald die jeweilige fachliche Verantwortung zugeordnet ist.",
            ]}
          />
        </section>

        <section>
          <SectionHeading kicker="Korrekturen">Hinweise & Korrekturen</SectionHeading>
          <Prose
            paragraphs={[
              "Wir korrigieren Fehler nachvollziehbar. Hinweise auf Ungenauigkeiten prüfen wir und passen die betroffenen Inhalte an. Die Datengrundlage beschreiben wir auf der Seite Methodik & Quellen.",
            ]}
          />
        </section>

        <CtaBlock />
      </div>

      <JsonLd
        data={[
          articleSchema({
            headline: "Redaktion & Prüfung",
            description: "Redaktioneller Prozess, Rollen und Korrekturpraxis der Plattform.",
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
