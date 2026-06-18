import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import { RegionArticle } from "@/features/knowledge/components/RegionArticle";
import { getEmployer } from "@/features/knowledge/content/arbeitgeber";
import { getRegion, REGIONS } from "@/features/knowledge/content/bundeslaender";
import { getCity } from "@/features/knowledge/content/staedte";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  occupationSchema,
} from "@/features/knowledge/seo";
import type { Crumb } from "@/features/knowledge/types";

interface Params {
  params: Promise<{ bundesland: string }>;
}

export function generateStaticParams(): Array<{ bundesland: string }> {
  return REGIONS.map((r) => ({ bundesland: r.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { bundesland } = await params;
  const region = getRegion(bundesland);
  if (!region) return { title: "Region nicht gefunden" };
  const path = `/regionen/${region.slug}`;
  return {
    title: `Lokführer werden in ${region.name} — Umschulung, Arbeitgeber & Gehalt`,
    description: `Lokführer werden in ${region.name}: Arbeitsmarkt, Umschulung, Bildungsgutschein, regionale Arbeitgeber und Gehalt im Überblick.`,
    alternates: { canonical: path },
  };
}

export default async function RegionPage({ params }: Params) {
  const { bundesland } = await params;
  const region = getRegion(bundesland);
  if (!region) notFound();

  const path = `/regionen/${region.slug}`;
  const employers = region.employerSlugs
    .map((s) => getEmployer(s))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const cities = region.citySlugs
    .map((s) => getCity(s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "Regionen", path: "/regionen" },
    { name: region.name, path },
  ];

  return (
    <KnowledgeShell activePath="/regionen">
      <RegionArticle region={region} employers={employers} cities={cities} crumbs={crumbs} />

      <JsonLd
        data={[
          articleSchema({
            headline: `Lokführer werden in ${region.name}`,
            description: `Arbeitsmarkt, Umschulung, Förderung, Arbeitgeber und Gehalt für Lokführer in ${region.name}.`,
            path,
            datePublished: "2026-01-01",
            dateModified: "2026-01-01",
          }),
          occupationSchema({
            name: `Lokführer / Triebfahrzeugführer in ${region.name}`,
            description: `Beruf des Triebfahrzeugführers mit regionalem Bezug zu ${region.name}.`,
            salaryMin: 2800,
            salaryMedian: 3700,
            salaryMax: 5600,
          }),
          faqSchema(region.faq),
          breadcrumbSchema(crumbs),
        ]}
      />
    </KnowledgeShell>
  );
}
