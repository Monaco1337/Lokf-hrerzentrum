import type { Metadata } from "next";

import { ArticleHero } from "@/features/knowledge/components/ArticleHero";
import { JsonLd } from "@/features/knowledge/components/JsonLd";
import { KnowledgeShell } from "@/features/knowledge/components/KnowledgeShell";
import { breadcrumbSchema } from "@/features/knowledge/seo";
import type { Crumb } from "@/features/knowledge/types";
import {
  LegalDocument,
  type LegalDocumentData,
} from "@/features/legal/LegalDocument";

const PATH = "/impressum";
const UPDATED = "Juni 2026";

export const metadata: Metadata = {
  title: "Impressum — Lokführerzentrum",
  description:
    "Impressum und Anbieterkennzeichnung gemäß § 5 DDG und § 18 MStV: Angaben zum Diensteanbieter, Kontakt, Registereintrag, Aufsichtsbehörde sowie Haftungs- und Urheberrechtshinweise.",
  alternates: { canonical: PATH },
  robots: { index: true, follow: true },
};

const DOC: LegalDocumentData = {
  updated: UPDATED,
  sections: [
    {
      id: "diensteanbieter",
      title: "Diensteanbieter",
      blocks: [
        {
          kind: "p",
          text: "Angaben gemäß § 5 des Digitale-Dienste-Gesetzes (DDG). Verantwortlicher Anbieter dieses Online-Dienstes (nachfolgend „Lokführerzentrum“, „wir“ oder „uns“) ist:",
        },
        {
          kind: "dl",
          rows: [
            { k: "Unternehmen", v: "[Vollständiger Firmenname eintragen]" },
            { k: "Rechtsform", v: "[z. B. GmbH / UG (haftungsbeschränkt) / Einzelunternehmen]" },
            { k: "Anschrift", v: "[Straße und Hausnummer]\n[PLZ, Ort]" },
            { k: "Land", v: "Deutschland" },
          ],
        },
        {
          kind: "note",
          title: "Bitte ausfüllen",
          text: "Die mit **[eckigen Klammern]** markierten Felder müssen vor der Veröffentlichung durch die tatsächlichen, rechtlich verbindlichen Unternehmensdaten ersetzt werden. Ein unvollständiges Impressum kann abgemahnt werden.",
        },
      ],
    },
    {
      id: "vertretung",
      title: "Vertretungsberechtigte Person(en)",
      blocks: [
        {
          kind: "p",
          text: "Gesetzlich vertreten durch die/den vertretungsberechtigte(n):",
        },
        {
          kind: "dl",
          rows: [
            { k: "Vertreten durch", v: "[Vor- und Nachname der Geschäftsführung / Inhaber:in]" },
          ],
        },
      ],
    },
    {
      id: "kontakt",
      title: "Kontakt",
      blocks: [
        {
          kind: "dl",
          rows: [
            { k: "Telefon", v: "[Telefonnummer eintragen]" },
            { k: "E-Mail", v: "foerderung@lokführerzentrum.de" },
            { k: "Website", v: "www.lokführerzentrum.de" },
          ],
        },
        {
          kind: "p",
          text: "Für datenschutzrechtliche Anliegen erreichen Sie uns unter derselben E-Mail-Adresse. Näheres regelt unsere Datenschutzerklärung.",
        },
      ],
    },
    {
      id: "register",
      title: "Registereintrag",
      blocks: [
        {
          kind: "p",
          text: "Sofern das Unternehmen in ein öffentliches Register eingetragen ist:",
        },
        {
          kind: "dl",
          rows: [
            { k: "Registergericht", v: "[z. B. Amtsgericht … / entfällt bei Einzelunternehmen]" },
            { k: "Registernummer", v: "[z. B. HRB … / entfällt]" },
          ],
        },
      ],
    },
    {
      id: "ust-id",
      title: "Umsatzsteuer-Identifikationsnummer",
      blocks: [
        {
          kind: "p",
          text: "Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:",
        },
        {
          kind: "dl",
          rows: [
            { k: "USt-IdNr.", v: "[DE… eintragen / entfällt, sofern nicht vorhanden]" },
          ],
        },
      ],
    },
    {
      id: "aufsicht",
      title: "Zulassung & Aufsicht (Bildungsangebot)",
      blocks: [
        {
          kind: "p",
          text: "Soweit über Lokführerzentrum geförderte Weiterbildungen bzw. Umschulungen vermittelt oder durchgeführt werden, kann eine Zulassung nach der **Akkreditierungs- und Zulassungsverordnung Arbeitsförderung (AZAV)** erforderlich sein.",
        },
        {
          kind: "dl",
          rows: [
            { k: "Fachkundige Stelle", v: "[Name der zertifizierenden fachkundigen Stelle eintragen / entfällt]" },
            { k: "Zertifikat-Nr.", v: "[Zertifikatsnummer eintragen / entfällt]" },
            { k: "Zuständige Aufsicht", v: "[zuständige Behörde, sofern einschlägig]" },
          ],
        },
        {
          kind: "p",
          text: "Die Entscheidung über eine Förderung (z. B. mittels Bildungsgutschein) trifft ausschließlich die zuständige Agentur für Arbeit bzw. das Jobcenter. Lokführerzentrum informiert, berät und begleitet, gibt jedoch keine Förderzusage ab.",
        },
      ],
    },
    {
      id: "redaktion",
      title: "Redaktionell verantwortlich",
      blocks: [
        {
          kind: "p",
          text: "Verantwortlich für journalistisch-redaktionelle Inhalte gemäß § 18 Abs. 2 Medienstaatsvertrag (MStV):",
        },
        {
          kind: "dl",
          rows: [
            { k: "Verantwortlich i. S. d. § 18 MStV", v: "[Vor- und Nachname, Anschrift der verantwortlichen Person]" },
          ],
        },
      ],
    },
    {
      id: "streitbeilegung",
      title: "EU-Streitschlichtung & Verbraucherstreitbeilegung",
      blocks: [
        {
          kind: "p",
          text: "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: **https://ec.europa.eu/consumers/odr/**. Unsere E-Mail-Adresse finden Sie oben in diesem Impressum.",
        },
        {
          kind: "p",
          text: "Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle im Sinne des Verbraucherstreitbeilegungsgesetzes (VSBG) teilzunehmen.",
        },
      ],
    },
    {
      id: "haftung-inhalte",
      title: "Haftung für Inhalte",
      blocks: [
        {
          kind: "p",
          text: "Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.",
        },
        {
          kind: "p",
          text: "Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden entsprechender Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.",
        },
      ],
    },
    {
      id: "haftung-links",
      title: "Haftung für Links",
      blocks: [
        {
          kind: "p",
          text: "Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.",
        },
        {
          kind: "p",
          text: "Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.",
        },
      ],
    },
    {
      id: "urheberrecht",
      title: "Urheberrecht",
      blocks: [
        {
          kind: "p",
          text: "Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.",
        },
        {
          kind: "p",
          text: "Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Sollten Sie dennoch auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.",
        },
      ],
    },
    {
      id: "bildnachweise",
      title: "Bild- und Markennachweise",
      blocks: [
        {
          kind: "p",
          text: "Marken- und Warenzeichen Dritter (z. B. genannte Bahnunternehmen) sind Eigentum der jeweiligen Rechteinhaber und dienen ausschließlich der Beschreibung. Verwendete Bild-, Grafik- und Videomaterialien stammen aus eigener Produktion oder lizenzierten Quellen.",
        },
      ],
    },
  ],
};

export default function ImpressumPage() {
  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "Impressum", path: PATH },
  ];

  return (
    <KnowledgeShell activePath={PATH} showTrust={false}>
      <div className="mx-auto max-w-3xl">
        <ArticleHero
          crumbs={crumbs}
          eyebrow="Rechtliches"
          title="Impressum"
          lede="Anbieterkennzeichnung gemäß § 5 DDG und § 18 MStV. Hier finden Sie alle gesetzlich vorgeschriebenen Angaben zum Diensteanbieter sowie Hinweise zu Haftung und Urheberrecht."
          updated={UPDATED}
        />
        <LegalDocument data={DOC} />
      </div>

      <JsonLd data={[breadcrumbSchema(crumbs)]} />
    </KnowledgeShell>
  );
}
