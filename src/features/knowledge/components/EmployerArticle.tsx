/**
 * Renders an employer hub page from EmployerData plus the resolved regions it
 * operates in and the full employer set for the comparison table.
 */
import { ArticleHero } from "./ArticleHero";
import {
  CtaBlock,
  FaqList,
  Prose,
  RelatedGrid,
  SectionHeading,
} from "./blocks";
import { ComparisonTable } from "./ComparisonTable";

import type {
  Crumb,
  EmployerData,
  RegionData,
  RelatedLink,
} from "../types";

export function EmployerArticle({
  employer,
  regions,
  allEmployers,
  crumbs,
}: {
  employer: EmployerData;
  regions: RegionData[];
  allEmployers: ReadonlyArray<EmployerData>;
  crumbs: Crumb[];
}) {
  const regionLinks: RelatedLink[] = regions.map((r) => ({
    title: r.name,
    description: "Arbeitsmarkt, Förderung & Arbeitgeber im Bundesland.",
    href: `/regionen/${r.slug}`,
  }));

  const pillars: RelatedLink[] = [
    { title: "Lokführer werden", description: "Voraussetzungen, Wege & Ablauf.", href: "/lokfuehrer-werden" },
    { title: "Gehalt", description: "Bundesweite Spannen & Zulagen.", href: "/gehalt/lokfuehrer" },
    { title: "Alle Arbeitgeber", description: "Zur Übersicht & zum Vergleich.", href: "/arbeitgeber" },
  ];

  return (
    <>
      <ArticleHero
        crumbs={crumbs}
        eyebrow={`Arbeitgeber · ${employer.kind}`}
        title={`Lokführer bei ${employer.name}`}
        lede={employer.profile[0] ?? ""}
        facts={employer.keyFacts}
        updated="2026"
      />

      <div className="space-y-12">
        <section>
          <SectionHeading kicker="Profil">Unternehmensprofil</SectionHeading>
          <Prose paragraphs={employer.profile} />
        </section>

        <section>
          <SectionHeading kicker="Einsatz">Einsatzgebiete</SectionHeading>
          <Prose paragraphs={employer.einsatzgebiete} />
        </section>

        <section>
          <SectionHeading kicker="Standorte">Standorte</SectionHeading>
          <Prose paragraphs={employer.standorte} />
        </section>

        <section>
          <SectionHeading kicker="Gehalt">Gehaltsinformationen</SectionHeading>
          <Prose paragraphs={employer.gehalt} />
        </section>

        <section>
          <SectionHeading kicker="Arbeit">Arbeitsbedingungen</SectionHeading>
          <Prose paragraphs={employer.arbeitsbedingungen} />
        </section>

        <section>
          <SectionHeading kicker="Karriere">Karrierewege</SectionHeading>
          <Prose paragraphs={employer.karrierewege} />
        </section>

        <section>
          <SectionHeading kicker="Bewerbung">Bewerbungsprozess</SectionHeading>
          <Prose paragraphs={employer.bewerbungsprozess} />
        </section>

        {regionLinks.length > 0 ? (
          <RelatedGrid title="Regionen / Einsatzländer" links={regionLinks} />
        ) : null}

        <section>
          <SectionHeading kicker="Vergleich">Arbeitgebervergleich</SectionHeading>
          <ComparisonTable employers={allEmployers} activeSlug={employer.slug} />
        </section>

        <section>
          <SectionHeading kicker="FAQ">{`Häufige Fragen zu ${employer.name}`}</SectionHeading>
          <FaqList items={employer.faq} />
        </section>

        <RelatedGrid title="Weiterlesen" links={pillars} />

        <CtaBlock title={`Passt ${employer.name} zu dir? Eignung kostenlos prüfen`} />
      </div>
    </>
  );
}
