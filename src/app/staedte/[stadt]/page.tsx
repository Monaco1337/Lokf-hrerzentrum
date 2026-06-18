import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CityArticle } from "@/features/knowledge/components/CityArticle";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import { getEmployer } from "@/features/knowledge/content/arbeitgeber";
import { CITIES, getCity } from "@/features/knowledge/content/staedte";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  occupationSchema,
} from "@/features/knowledge/seo";
import type { Crumb } from "@/features/knowledge/types";

interface Params {
  params: Promise<{ stadt: string }>;
}

export function generateStaticParams(): Array<{ stadt: string }> {
  return CITIES.map((c) => ({ stadt: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { stadt } = await params;
  const city = getCity(stadt);
  if (!city) return { title: "Stadt nicht gefunden" };
  const path = `/staedte/${city.slug}`;
  return {
    title: `Lokführer werden in ${city.name} — Umschulung & Arbeitgeber`,
    description: `Lokführer werden in ${city.name}: Umschulung, Bildungsgutschein, Arbeitgeber vor Ort und Gehaltsübersicht.`,
    alternates: { canonical: path },
  };
}

export default async function StadtPage({ params }: Params) {
  const { stadt } = await params;
  const city = getCity(stadt);
  if (!city) notFound();

  const path = `/staedte/${city.slug}`;
  const employers = city.employerSlugs
    .map((s) => getEmployer(s))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));

  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "Städte", path: "/staedte" },
    { name: city.name, path },
  ];

  return (
    <KnowledgeShell activePath="/staedte">
      <CityArticle city={city} employers={employers} crumbs={crumbs} />

      <JsonLd
        data={[
          articleSchema({
            headline: `Lokführer werden in ${city.name}`,
            description: `Umschulung, Förderung, Arbeitgeber und Gehalt für Lokführer in ${city.name}.`,
            path,
            datePublished: "2026-01-01",
            dateModified: "2026-01-01",
          }),
          occupationSchema({
            name: `Lokführer / Triebfahrzeugführer in ${city.name}`,
            description: `Beruf des Triebfahrzeugführers mit lokalem Bezug zu ${city.name} (${city.bundeslandName}).`,
            salaryMin: 2800,
            salaryMedian: 3700,
            salaryMax: 5600,
          }),
          faqSchema(city.faq),
          breadcrumbSchema(crumbs),
        ]}
      />
    </KnowledgeShell>
  );
}
