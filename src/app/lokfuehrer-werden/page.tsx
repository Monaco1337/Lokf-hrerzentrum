import type { Metadata } from "next";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import {
  Callout,
  CtaBlock,
  FaqList,
  Prose,
  RelatedGrid,
  SectionHeading,
} from "@/features/knowledge/components/blocks";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  occupationSchema,
} from "@/features/knowledge/seo";
import type { Crumb, KeyFact, QA, RelatedLink } from "@/features/knowledge/types";

export const metadata: Metadata = {
  title: "Lokführer werden — Voraussetzungen, Wege & Ablauf",
  description:
    "Der komplette Leitfaden zum Lokführer: Voraussetzungen, Umschulung vs. Ausbildung, Dauer, Eignung und Förderung. Verständlich erklärt, für Quereinsteiger geeignet.",
  alternates: { canonical: "/lokfuehrer-werden" },
};

const UPDATED = "2026";

const CRUMBS: Crumb[] = [
  { name: "Start", path: "/" },
  { name: "Wissen", path: "/wissen" },
  { name: "Lokführer werden", path: "/lokfuehrer-werden" },
];

const FACTS: KeyFact[] = [
  { label: "Dauer (Umschulung)", value: "≈ 12–15 Mon.", hint: "Vollzeit" },
  { label: "Einstieg", value: "Quereinstieg", hint: "ohne Erstausbildung möglich" },
  { label: "Förderung", value: "Bildungsgutschein", hint: "über Agentur/Jobcenter" },
  { label: "Bedarf", value: "Hoch", hint: "anhaltender Fachkräftemangel" },
];

const FAQ: QA[] = [
  {
    question: "Welche Voraussetzungen brauche ich, um Lokführer zu werden?",
    answer:
      "In der Regel Volljährigkeit, ein Hauptschulabschluss oder vergleichbar, ausreichende Deutschkenntnisse sowie die bestandene medizinische und psychologische Eignungsuntersuchung. Eine bestimmte Erstausbildung ist nicht zwingend nötig.",
  },
  {
    question: "Kann ich als Quereinsteiger Lokführer werden?",
    answer:
      "Ja. Der Lokführerberuf ist einer der bekanntesten Quereinstiegsberufe. Über eine rund 12- bis 15-monatige Umschulung qualifizierst du dich auch ohne dreijährige Erstausbildung.",
  },
  {
    question: "Wie lange dauert die Ausbildung bzw. Umschulung?",
    answer:
      "Die klassische Ausbildung dauert drei Jahre, die Umschulung für Quereinsteiger in Vollzeit üblicherweise rund 12 bis 15 Monate — inklusive eines erheblichen Praxisanteils.",
  },
  {
    question: "Wird die Umschulung gefördert?",
    answer:
      "Bei nach AZAV zugelassenen Maßnahmen ist eine Förderung über den Bildungsgutschein der Agentur für Arbeit oder des Jobcenters möglich. Die Entscheidung trifft die zuständige Stelle individuell.",
  },
  {
    question: "Brauche ich einen besonderen Schulabschluss?",
    answer:
      "Meist genügt ein Hauptschulabschluss oder eine abgeschlossene Berufsausbildung. Wichtiger als der Abschluss sind die gesundheitliche und psychologische Eignung sowie Zuverlässigkeit.",
  },
];

const RELATED: RelatedLink[] = [
  {
    title: "Quereinstieg als Lokführer",
    description: "Wie der Wechsel aus einem anderen Beruf konkret funktioniert.",
    href: "/karriere/quereinstieg-lokfuehrer",
  },
  {
    title: "Lokführer-Gehalt 2026",
    description: "Monatsbrutto-Spannen nach Erfahrung und Zulagen.",
    href: "/gehalt/lokfuehrer",
  },
  {
    title: "Bildungsgutschein beantragen",
    description: "Schritt für Schritt zur geförderten Umschulung.",
    href: "/foerderung/bildungsgutschein",
  },
  {
    title: "Glossar",
    description: "ETCS, PZB, TfV & Co. — alle Begriffe klar erklärt.",
    href: "/glossar",
  },
];

