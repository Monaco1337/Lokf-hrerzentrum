import type { Metadata } from "next";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import {
  Callout,
  CtaBlock,
  FaqList,
  Panel,
  Prose,
  RelatedGrid,
  SectionHeading,
} from "@/features/knowledge/components/blocks";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import { SalaryTable } from "@/features/knowledge/components/SalaryTable";
import {
  SALARY_DATA_PERIOD,
  SALARY_FACTORS,
  SALARY_KEY_FACTS,
  SALARY_METHODOLOGY,
  SALARY_SEGMENTS,
} from "@/features/knowledge/content/gehalt";
import {
  breadcrumbSchema,
  datasetSchema,
  faqSchema,
  occupationSchema,
} from "@/features/knowledge/seo";
import type { Crumb, QA, RelatedLink } from "@/features/knowledge/types";

export const metadata: Metadata = {
  title: `Lokführer-Gehalt ${SALARY_DATA_PERIOD} — Einstieg, Erfahrung & Zulagen`,
  description:
    "Was verdient ein Lokführer? Aktuelle Monatsbrutto-Spannen nach Erfahrung, Verkehrsart und Zulagen — als transparenter, methodisch dokumentierter Datensatz.",
  alternates: { canonical: "/gehalt/lokfuehrer" },
};

const CRUMBS: Crumb[] = [
  { name: "Start", path: "/" },
  { name: "Wissen", path: "/wissen" },
  { name: "Gehalt Lokführer", path: "/gehalt/lokfuehrer" },
];

const FAQ: QA[] = [
  {
    question: "Was verdient ein Lokführer am Anfang?",
    answer:
      "Nach einer Umschulung liegt das Einstiegsgehalt im Personen- und Nahverkehr typischerweise bei rund 2.800 bis 3.400 € brutto im Monat — je nach Arbeitgeber, Tarif und Region.",
  },
  {
    question: "Wie viel verdient ein Lokführer mit Zulagen?",
    answer:
      "Mit Schicht-, Nacht-, Sonntags- und Feiertagszuschlägen sind für erfahrene Triebfahrzeugführer effektive Monatswerte bis rund 5.600 € brutto erreichbar. Die Zulagen hängen stark vom Einsatzmodell ab.",
  },
  {
    question: "Verdient man im Güterverkehr mehr?",
    answer:
      "Häufig ja: Der Güterverkehr bringt durch Nacht- und Wochenenddienste oft höhere Zulagen mit sich, sodass das Effektivgehalt über dem reinen Nahverkehr liegen kann.",
  },
  {
    question: "Sind diese Zahlen garantiert?",
    answer:
      "Nein. Es handelt sich um aggregierte Orientierungswerte. Das tatsächliche Gehalt hängt von Arbeitgeber, Tarifvertrag, Region, Schichtmodell, Erfahrung und Zulagen ab.",
  },
];

const RELATED: RelatedLink[] = [
  {
    title: "Lokführer werden",
    description: "Der komplette Leitfaden zu Voraussetzungen, Wegen und Ablauf.",
    href: "/lokfuehrer-werden",
  },
  {
    title: "Bildungsgutschein",
    description: "So wird die Umschulung gefördert — Schritt für Schritt.",
    href: "/foerderung/bildungsgutschein",
  },
];

export default function GehaltPage() {
  return (
    <KnowledgeShell activePath="/gehalt/lokfuehrer">
      <ArticleHero
        crumbs={CRUMBS}
        eyebrow="Gehaltsatlas"
        title={`Lokführer-Gehalt ${SALARY_DATA_PERIOD}`}
        lede="Wie viel verdient man als Lokführer? Hier findest du transparente Monatsbrutto-Spannen nach Erfahrung, Verkehrsart und Zulagen — inklusive der Faktoren, die das Gehalt bestimmen."
        facts={SALARY_KEY_FACTS}
        updated={SALARY_DATA_PERIOD}
      />

      <div className="space-y-12">
        <section>
          <SectionHeading kicker="Datensatz">
            Gehalt nach Segment
          </SectionHeading>
          <SalaryTable segments={SALARY_SEGMENTS} />
          <p className="mt-3 text-[12px] text-ink-muted">
            Alle Werte als Monatsbrutto in Euro. Der senkrechte Strich markiert
            den Median, der Balken die typische Spanne.
          </p>
        </section>

        <section>
          <SectionHeading kicker="Einflussfaktoren">
            Was das Gehalt bestimmt
          </SectionHeading>
          <div className="grid gap-3 sm:grid-cols-2">
            {SALARY_FACTORS.map((f) => (
              <Panel key={f.factor}>
                <p className="text-[14.5px] font-semibold text-navy-950">
                  {f.factor}
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-soft">
                  {f.effect}
                </p>
              </Panel>
            ))}
          </div>
        </section>

        <Callout title="Hinweis zur Einordnung">
          Die Zahlen sind Orientierungswerte, keine Zusagen. Dein konkretes
          Gehalt verhandelst du mit dem Arbeitgeber auf Basis von Tarif,
          Erfahrung und Einsatzmodell.
        </Callout>

        <section>
          <SectionHeading kicker="Transparenz">Methodik</SectionHeading>
          <Prose paragraphs={[...SALARY_METHODOLOGY]} />
        </section>

        <section>
          <SectionHeading kicker="FAQ">Häufige Fragen zum Gehalt</SectionHeading>
          <FaqList items={FAQ} />
        </section>

        <RelatedGrid title="Passt dazu" links={RELATED} />

        <CtaBlock title="Geförderte Umschulung — passt sie zu dir?" />
      </div>

      <JsonLd
        data={[
          datasetSchema({
            name: `Lokführer-Gehalt Deutschland ${SALARY_DATA_PERIOD}`,
            description:
              "Aggregierte Monatsbrutto-Spannen für Triebfahrzeugführer nach Erfahrung, Verkehrsart und Zulagen.",
            path: "/gehalt/lokfuehrer",
            dateModified: `${SALARY_DATA_PERIOD}-01-01`,
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
