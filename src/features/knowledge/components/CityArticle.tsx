/**
 * Renders a city hub page from CityData plus its resolved local employers.
 * Covers the five required local angles as sections of one localised page.
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
  RelatedLink,
} from "../types";

export function CityArticle({
  city,
  employers,
  crumbs,
}: {
  city: CityData;
  employers: EmployerData[];
  crumbs: Crumb[];
}) {
  const employerLinks: RelatedLink[] = employers.map((e) => ({
    title: e.name,
    description: `${e.kind} · ${e.coverage}`,
    href: `/arbeitgeber/${e.slug}`,
  }));

  const pillars: RelatedLink[] = [
    {
      title: `Region ${city.bundeslandName}`,
      description: "Arbeitsmarkt, Förderung & Arbeitgeber im Bundesland.",
      href: `/regionen/${city.bundeslandSlug}`,
    },
    { title: "Lokführer werden", description: "Der komplette Leitfaden.", href: "/lokfuehrer-werden" },
    { title: "Bildungsgutschein", description: "Förderung Schritt für Schritt.", href: "/foerderung/bildungsgutschein" },
    { title: "Gehalt", description: "Spannen & Zulagen.", href: "/gehalt/lokfuehrer" },
  ];

  return (
    <>
      <ArticleHero
        crumbs={crumbs}
        eyebrow={`Standort · ${city.name}`}
        title={`Lokführer werden in ${city.name}`}
        lede={city.intro[0] ?? ""}
        facts={city.keyFacts}
        updated="2026"
      />

      <div className="space-y-12">
        <section>
          <SectionHeading kicker="Überblick">{`Bahnstandort ${city.name}`}</SectionHeading>
          <Prose paragraphs={city.intro} />
        </section>

        <section>
          <SectionHeading kicker="Einstieg">{`Lokführer werden in ${city.name}`}</SectionHeading>
          <Prose paragraphs={city.lokfuehrerWerden} />
        </section>

        <section>
          <SectionHeading kicker="Umschulung">{`Umschulung Lokführer in ${city.name}`}</SectionHeading>
          <Prose paragraphs={city.umschulung} />
        </section>

        <section>
          <SectionHeading kicker="Förderung">{`Bildungsgutschein in ${city.name}`}</SectionHeading>
          <Prose paragraphs={city.bildungsgutschein} />
        </section>

        {employerLinks.length > 0 ? (
          <RelatedGrid title={`Arbeitgeber in ${city.name}`} links={employerLinks} />
        ) : null}

        <section>
          <SectionHeading kicker="Gehalt">{`Gehaltsübersicht ${city.name}`}</SectionHeading>
          <Prose paragraphs={city.gehalt} />
        </section>

        <section>
          <SectionHeading kicker="FAQ">{`Häufige Fragen zu ${city.name}`}</SectionHeading>
          <FaqList items={city.faq} />
        </section>

        <RelatedGrid title="Weiterlesen" links={pillars} />

        <CtaBlock title={`Eignung prüfen — Umschulung in ${city.name}`} />
      </div>
    </>
  );
}
