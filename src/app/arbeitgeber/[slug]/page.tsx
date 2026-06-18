import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmployerArticle } from "@/features/knowledge/components/EmployerArticle";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import { EMPLOYERS, getEmployer } from "@/features/knowledge/content/arbeitgeber";
import { getRegion } from "@/features/knowledge/content/bundeslaender";
import {
  articleSchema,
  breadcrumbSchema,
  employerOrganizationSchema,
  faqSchema,
} from "@/features/knowledge/seo";
import type { Crumb } from "@/features/knowledge/types";

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return EMPLOYERS.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const employer = getEmployer(slug);
  if (!employer) return { title: "Arbeitgeber nicht gefunden" };
  const path = `/arbeitgeber/${employer.slug}`;
  return {
    title: `Lokführer bei ${employer.name} — Profil, Gehalt & Bewerbung`,
    description: `${employer.name} als Arbeitgeber für Lokführer: Profil, Einsatzgebiete, Gehalt, Arbeitsbedingungen, Karriere und Bewerbungsprozess.`,
    alternates: { canonical: path },
  };
}

export default async function ArbeitgeberPage({ params }: Params) {
  const { slug } = await params;
  const employer = getEmployer(slug);
  if (!employer) notFound();

  const path = `/arbeitgeber/${employer.slug}`;
  const regions = employer.regionSlugs
    .map((s) => getRegion(s))
    .filter((r): r is NonNullable<typeof r> => Boolean(r));

  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "Arbeitgeber", path: "/arbeitgeber" },
    { name: employer.name, path },
  ];

  return (
    <KnowledgeShell activePath="/arbeitgeber">
      <EmployerArticle
        employer={employer}
        regions={regions}
        allEmployers={EMPLOYERS}
        crumbs={crumbs}
      />

      <JsonLd
        data={[
          articleSchema({
            headline: `Lokführer bei ${employer.name}`,
            description: `Profil, Gehalt, Arbeitsbedingungen und Bewerbung bei ${employer.name}.`,
            path,
            datePublished: "2026-01-01",
            dateModified: "2026-01-01",
          }),
          employerOrganizationSchema({
            name: employer.name,
            description: employer.profile[0] ?? employer.kind,
            areaServed: employer.coverage,
          }),
          faqSchema(employer.faq),
          breadcrumbSchema(crumbs),
        ]}
      />
    </KnowledgeShell>
  );
}
