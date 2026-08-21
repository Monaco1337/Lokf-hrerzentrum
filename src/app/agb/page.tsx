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

const PATH = "/agb";
const UPDATED = "Juni 2026";

export const metadata: Metadata = {
  title: "AGB — Allgemeine Geschäftsbedingungen | Lokführerzentrum",
  description:
    "Allgemeine Geschäftsbedingungen für die Nutzung der Plattform Lokführerzentrum: Geltungsbereich, Leistungen, Vertragsschluss, Mitwirkungspflichten, Widerrufsrecht für Verbraucher, Haftung und Schlussbestimmungen.",
  alternates: { canonical: PATH },
  robots: { index: true, follow: true },
};

const DOC: LegalDocumentData = {
  updated: UPDATED,
  sections: [
    {
      id: "geltungsbereich",
      title: "Geltungsbereich",
      blocks: [
        {
          kind: "p",
          text: "Diese Allgemeinen Geschäftsbedingungen (nachfolgend „AGB“) gelten für die Nutzung der über lokführerzentrum.de bereitgestellten Angebote (nachfolgend „Plattform“) sowie für sämtliche Informations-, Beratungs- und Vermittlungsleistungen zwischen **[Firmenname]** (nachfolgend „Anbieter“, „wir“) und den Nutzerinnen und Nutzern (nachfolgend „Nutzer“, „Sie“).",
        },
        {
          kind: "p",
          text: "Abweichende, entgegenstehende oder ergänzende Bedingungen des Nutzers werden nur dann und insoweit Vertragsbestandteil, als wir ihrer Geltung ausdrücklich schriftlich zugestimmt haben.",
        },
        {
          kind: "p",
          text: "**Verbraucher** ist jede natürliche Person, die ein Rechtsgeschäft zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer selbstständigen beruflichen Tätigkeit zugerechnet werden können (§ 13 BGB).",
        },
      ],
    },
    {
      id: "leistungen",
      title: "Leistungsbeschreibung",
      blocks: [
        {
          kind: "p",
          text: "Der Anbieter informiert über die geförderte Weiterbildung/Umschulung zum Triebfahrzeugführer (Lokführer), stellt einen unverbindlichen Eignungscheck bereit und begleitet interessierte Nutzer bei der Anbahnung einer Weiterbildung sowie bei der Kommunikation mit beteiligten Stellen (z. B. Bildungsträger, Agentur für Arbeit/Jobcenter, kooperierende Arbeitgeber).",
        },
        {
          kind: "list",
          items: [
            "Bereitstellung von Informationen, Leitfäden und Orientierungshilfen,",
            "Durchführung eines unverbindlichen Eignungschecks,",
            "Unterstützung bei der Vorbereitung von Unterlagen über das Bewerberportal,",
            "Vermittlung von Kontakten zu Bildungsträgern und/oder Arbeitgebern.",
          ],
        },
        {
          kind: "note",
          title: "Wichtiger Hinweis",
          text: "Der Anbieter ist weder Kostenträger noch Entscheidungsträger einer Förderung. Über die Bewilligung einer Förderung (z. B. Bildungsgutschein) entscheidet ausschließlich die zuständige Agentur für Arbeit bzw. das Jobcenter. Ein Anspruch auf Förderung, Zulassung zu einer Maßnahme oder ein bestimmtes Vermittlungsergebnis besteht nicht.",
        },
      ],
    },
    {
      id: "vertragsschluss",
      title: "Zustandekommen des Vertrags",
      blocks: [
        {
          kind: "p",
          text: "Die Darstellung der Leistungen auf der Plattform stellt kein rechtlich bindendes Angebot dar, sondern eine Aufforderung zur Abgabe einer Anfrage. Mit dem Absenden des Eignungschecks, eines Kontaktformulars oder einer sonstigen Anfrage geben Sie eine Anfrage auf Erbringung der jeweiligen (kostenlosen) Leistung ab.",
        },
        {
          kind: "p",
          text: "Ein Vertrag kommt zustande, wenn wir Ihre Anfrage annehmen, spätestens jedoch mit Beginn der Leistungserbringung (z. B. Aufnahme der Beratung/Begleitung). Kostenpflichtige Leistungen kommen nur nach ausdrücklicher, gesonderter Vereinbarung zustande.",
        },
      ],
    },
    {
      id: "verguetung",
      title: "Kosten & Vergütung",
      blocks: [
        {
          kind: "p",
          text: "Die Nutzung der Plattform sowie der Eignungscheck und die damit verbundene Orientierungsberatung sind für Nutzer grundsätzlich **kostenlos**. Kosten einer geförderten Weiterbildung werden – bei Vorliegen der Voraussetzungen – regelmäßig durch die zuständige Stelle (z. B. Agentur für Arbeit/Jobcenter) getragen.",
        },
        {
          kind: "p",
          text: "Sollten im Einzelfall kostenpflichtige Zusatzleistungen angeboten werden, werden Preise, Leistungsumfang und Zahlungsbedingungen vor Vertragsschluss gesondert und transparent ausgewiesen. Alle Preise verstehen sich inklusive der gesetzlichen Umsatzsteuer, sofern nicht anders angegeben.",
        },
      ],
    },
    {
      id: "mitwirkung",
      title: "Mitwirkungspflichten des Nutzers",
      blocks: [
        {
          kind: "p",
          text: "Für eine sachgerechte Beratung und Begleitung sind zutreffende Angaben erforderlich. Sie verpflichten sich insbesondere:",
        },
        {
          kind: "list",
          items: [
            "wahrheitsgemäße, vollständige und aktuelle Angaben zu machen,",
            "erforderliche Unterlagen fristgerecht bereitzustellen,",
            "Zugangsdaten zum Bewerberportal vertraulich zu behandeln und nicht an Dritte weiterzugeben,",
            "die Plattform nicht missbräuchlich zu nutzen (z. B. keine rechtswidrigen Inhalte, keine automatisierten Massenzugriffe).",
          ],
        },
        {
          kind: "p",
          text: "Bei unrichtigen oder unvollständigen Angaben können Beratung und Vermittlung beeinträchtigt sein; hierfür übernimmt der Anbieter keine Verantwortung.",
        },
      ],
    },
    {
      id: "eignungscheck",
      title: "Eignungscheck — Unverbindlichkeit",
      blocks: [
        {
          kind: "p",
          text: "Der Eignungscheck dient ausschließlich einer ersten, unverbindlichen Orientierung. Er stellt keine medizinische, psychologische oder rechtsverbindliche Eignungsfeststellung dar und begründet keinen Anspruch auf Zulassung zu einer Maßnahme oder Einstellung. Verbindliche Eignungsuntersuchungen (z. B. nach den einschlägigen bahnrechtlichen Vorgaben) erfolgen durch die dafür zuständigen Stellen.",
        },
      ],
    },
    {
      id: "widerruf",
      title: "Widerrufsrecht für Verbraucher",
      blocks: [
        {
          kind: "h3",
          text: "Widerrufsbelehrung",
        },
        {
          kind: "p",
          text: "Verbrauchern steht bei im Fernabsatz geschlossenen Verträgen ein Widerrufsrecht zu.",
        },
        {
          kind: "p",
          text: "**Widerrufsrecht.** Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.",
        },
        {
          kind: "p",
          text: "Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (**[Firmenname, Anschrift]**, E-Mail: foerderung@lokführerzentrum.de, Telefon: **[Telefonnummer]**) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das nachstehende Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.",
        },
        {
          kind: "p",
          text: "Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.",
        },
        {
          kind: "h3",
          text: "Folgen des Widerrufs",
        },
        {
          kind: "p",
          text: "Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für die Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart.",
        },
        {
          kind: "p",
          text: "**Vorzeitiges Erlöschen / Wertersatz bei Dienstleistungen.** Haben Sie verlangt, dass die Dienstleistung während der Widerrufsfrist beginnen soll, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zum Widerruf bereits erbrachten Dienstleistungen entspricht. Das Widerrufsrecht erlischt bei einem Vertrag zur Erbringung von Dienstleistungen, wenn wir die Dienstleistung vollständig erbracht haben und mit der Ausführung erst begonnen haben, nachdem Sie dazu Ihre ausdrückliche Zustimmung gegeben und gleichzeitig Ihre Kenntnis davon bestätigt haben, dass Sie Ihr Widerrufsrecht bei vollständiger Vertragserfüllung verlieren.",
        },
        {
          kind: "note",
          title: "Muster-Widerrufsformular",
          text: "An [Firmenname, Anschrift, E-Mail]: Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung (*) — Bestellt am (*)/erhalten am (*) — Name des/der Verbraucher(s) — Anschrift des/der Verbraucher(s) — Unterschrift (nur bei Mitteilung auf Papier) — Datum. (*) Unzutreffendes streichen.",
        },
      ],
    },
    {
      id: "verfuegbarkeit",
      title: "Verfügbarkeit der Plattform",
      blocks: [
        {
          kind: "p",
          text: "Wir bemühen uns um eine möglichst unterbrechungsfreie Verfügbarkeit der Plattform. Ein Anspruch auf ständige Verfügbarkeit besteht jedoch nicht. Wartungsarbeiten, Weiterentwicklungen sowie Umstände, die nicht in unserem Einflussbereich liegen (z. B. Störungen von Netzen oder Diensten Dritter, höhere Gewalt), können die Erreichbarkeit vorübergehend einschränken.",
        },
      ],
    },
    {
      id: "haftung",
      title: "Haftung",
      blocks: [
        {
          kind: "p",
          text: "Wir haften unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen, ferner nach dem Produkthaftungsgesetz sowie im Umfang einer von uns übernommenen Garantie.",
        },
        {
          kind: "p",
          text: "Bei leicht fahrlässiger Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht), deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung Sie regelmäßig vertrauen dürfen, ist unsere Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.",
        },
        {
          kind: "p",
          text: "Für die Richtigkeit von Förderentscheidungen, die Verfügbarkeit von Maßnahmenplätzen sowie für Leistungen Dritter (z. B. Bildungsträger, Arbeitgeber, Behörden) übernehmen wir keine Haftung, soweit gesetzlich zulässig.",
        },
      ],
    },
    {
      id: "urheberrecht",
      title: "Nutzungsrechte & Urheberrecht",
      blocks: [
        {
          kind: "p",
          text: "Sämtliche Inhalte der Plattform (Texte, Grafiken, Logos, Software, Datenbanken) sind urheber- bzw. leistungsschutzrechtlich geschützt. Eine Nutzung ist nur im Rahmen der gesetzlich zulässigen Zwecke und dieser AGB gestattet. Eine darüber hinausgehende Verwertung bedarf unserer vorherigen schriftlichen Zustimmung.",
        },
      ],
    },
    {
      id: "datenschutz",
      title: "Datenschutz",
      blocks: [
        {
          kind: "p",
          text: "Informationen zur Verarbeitung Ihrer personenbezogenen Daten finden Sie in unserer Datenschutzerklärung. Diese ist nicht Bestandteil dieser AGB, sondern informiert Sie gesondert über Art, Umfang und Zwecke der Datenverarbeitung sowie über Ihre Rechte.",
        },
      ],
    },
    {
      id: "streitbeilegung",
      title: "Streitbeilegung",
      blocks: [
        {
          kind: "p",
          text: "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: **https://ec.europa.eu/consumers/odr/**. Wir sind zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle weder bereit noch verpflichtet.",
        },
      ],
    },
    {
      id: "schluss",
      title: "Schlussbestimmungen",
      blocks: [
        {
          kind: "p",
          text: "Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Bei Verbrauchern gilt diese Rechtswahl nur, soweit hierdurch der durch zwingende Bestimmungen des Rechts des Staates des gewöhnlichen Aufenthalts des Verbrauchers gewährte Schutz nicht entzogen wird.",
        },
        {
          kind: "p",
          text: "Ist der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist Gerichtsstand für alle Streitigkeiten aus dem Vertragsverhältnis der Sitz des Anbieters.",
        },
        {
          kind: "p",
          text: "Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein oder werden, so wird dadurch die Wirksamkeit der übrigen Bestimmungen nicht berührt.",
        },
        {
          kind: "p",
          text: "**Stand dieser AGB: " + UPDATED + ".**",
        },
      ],
    },
  ],
};

export default function AgbPage() {
  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "AGB", path: PATH },
  ];

  return (
    <KnowledgeShell activePath={PATH} showTrust={false}>
      <div className="mx-auto max-w-3xl">
        <ArticleHero
          crumbs={crumbs}
          eyebrow="Rechtliches"
          title="Allgemeine Geschäftsbedingungen"
          lede="Die Bedingungen für die Nutzung der Plattform und unserer Informations-, Beratungs- und Vermittlungsleistungen — inklusive Widerrufsrecht für Verbraucher."
          updated={UPDATED}
        />
        <LegalDocument data={DOC} />
      </div>

      <JsonLd data={[breadcrumbSchema(crumbs)]} />
    </KnowledgeShell>
  );
}
