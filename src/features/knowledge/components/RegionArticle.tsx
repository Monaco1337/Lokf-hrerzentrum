/**
 * Renders a federal-state (Bundesland) hub page from RegionData plus its
 * resolved employers and cities. All eight required angles appear as sections of
 * one comprehensive page (no thin doorway pages).
 */
import { ArticleHero } from "./ArticleHero";
import {
  CtaBlock,
  FaqList,
  Prose,
  RelatedGrid,
  SectionHeading,
} from "./blocks";

import type {
  CityData,
  Crumb,
  EmployerData,
  RegionData,
  RelatedLink,
} from "../types";

const PILLARS: RelatedLink[] = [
  { title: "Lokführer werden", description: "Voraussetzungen, Wege & Ablauf.", href: "/lokfuehrer-werden" },
  { title: "Bildungsgutschein", description: "Geförderte Umschulung Schritt für Schritt.", href: "/foerderung/bildungsgutschein" },
  { title: "Gehalt", description: "Bundesweite Spannen & Zulagen.", href: "/gehalt/lokfuehrer" },
  { title: "Alle Regionen", description: "Zur Übersicht aller Bundesländer.", href: "/regionen" },
];

export function RegionArticle({
  region,
  employers,
  cities,
  crumbs,
}: {
  region: RegionData;
  employers: EmployerData[];
  cities: CityData[];
  crumbs: Crumb[];
}) {
  const employerLinks: RelatedLink[] = employers.map((e) => ({
    title: e.name,
    description: `${e.kind} · ${e.coverage}`,
    href: `/arbeitgeber/${e.slug}`,
  }));
  const cityLinks: RelatedLink[] = cities.map((c) => ({
    title: c.name,
    description: "Lokführer werden, Umschulung & Arbeitgeber vor Ort.",
    href: `/staedte/${c.slug}`,
  }));

  return (
    <>
      <ArticleHero
        crumbs={crumbs}
        eyebrow={`Region · ${region.name}`}
        title={`Lokführer werden in ${region.name}`}
        lede={region.intro[0] ?? ""}
        facts={region.keyFacts}
        updated="2026"
      />

      <div className="space-y-12">
        <section>
          <SectionHeading kicker="Überblick">{`Der Bahnmarkt in ${region.name}`}</SectionHeading>
          <Prose paragraphs={region.intro} />
        </section>

        <section>
          <SectionHeading kicker="Arbeitsmarkt">{`Arbeitsmarkt für Lokführer in ${region.name}`}</SectionHeading>
          <Prose paragraphs={region.arbeitsmarkt} />
        </section>

        <section>
          <SectionHeading kicker="Besonderheiten">Regionale Besonderheiten</SectionHeading>
          <Prose paragraphs={region.besonderheiten} />
        </section>

        {employerLinks.length > 0 ? (
          <RelatedGrid title={`Arbeitgeber in ${region.name}`} links={employerLinks} />
        ) : null}

        {cityLinks.length > 0 ? (
          <RelatedGrid title={`Städte in ${region.name}`} links={cityLinks} />
        ) : null}

        <section>
          <SectionHeading kicker="Umschulung & Förderung">
            Umschulung und Bildungsgutschein
          </SectionHeading>
          <Prose
            paragraphs={[
              `Der häufigste Weg in den Beruf führt in ${region.name} über eine rund 12- bis 15-monatige Umschulung bei einem nach AZAV zugelassenen Bildungsträger.`,
              ...region.foerderung,
            ]}
          />
        </section>

        <section>
          <SectionHeading kicker="Gehalt">{`Was verdienen Lokführer in ${region.name}?`}</SectionHeading>
          <Prose paragraphs={[region.salaryNote]} />
        </section>

        <section>
          <SectionHeading kicker="FAQ">{`Häufige Fragen zu ${region.name}`}</SectionHeading>
          <FaqList items={region.faq} />
        </section>

        <RelatedGrid title="Weiterlesen" links={PILLARS} />

        <CtaBlock title={`Eignung prüfen — geförderte Umschulung in ${region.name}`} />
      </div>
    </>
  );
}
