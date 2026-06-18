import type { Metadata } from "next";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import {
  Callout,
  CtaBlock,
  FaqList,
  Prose,
  RelatedGrid,
  SectionHeading,
  StepList,
} from "@/features/knowledge/components/blocks";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  howToSchema,
} from "@/features/knowledge/seo";
import type {
  Crumb,
  GuideStep,
  KeyFact,
  QA,
  RelatedLink,
} from "@/features/knowledge/types";

export const metadata: Metadata = {
  title: "Bildungsgutschein für die Lokführer-Umschulung beantragen",
  description:
    "Wie du den Bildungsgutschein für die geförderte Lokführer-Umschulung erhältst: Voraussetzungen, Unterlagen und der Ablauf Schritt für Schritt — verständlich erklärt.",
  alternates: { canonical: "/foerderung/bildungsgutschein" },
};

const UPDATED = "2026";

const CRUMBS: Crumb[] = [
  { name: "Start", path: "/" },
  { name: "Wissen", path: "/wissen" },
  { name: "Bildungsgutschein", path: "/foerderung/bildungsgutschein" },
];

const FACTS: KeyFact[] = [
  { label: "Träger", value: "AZAV-zertifiziert", hint: "Voraussetzung der Förderung" },
  { label: "Entscheidung", value: "Agentur/Jobcenter", hint: "individuell" },
  { label: "Kosten", value: "0 € möglich", hint: "bei Bewilligung" },
  { label: "Für wen", value: "Breit", hint: "arbeitssuchend & beschäftigt" },
];

const STEPS: GuideStep[] = [
  {
    title: "Eignung & Ziel klären",
    body:
      "Lege fest, dass die Umschulung zum Lokführer dein Ziel ist, und prüfe deine gesundheitliche und persönliche Eignung. Das ist die Grundlage für jedes Beratungsgespräch.",
  },
  {
    title: "Beratungstermin vereinbaren",
    body:
      "Vereinbare ein Gespräch bei der Agentur für Arbeit oder dem Jobcenter. Schildere dein Weiterbildungsziel und frage konkret nach dem Bildungsgutschein.",
  },
  {
    title: "Zugelassene Maßnahme wählen",
    body:
      "Wähle eine nach AZAV zugelassene Umschulung bei einem zertifizierten Bildungsträger. Nur zugelassene Maßnahmen sind über den Gutschein förderfähig.",
  },
  {
    title: "Unterlagen vorbereiten",
    body:
      "Stelle die nötige Mappe zusammen: persönliche Begründung, Lebenslauf, Maßnahme-Angebot und Maßnahmebogen sowie ggf. eine Einstellungszusage. Eine gute Vorbereitung erhöht die Chancen deutlich.",
  },
  {
    title: "Gutschein erhalten & einlösen",
    body:
      "Nach Bewilligung stellt die Agentur den Bildungsgutschein aus. Du löst ihn beim gewählten Träger ein und startest die Umschulung — in der Regel ohne eigene Lehrgangskosten.",
  },
];

const FAQ: QA[] = [
  {
    question: "Wer bekommt einen Bildungsgutschein?",
    answer:
      "Sowohl Arbeitssuchende als auch Beschäftigte können — je nach Förderweg — in Frage kommen. Über die Ausgabe entscheidet ausschließlich die Agentur für Arbeit bzw. das Jobcenter auf Basis deiner Situation.",
  },
  {
    question: "Gibt es eine Garantie auf Bewilligung?",
    answer:
      "Nein. Eine Bewilligung kann niemand garantieren. Mit einer vollständigen, gut begründeten Unterlagenmappe und einer zugelassenen Maßnahme erhöhst du die Chancen jedoch erheblich.",
  },
  {
    question: "Welche Unterlagen brauche ich?",
    answer:
      "Typisch sind eine persönliche Begründung, Lebenslauf, das Maßnahme-Angebot, der Maßnahmebogen und ggf. eine Einstellungszusage. Diese Mappe bereiten wir gemeinsam mit dir vor.",
  },
  {
    question: "Übernimmt der Gutschein alle Kosten?",
    answer:
      "Bei Bewilligung übernimmt der Bildungsgutschein in der Regel die Lehrgangskosten der zugelassenen Maßnahme vollständig. Details klärt die zuständige Stelle im Termin.",
  },
];

const RELATED: RelatedLink[] = [
  {
    title: "Lokführer werden",
    description: "Voraussetzungen, Wege und Ablauf im Überblick.",
    href: "/lokfuehrer-werden",
  },
  {
    title: "Bildungsgutschein im Glossar",
    description: "Die kompakte Definition mit den wichtigsten Fakten.",
    href: "/glossar/bildungsgutschein",
  },
];

export default function BildungsgutscheinPage() {
  return (
    <KnowledgeShell activePath="/foerderung/bildungsgutschein">
      <ArticleHero
        crumbs={CRUMBS}
        eyebrow="Förderung"
        title="Bildungsgutschein für die Lokführer-Umschulung"
        lede="Die Umschulung zum Lokführer kann über den Bildungsgutschein der Agentur für Arbeit oder des Jobcenters vollständig gefördert werden. So läuft der Weg von der Idee bis zur Bewilligung ab."
        facts={FACTS}
        updated={UPDATED}
      />

      <div className="space-y-12">
        <section>
          <SectionHeading kicker="Grundlagen">
            Was ist der Bildungsgutschein?
          </SectionHeading>
          <Prose
            paragraphs={[
              "Der Bildungsgutschein ist ein Instrument der Förderung der beruflichen Weiterbildung nach SGB III. Er kann die Kosten einer nach AZAV zugelassenen Maßnahme — etwa der Umschulung zum Triebfahrzeugführer — übernehmen.",
              "Entscheidend ist: Die Ausgabe liegt allein bei der Agentur für Arbeit bzw. dem Jobcenter. Deine Aufgabe ist es, ein klares Ziel, eine zugelassene Maßnahme und eine überzeugende Unterlagenmappe mitzubringen.",
            ]}
          />
        </section>

        <section>
          <SectionHeading kicker="Ablauf">
            In 5 Schritten zum Gutschein
          </SectionHeading>
          <StepList steps={STEPS} />
        </section>

        <Callout title="Keine Garantie — aber beste Vorbereitung">
          Niemand kann eine Förderung zusichern. Was wir tun können: dich auf den
          Termin vorbereiten und die komplette Mappe mit dir zusammenstellen, um
          deine Chancen zu maximieren.
        </Callout>

        <section>
          <SectionHeading kicker="FAQ">Häufige Fragen zur Förderung</SectionHeading>
          <FaqList items={FAQ} />
        </section>

        <RelatedGrid title="Passt dazu" links={RELATED} />

        <CtaBlock title="Bist du förderfähig? Finde es kostenlos heraus" />
      </div>

      <JsonLd
        data={[
          howToSchema({
            name: "Bildungsgutschein für die Lokführer-Umschulung beantragen",
            description:
              "Schritt-für-Schritt-Anleitung von der Eignungsklärung bis zur Einlösung des Bildungsgutscheins.",
            steps: STEPS,
          }),
          articleSchema({
            headline: "Bildungsgutschein für die Lokführer-Umschulung",
            description:
              "Voraussetzungen, Unterlagen und Ablauf der Förderung über den Bildungsgutschein.",
            path: "/foerderung/bildungsgutschein",
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
