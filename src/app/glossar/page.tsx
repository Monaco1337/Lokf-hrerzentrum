import type { Metadata } from "next";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import { CtaBlock } from "@/features/knowledge/components/blocks";
import { GlossarIndex } from "@/features/knowledge/components/GlossarIndex";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import { GLOSSARY } from "@/features/knowledge/content/glossar";
import { breadcrumbSchema, type JsonLdNode } from "@/features/knowledge/seo";
import type { Crumb } from "@/features/knowledge/types";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Bahn- & Lokführer-Glossar",
  description:
    "Die wichtigsten Begriffe rund um den Lokführerberuf klar erklärt: von ETCS, PZB und LZB über den Triebfahrzeugführerschein bis zu Bildungsgutschein und Quereinstieg.",
  alternates: { canonical: "/glossar" },
};

const CRUMBS: Crumb[] = [
  { name: "Start", path: "/" },
  { name: "Wissen", path: "/wissen" },
  { name: "Glossar", path: "/glossar" },
];

const TERM_SET_SCHEMA: JsonLdNode = {
  "@context": "https://schema.org",
  "@type": "DefinedTermSet",
  name: "Bahn- & Lokführer-Glossar",
  url: absoluteUrl("/glossar"),
  inLanguage: "de-DE",
  hasDefinedTerm: GLOSSARY.map((t) => ({
    "@type": "DefinedTerm",
    name: t.term,
    url: absoluteUrl(`/glossar/${t.slug}`),
  })),
};

export default function GlossarPage() {
  return (
    <KnowledgeShell activePath="/glossar">
      <ArticleHero
        crumbs={CRUMBS}
        eyebrow="Nachschlagewerk"
        title="Bahn- & Lokführer-Glossar"
        lede={`${GLOSSARY.length} zentrale Begriffe rund um Beruf, Technik, Qualifikation und Förderung — kurz definiert und untereinander verlinkt.`}
      />

      <GlossarIndex terms={GLOSSARY} />

      <div className="mt-12">
        <CtaBlock />
      </div>

      <JsonLd data={[TERM_SET_SCHEMA, breadcrumbSchema(CRUMBS)]} />
    </KnowledgeShell>
  );
}
