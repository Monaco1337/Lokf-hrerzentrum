import type { Metadata } from "next";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import {
  Callout,
  CtaBlock,
  Prose,
  SectionHeading,
} from "@/features/knowledge/components/blocks";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import { SALARY_METHODOLOGY } from "@/features/knowledge/content/gehalt";
import { articleSchema, breadcrumbSchema } from "@/features/knowledge/seo";
import type { Crumb } from "@/features/knowledge/types";

const PATH = "/methodik";

export const metadata: Metadata = {
  title: "Methodik & Quellen — wie unsere Daten entstehen",
  description:
    "Wie wir recherchieren, welche Quellen wir nutzen und wie oft wir aktualisieren — transparente Methodik hinter unseren Gehalts-, Regional- und Arbeitgeberdaten.",
  alternates: { canonical: PATH },
};

export default function MethodikPage() {
  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "Methodik", path: PATH },
  ];

  return (
    <KnowledgeShell activePath={PATH} showTrust={false}>
      <ArticleHero
        crumbs={crumbs}
        eyebrow="Transparenz"
        title="Methodik & Quellen"
        lede="Unsere Inhalte sollen verlässlich und überprüfbar sein. Hier erklären wir, wie unsere Daten entstehen, woher sie stammen und wie wir sie aktuell halten."
        updated="2026"
      />

      <div className="space-y-12">
        <section>
          <SectionHeading kicker="Grundsätze">Unsere redaktionellen Grundsätze</SectionHeading>
          <Prose
            paragraphs={[
              "Wir trennen klar zwischen gesicherten Fakten, eingeordneten Schätzungen und Orientierungswerten. Quantitative Angaben kennzeichnen wir als Spannen, nicht als garantierte Werte.",
              "Wir bevorzugen primäre und öffentlich nachprüfbare Quellen: Rechtsverordnungen, offizielle Stellen, Tarifinformationen und öffentlich beobachtbare Stellenangebote.",
            ]}
          />
        </section>

        <section>
          <SectionHeading kicker="Gehaltsdaten">Methodik der Gehaltsdaten</SectionHeading>
          <Prose paragraphs={[...SALARY_METHODOLOGY]} />
        </section>

        <section>
          <SectionHeading kicker="Regional- & Arbeitgeberdaten">
            Regional- und Arbeitgeberdaten
          </SectionHeading>
          <Prose
            paragraphs={[
              "Regionale und arbeitgeberbezogene Aussagen beruhen auf stabilen, öffentlich bekannten Merkmalen — etwa Verkehrsart, Einsatzgebiete und Netzstruktur. Wir vermeiden bewusst spekulative oder schwer überprüfbare Detailbehauptungen.",
              "Wo wir keine belastbare Quelle haben, bleiben Aussagen qualitativ und verweisen auf die zuständigen Stellen (z. B. die örtliche Agentur für Arbeit für Förderentscheidungen).",
            ]}
          />
        </section>

        <section>
          <SectionHeading kicker="Aktualisierung">Aktualisierung & Korrekturen</SectionHeading>
          <Prose
            paragraphs={[
              "Jede datengetriebene Seite trägt einen Stand. Wir prüfen die Inhalte regelmäßig und korrigieren bei wesentlichen Marktbewegungen oder rechtlichen Änderungen auch unterjährig.",
            ]}
          />
          <div className="mt-5">
            <Callout title="Fehler gefunden?">
              Wir nehmen Hinweise auf Ungenauigkeiten ernst und korrigieren nachvollziehbar. Die
              redaktionellen Abläufe beschreiben wir auf der Seite Redaktion & Prüfung.
            </Callout>
          </div>
        </section>

        <CtaBlock />
      </div>

      <JsonLd
        data={[
          articleSchema({
            headline: "Methodik & Quellen",
            description: "Methodik, Quellen und Aktualisierungspraxis hinter den Inhalten der Plattform.",
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
