import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import {
  CtaBlock,
  Panel,
  Prose,
  RelatedGrid,
  SectionHeading,
} from "@/features/knowledge/components/blocks";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import {
  GLOSSARY,
  getGlossaryTerm,
  relatedTerms,
} from "@/features/knowledge/content/glossar";
import {
  breadcrumbSchema,
  definedTermSchema,
} from "@/features/knowledge/seo";
import type { Crumb, RelatedLink } from "@/features/knowledge/types";

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return GLOSSARY.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) return { title: "Begriff nicht gefunden" };
  const path = `/glossar/${term.slug}`;
  return {
    title: `${term.term}${term.abbr ? ` (${term.abbr})` : ""} — Definition`,
    description: term.short,
    alternates: { canonical: path },
  };
}

export default async function GlossarTermPage({ params }: Params) {
  const { slug } = await params;
  const term = getGlossaryTerm(slug);
  if (!term) notFound();

  const path = `/glossar/${term.slug}`;
  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "Wissen", path: "/wissen" },
    { name: "Glossar", path: "/glossar" },
    { name: term.term, path },
  ];

  const related: RelatedLink[] = relatedTerms(term).map((t) => ({
    title: t.term,
    description: t.short,
    href: `/glossar/${t.slug}`,
  }));

  return (
    <KnowledgeShell activePath="/glossar">
      <ArticleHero
        crumbs={crumbs}
        eyebrow={`Glossar · ${term.category}`}
        title={`${term.term}${term.abbr ? ` (${term.abbr})` : ""}`}
        lede={term.short}
      />

      <article className="space-y-10">
        <Prose paragraphs={term.body} />

        {term.synonyms && term.synonyms.length > 0 ? (
          <Panel>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Auch bekannt als
            </p>
            <p className="mt-2 text-[14.5px] text-ink-soft">
              {term.synonyms.join(" · ")}
            </p>
          </Panel>
        ) : null}

        {term.sameAs && term.sameAs.length > 0 ? (
          <section>
            <SectionHeading>Weiterführende Quellen</SectionHeading>
            <ul className="space-y-2">
              {term.sameAs.map((href) => (
                <li key={href}>
                  <a
                    href={href}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="text-[14px] font-medium text-brand-700 underline-offset-2 hover:underline"
                  >
                    {href.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {related.length > 0 ? (
          <RelatedGrid title="Verwandte Begriffe" links={related} />
        ) : null}

        <CtaBlock />
      </article>

      <JsonLd
        data={[
          definedTermSchema({
            name: term.term,
            description: term.short,
            path,
            ...(term.sameAs ? { sameAs: term.sameAs } : {}),
          }),
          breadcrumbSchema(crumbs),
        ]}
      />
    </KnowledgeShell>
  );
}