export default function LokfuehrerWerdenPage() {
  return (
    <KnowledgeShell activePath="/lokfuehrer-werden">
      <ArticleHero
        crumbs={CRUMBS}
        eyebrow="Leitfaden"
        title="Lokführer werden: Voraussetzungen, Wege & Ablauf"
        lede="Triebfahrzeugführer ist ein sicherer, gut bezahlter und stark nachgefragter Beruf — und einer der wenigen, in den du auch als Quereinsteiger über eine geförderte Umschulung einsteigen kannst. Dieser Leitfaden zeigt dir den kompletten Weg."
        facts={FACTS}
        updated={UPDATED}
      />

      <div className="space-y-12">
        <section>
          <SectionHeading kicker="Berufsbild">
            Was macht ein Lokführer?
          </SectionHeading>
          <Prose
            paragraphs={[
              "Ein Triebfahrzeugführer steuert Triebfahrzeuge im Personen-, Güter- oder Rangierverkehr und trägt die Sicherheitsverantwortung für Zug, Fahrgäste oder Ladung. Dazu gehören das Beachten von Signalen, das Bedienen der Zugbeeinflussungssysteme und die Einhaltung der Betriebsvorschriften.",
              "Der Beruf verbindet technische Verantwortung mit hoher Eigenständigkeit. Schicht-, Nacht- und Wochenenddienste gehören dazu — werden aber über Zulagen vergütet, die das Gehalt spürbar erhöhen.",
            ]}
          />
        </section>

        <section>
          <SectionHeading kicker="Voraussetzungen">
            Was du mitbringen musst
          </SectionHeading>
          <Prose
            paragraphs={[
              "Die wichtigsten Voraussetzungen sind Volljährigkeit, ausreichende Deutschkenntnisse, Zuverlässigkeit sowie die bestandene medizinische Tauglichkeits- und psychologische Eignungsuntersuchung. Ein bestimmter Schulabschluss ist seltener entscheidend als die persönliche und gesundheitliche Eignung.",
            ]}
          />
          <Callout title="Wichtig">
            Die Eignungsuntersuchungen sind sicherheitsrelevant und Pflicht. Eine
            ehrliche Selbsteinschätzung vorab — etwa im kostenlosen Eignungscheck
            — erspart später Umwege.
          </Callout>
        </section>

        <section>
          <SectionHeading kicker="Wege">
            Ausbildung oder Umschulung?
          </SectionHeading>
          <Prose
            paragraphs={[
              "Es gibt zwei Hauptwege in den Beruf. Die klassische Ausbildung zum Eisenbahner im Betriebsdienst (Fachrichtung Lokführer/Transport) dauert drei Jahre und richtet sich vor allem an Berufseinsteiger.",
              "Der zweite Weg ist die Umschulung: eine komprimierte Qualifizierung von rund 12 bis 15 Monaten für Quereinsteiger. Sie ist der häufigste Weg für Menschen, die aus einem anderen Beruf wechseln, und ist bei zugelassenen Trägern über den Bildungsgutschein förderfähig.",
            ]}
          />
        </section>

        <section>
          <SectionHeading kicker="Ablauf">Dein Weg in 5 Schritten</SectionHeading>
          <Prose
            paragraphs={[
              "1. Eignung klären — gesundheitliche und persönliche Voraussetzungen prüfen. 2. Förderung sichern — Bildungsgutschein mit der Agentur für Arbeit oder dem Jobcenter vorbereiten. 3. Umschulung starten — Theorie (Fahrzeug-/Streckenkunde, Signal- und Sicherungstechnik) und Praxis. 4. Prüfung ablegen — Triebfahrzeugführerschein nach TfV. 5. Einstieg — Berufsstart bei einem Eisenbahnverkehrsunternehmen.",
            ]}
          />
        </section>

        <section>
          <SectionHeading kicker="FAQ">Häufige Fragen</SectionHeading>
          <FaqList items={FAQ} />
        </section>

        <RelatedGrid title="Weiterlesen" links={RELATED} />

        <CtaBlock />
      </div>

      <JsonLd
        data={[
          articleSchema({
            headline: "Lokführer werden: Voraussetzungen, Wege & Ablauf",
            description:
              "Der komplette Leitfaden zum Triebfahrzeugführer — Voraussetzungen, Umschulung vs. Ausbildung, Dauer, Eignung und Förderung.",
            path: "/lokfuehrer-werden",
            datePublished: "2026-01-01",
            dateModified: `${UPDATED}-01-01`,
          }),
          occupationSchema({
            name: "Lokführer / Triebfahrzeugführer",
            description:
              "Steuert Triebfahrzeuge im Eisenbahnverkehr; sicherheitsverantwortlich für Zug, Fahrgäste oder Ladung.",
            salaryMin: 2800,
            salaryMedian: 3700,
            salaryMax: 5600,
          }),
          faqSchema(FAQ),
          breadcrumbSchema(CRUMBS),
        ]}
      />
    </KnowledgeShell>
  );
}
