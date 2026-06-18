import type { Metadata } from "next";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import {
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
} from "@/features/knowledge/seo";
import type { Crumb, KeyFact, QA, RelatedLink } from "@/features/knowledge/types";

export const metadata: Metadata = {
  title: "Quereinstieg als Lokführer — so gelingt der Wechsel",
  description:
    "Quereinstieg zum Lokführer: aus welchen Berufen der Wechsel gelingt, wie die Umschulung abläuft und worauf es bei Eignung und Förderung ankommt.",
  alternates: { canonical: "/karriere/quereinstieg-lokfuehrer" },
};

const UPDATED = "2026";

const CRUMBS: Crumb[] = [
  { name: "Start", path: "/" },
  { name: "Wissen", path: "/wissen" },
  { name: "Quereinstieg Lokführer", path: "/karriere/quereinstieg-lokfuehrer" },
];

const FACTS: KeyFact[] = [
  { label: "Dauer", value: "≈ 12–15 Mon.", hint: "Umschulung in Vollzeit" },
  { label: "Erstberuf", value: "egal", hint: "Eignung zählt, nicht Herkunft" },
  { label: "Abschluss", value: "Tf-Schein", hint: "Prüfung nach TfV" },
  { label: "Förderung", value: "möglich", hint: "Bildungsgutschein" },
];

const FAQ: QA[] = [
  {
    question: "Aus welchen Berufen gelingt der Quereinstieg?",
    answer:
      "Erfolgreiche Quereinsteiger kommen aus Handwerk, Logistik, Produktion, dem Sicherheits- oder dem kaufmännischen Bereich. Entscheidend ist nicht der Vorberuf, sondern die persönliche und gesundheitliche Eignung.",
  },
  {
    question: "Wie alt darf ich für den Quereinstieg sein?",
    answer:
      "Eine feste Altersgrenze nach oben gibt es nicht. Wichtig sind Volljährigkeit und die bestandene medizinische sowie psychologische Eignungsuntersuchung. Auch Menschen jenseits der 40 starten erfolgreich.",
  },
  {
    question: "Ist der Quereinstieg schwer?",
    answer:
      "Die Umschulung ist anspruchsvoll, aber gut machbar. Sie verbindet Theorie (Fahrzeug-/Streckenkunde, Signal- und Sicherungstechnik) mit viel Praxis und bereitet gezielt auf die Prüfung vor.",
  },
];

const RELATED: RelatedLink[] = [
  {
    title: "Lokführer werden",
    description: "Der komplette Leitfaden mit allen Voraussetzungen.",
    href: "/lokfuehrer-werden",
  },
  {
    title: "Bildungsgutschein",
    description: "So finanzierst du die Umschulung über die Förderung.",
    href: "/foerderung/bildungsgutschein",
  },
  {
    title: "Lokführer-Gehalt",
    description: "Was du nach dem Quereinstieg verdienen kannst.",
    href: "/gehalt/lokfuehrer",
  },
  {
    title: "Umschulung im Glossar",
    description: "Die kompakte Definition der Umschulung zum Lokführer.",
    href: "/glossar/umschulung",
  },
];

export default function QuereinstiegPage() {
  return (
    <KnowledgeShell activePath="/lokfuehrer-werden">
      <ArticleHero
        crumbs={CRUMBS}
        eyebrow="Karriere"
        title="Quereinstieg als Lokführer"
        lede="Der Lokführerberuf ist einer der wenigen gut bezahlten Jobs, in den du ohne klassische Erstausbildung wechseln kannst. So gelingt der Quereinstieg über eine geförderte Umschulung."
        facts={FACTS}
        updated={UPDATED}
      />

      <div className="space-y-12">
        <section>
          <SectionHeading kicker="Ausgangslage">
            Warum Quereinstieg funktioniert
          </SectionHeading>
          <Prose
            paragraphs={[
              "Anders als in vielen Berufen ist beim Lokführer keine dreijährige Erstausbildung zwingend nötig. Umschulungen bereiten gezielt auf die Tätigkeit und die Prüfung zum Triebfahrzeugführerschein vor.",
              "Weil der Bedarf an Triebfahrzeugführern hoch ist und über Jahre hoch bleibt, sind Eisenbahnverkehrsunternehmen aktiv auf der Suche nach motivierten Quereinsteigern — unabhängig vom ursprünglichen Beruf.",
            ]}
          />
        </section>

        <section>
          <SectionHeading kicker="Eignung">
            Worauf es wirklich ankommt
          </SectionHeading>
          <Prose
            paragraphs={[
              "Statt eines bestimmten Vorberufs zählen Zuverlässigkeit, Konzentrationsfähigkeit und gesundheitliche Eignung. Die medizinische Tauglichkeits- und die psychologische Eignungsuntersuchung sind verpflichtend und sicherheitsrelevant.",
              "Bereitschaft zu Schicht-, Nacht- und Wochenenddiensten gehört dazu — diese werden über Zulagen vergütet und erhöhen das Effektivgehalt deutlich.",
            ]}
          />
        </section>

        <section>
          <SectionHeading kicker="FAQ">Häufige Fragen zum Quereinstieg</SectionHeading>
          <FaqList items={FAQ} />
        </section>

        <RelatedGrid title="Weiterlesen" links={RELATED} />

        <CtaBlock title="Quereinstieg — passt er zu dir?" />
      </div>

      <JsonLd
        data={[
          articleSchema({
            headline: "Quereinstieg als Lokführer — so gelingt der Wechsel",
            description:
              "Aus welchen Berufen der Quereinstieg gelingt, wie die Umschulung abläuft und worauf es bei Eignung und Förderung ankommt.",
            path: "/karriere/quereinstieg-lokfuehrer",
            datePublished: "2026-01-01",
            dateModified: `${UPDATED}-01-01`,
          }),
          faqSchema(FAQ),
          breadcrumbSchema(CRUMBS),
        ]}
      />
    </KnowledgeShell>
  );
}
