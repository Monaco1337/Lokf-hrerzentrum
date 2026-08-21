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

const PATH = "/datenschutz";
const UPDATED = "Juni 2026";

export const metadata: Metadata = {
  title: "Datenschutzerklärung — Lokführerzentrum",
  description:
    "Umfassende Datenschutzerklärung nach DSGVO, BDSG und TDDDG: Verantwortlicher, Rechtsgrundlagen, Betroffenenrechte, Hosting, Cookies, Eignungscheck, Bewerberportal, WhatsApp- und E-Mail-Kommunikation sowie Datenweitergabe.",
  alternates: { canonical: PATH },
  robots: { index: true, follow: true },
};

const DOC: LegalDocumentData = {
  updated: UPDATED,
  sections: [
    {
      id: "ueberblick",
      title: "Überblick & Geltungsbereich",
      blocks: [
        {
          kind: "p",
          text: "Der Schutz Ihrer personenbezogenen Daten ist uns ein wichtiges Anliegen. Diese Datenschutzerklärung informiert Sie gemäß Art. 13 und 14 der Datenschutz-Grundverordnung (DSGVO) darüber, welche personenbezogenen Daten wir beim Besuch dieser Website und bei Nutzung unserer Angebote (Eignungscheck, Bewerberportal, Kontakt- und Beratungswege) verarbeiten, zu welchen Zwecken, auf welcher Rechtsgrundlage und welche Rechte Ihnen zustehen.",
        },
        {
          kind: "p",
          text: "„Personenbezogene Daten“ sind alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen (Art. 4 Nr. 1 DSGVO), etwa Name, Anschrift, E-Mail-Adresse, Telefonnummer oder Nutzungsdaten.",
        },
        {
          kind: "p",
          text: "Diese Erklärung gilt für alle unter der Domain lokführerzentrum.de (einschließlich Subdomains) bereitgestellten Dienste. Für externe Links zu Websites Dritter gelten deren eigene Datenschutzbestimmungen.",
        },
      ],
    },
    {
      id: "verantwortlicher",
      title: "Verantwortlicher & Datenschutzkontakt",
      blocks: [
        {
          kind: "p",
          text: "Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO ist:",
        },
        {
          kind: "dl",
          rows: [
            { k: "Verantwortlicher", v: "[Vollständiger Firmenname]" },
            { k: "Anschrift", v: "[Straße Hausnummer, PLZ Ort]" },
            { k: "Vertreten durch", v: "[Geschäftsführung / Inhaber:in]" },
            { k: "Telefon", v: "[Telefonnummer]" },
            { k: "E-Mail", v: "foerderung@lokführerzentrum.de" },
          ],
        },
        {
          kind: "h3",
          text: "Datenschutzbeauftragter",
        },
        {
          kind: "p",
          text: "Einen Datenschutzbeauftragten haben wir bestellt, sofern die gesetzlichen Voraussetzungen (§ 38 BDSG) vorliegen. In diesem Fall erreichen Sie ihn unter: **[Name / Kontaktdaten eintragen — andernfalls diesen Abschnitt entfernen]**. Andernfalls richten Sie datenschutzrechtliche Anliegen bitte an den oben genannten Verantwortlichen.",
        },
      ],
    },
    {
      id: "rechtsgrundlagen",
      title: "Rechtsgrundlagen der Verarbeitung",
      blocks: [
        {
          kind: "p",
          text: "Soweit wir für Verarbeitungsvorgänge Ihre Einwilligung einholen, ist Art. 6 Abs. 1 lit. a DSGVO Rechtsgrundlage. Bei der Verarbeitung zur Erfüllung eines Vertrags oder vorvertraglicher Maßnahmen dient Art. 6 Abs. 1 lit. b DSGVO. Zur Erfüllung rechtlicher Verpflichtungen stützen wir uns auf Art. 6 Abs. 1 lit. c DSGVO. Zur Wahrung berechtigter Interessen dient Art. 6 Abs. 1 lit. f DSGVO.",
        },
        {
          kind: "list",
          items: [
            "**Art. 6 Abs. 1 lit. a DSGVO** — Einwilligung (z. B. Newsletter, WhatsApp-Kommunikation, nicht notwendige Cookies, besondere Datenkategorien).",
            "**Art. 6 Abs. 1 lit. b DSGVO** — Vertrag/vorvertragliche Maßnahmen (z. B. Bearbeitung Ihrer Anfrage, Begleitung im Bewerbungs- und Förderprozess).",
            "**Art. 6 Abs. 1 lit. c DSGVO** — rechtliche Verpflichtung (z. B. handels- und steuerrechtliche Aufbewahrungspflichten).",
            "**Art. 6 Abs. 1 lit. f DSGVO** — berechtigtes Interesse (z. B. sicherer und stabiler Betrieb der Website, Missbrauchs- und Betrugsprävention).",
            "**Art. 9 Abs. 2 lit. a DSGVO** — ausdrückliche Einwilligung für besondere Kategorien personenbezogener Daten (z. B. Gesundheits-/Eignungsangaben im Rahmen der Voraussetzungsprüfung).",
          ],
        },
      ],
    },
    {
      id: "betroffenenrechte",
      title: "Ihre Rechte als betroffene Person",
      blocks: [
        {
          kind: "p",
          text: "Ihnen stehen gegenüber dem Verantwortlichen hinsichtlich der Sie betreffenden personenbezogenen Daten die folgenden Rechte zu:",
        },
        {
          kind: "list",
          items: [
            "**Auskunft** (Art. 15 DSGVO) — über die von uns verarbeiteten personenbezogenen Daten.",
            "**Berichtigung** (Art. 16 DSGVO) — unrichtiger oder unvollständiger Daten.",
            "**Löschung** (Art. 17 DSGVO) — „Recht auf Vergessenwerden“, soweit keine Aufbewahrungspflichten entgegenstehen.",
            "**Einschränkung der Verarbeitung** (Art. 18 DSGVO).",
            "**Datenübertragbarkeit** (Art. 20 DSGVO) — Erhalt Ihrer Daten in einem strukturierten, gängigen, maschinenlesbaren Format.",
            "**Widerspruch** (Art. 21 DSGVO) — gegen Verarbeitungen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO sowie jederzeit gegen Direktwerbung.",
            "**Widerruf einer Einwilligung** (Art. 7 Abs. 3 DSGVO) — mit Wirkung für die Zukunft, ohne dass die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung berührt wird.",
          ],
        },
        {
          kind: "p",
          text: "Zur Ausübung Ihrer Rechte genügt eine formlose Mitteilung an foerderung@lokführerzentrum.de.",
        },
        {
          kind: "h3",
          text: "Beschwerderecht bei der Aufsichtsbehörde",
        },
        {
          kind: "p",
          text: "Unbeschadet eines anderweitigen Rechtsbehelfs steht Ihnen ein Beschwerderecht bei einer Datenschutz-Aufsichtsbehörde zu (Art. 77 DSGVO). Die für uns zuständige Aufsichtsbehörde ist in der Regel die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW), Kavalleriestraße 2–4, 40213 Düsseldorf. **[Zuständige Aufsichtsbehörde ggf. an den tatsächlichen Unternehmenssitz anpassen.]**",
        },
      ],
    },
    {
      id: "hosting-logfiles",
      title: "Bereitstellung der Website, Server-Logfiles & Hosting",
      blocks: [
        {
          kind: "p",
          text: "Bei jedem Aufruf unserer Website erfasst unser System bzw. das unseres Hosting-Dienstleisters automatisiert Daten und Informationen des zugreifenden Geräts. Diese werden temporär in Logfiles gespeichert:",
        },
        {
          kind: "list",
          items: [
            "gekürzte bzw. verarbeitete IP-Adresse des anfragenden Endgeräts,",
            "Datum und Uhrzeit des Zugriffs,",
            "aufgerufene Seite/Datei sowie übertragene Datenmenge,",
            "Referrer-URL (die zuvor besuchte Seite),",
            "verwendeter Browsertyp, Browserversion und Betriebssystem.",
          ],
        },
        {
          kind: "p",
          text: "Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt in der technischen Bereitstellung, Stabilität und Sicherheit der Website sowie in der Abwehr von Angriffen. Die Logfiles werden nach kurzer Zeit gelöscht oder anonymisiert, soweit sie nicht zu Beweiszwecken bei sicherheitsrelevanten Vorfällen benötigt werden.",
        },
        {
          kind: "h3",
          text: "Hosting / Auftragsverarbeitung",
        },
        {
          kind: "p",
          text: "Unsere Website wird bei einem spezialisierten Infrastruktur-Dienstleister betrieben (**Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA**). Der Anbieter verarbeitet die oben genannten Daten in unserem Auftrag auf Grundlage eines Auftragsverarbeitungsvertrags gemäß Art. 28 DSGVO. Soweit dabei Daten in ein Drittland (USA) übermittelt werden, erfolgt dies auf Grundlage geeigneter Garantien, insbesondere der EU-Standardvertragsklauseln (Art. 46 DSGVO) und – soweit einschlägig – einer Zertifizierung nach dem EU-US Data Privacy Framework.",
        },
        {
          kind: "note",
          title: "Auftragsverarbeiter prüfen",
          text: "Passen Sie diesen Abschnitt an Ihre tatsächlich eingesetzten Hosting- und Datenbank-/Speicheranbieter an (z. B. verwaltete Datenbank, Objektspeicher, WhatsApp-/E-Mail-Provider) und stellen Sie sicher, dass mit jedem Anbieter ein AV-Vertrag besteht.",
        },
      ],
    },
    {
      id: "cookies",
      title: "Cookies & Einwilligungsmanagement",
      blocks: [
        {
          kind: "p",
          text: "Unsere Website verwendet Cookies und vergleichbare Technologien (z. B. Local Storage). Cookies sind kleine Textdateien, die auf Ihrem Endgerät gespeichert werden. Einige sind technisch notwendig, damit die Website und Funktionen wie Formulare, der Eignungscheck oder eine Anmeldung funktionieren.",
        },
        {
          kind: "list",
          items: [
            "**Technisch notwendige Cookies** — erforderlich für den Betrieb (z. B. Session, Sicherheits-/CSRF-Token, Speicherung Ihrer Cookie-Auswahl). Rechtsgrundlage: § 25 Abs. 2 TDDDG i. V. m. Art. 6 Abs. 1 lit. f DSGVO. Diese setzen wir ohne Einwilligung.",
            "**Nicht notwendige Cookies** (z. B. Reichweitenmessung, Komfort) — nur mit Ihrer Einwilligung gemäß § 25 Abs. 1 TDDDG i. V. m. Art. 6 Abs. 1 lit. a DSGVO.",
          ],
        },
        {
          kind: "p",
          text: "Beim ersten Besuch werden Sie – soweit nicht notwendige Cookies eingesetzt werden – über einen Cookie-Hinweis informiert und können Ihre Einwilligung granular erteilen oder verweigern. Ihre Entscheidung wird gespeichert; Sie können sie jederzeit mit Wirkung für die Zukunft über die Cookie-Einstellungen ändern oder die Cookies in Ihrem Browser löschen.",
        },
      ],
    },
    {
      id: "kontakt",
      title: "Kontaktaufnahme (Formular, E-Mail, Telefon)",
      blocks: [
        {
          kind: "p",
          text: "Wenn Sie uns über ein Kontaktformular, per E-Mail oder telefonisch kontaktieren, verarbeiten wir die von Ihnen mitgeteilten Daten (z. B. Name, E-Mail-Adresse, Telefonnummer, Nachrichteninhalt) zur Bearbeitung Ihrer Anfrage und für etwaige Anschlussfragen.",
        },
        {
          kind: "p",
          text: "Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage auf den Abschluss oder die Durchführung eines Vertrags gerichtet ist, andernfalls Art. 6 Abs. 1 lit. f DSGVO (Interesse an der Beantwortung Ihrer Anfrage). Die Daten werden gelöscht, sobald die Anfrage abschließend bearbeitet ist und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.",
        },
      ],
    },
    {
      id: "eignungscheck",
      title: "Eignungscheck & Bewerbungs-Funnel",
      blocks: [
        {
          kind: "p",
          text: "Über den Eignungscheck können Sie prüfen lassen, ob Sie die Voraussetzungen für eine geförderte Weiterbildung/Umschulung zum Triebfahrzeugführer erfüllen. Dabei verarbeiten wir insbesondere:",
        },
        {
          kind: "list",
          items: [
            "Stammdaten (Vor-/Nachname, Anschrift, Geburtsdatum soweit angegeben),",
            "Kontaktdaten (E-Mail, Telefon),",
            "Angaben zur beruflichen und persönlichen Situation (z. B. Beschäftigungsstatus, Vorqualifikation, Wunschstandort),",
            "Angaben zur Förderfähigkeit (z. B. Bezug von Leistungen, vorhandener Bildungsgutschein).",
          ],
        },
        {
          kind: "h3",
          text: "Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO)",
        },
        {
          kind: "p",
          text: "Für die Beurteilung der Eignung können – soweit von Ihnen angegeben – Gesundheits- oder eignungsbezogene Angaben (z. B. gesundheitliche/psychologische Eignung, Angaben zu Sucht) erforderlich sein. Diese besonderen Kategorien verarbeiten wir ausschließlich auf Grundlage Ihrer **ausdrücklichen Einwilligung** (Art. 9 Abs. 2 lit. a DSGVO). Sensible Angaben werden getrennt und nur intern gespeichert, streng zugriffsbeschränkt behandelt und nicht für andere Zwecke verwendet. Sie können diese Einwilligung jederzeit widerrufen.",
        },
        {
          kind: "p",
          text: "Rechtsgrundlage für die übrigen Funnel-Daten ist Art. 6 Abs. 1 lit. b DSGVO (Durchführung vorvertraglicher Maßnahmen auf Ihre Anfrage) sowie – soweit Sie eingewilligt haben – Art. 6 Abs. 1 lit. a DSGVO.",
        },
      ],
    },
    {
      id: "bewerberportal",
      title: "Bewerberportal & Dokumenten-Upload",
      blocks: [
        {
          kind: "p",
          text: "Im Bewerberportal können Sie Unterlagen (z. B. Lebenslauf, Zeugnisse, Nachweise) hochladen und Ihren Bewerbungs- und Förderprozess verfolgen. Wir verarbeiten die dort von Ihnen bereitgestellten Daten und Dokumente zur Vorbereitung und Begleitung Ihrer Weiterbildung sowie zur Kommunikation mit den beteiligten Stellen.",
        },
        {
          kind: "p",
          text: "Der Zugang erfolgt über einen persönlichen Link bzw. eine Anmeldung. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. Hochgeladene Dateien werden verschlüsselt übertragen und zugriffsbeschränkt gespeichert; sie werden gelöscht, sobald der Zweck entfällt und keine gesetzlichen Aufbewahrungspflichten bestehen.",
        },
      ],
    },
    {
      id: "whatsapp",
      title: "Kommunikation über WhatsApp",
      blocks: [
        {
          kind: "p",
          text: "Sofern Sie dies wünschen und einwilligen, kommunizieren wir mit Ihnen über WhatsApp (Dienst der Meta Platforms Ireland Ltd., 4 Grand Canal Square, Dublin, Irland). Wir verarbeiten dabei Ihre Telefonnummer, Ihren Nachrichteninhalt sowie Metadaten der Kommunikation, um Ihre Anfrage zu bearbeiten, Sie über den Status zu informieren und Rückrufe zu organisieren.",
        },
        {
          kind: "p",
          text: "Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) sowie – im Rahmen einer laufenden Anfrage/Vertragsanbahnung – Art. 6 Abs. 1 lit. b DSGVO. Bei der Nutzung von WhatsApp kann es zu einer Übermittlung von Daten in Drittländer kommen; der Anbieter stützt sich hierfür auf geeignete Garantien (Standardvertragsklauseln). Sie können der Kommunikation über WhatsApp jederzeit widersprechen bzw. Ihre Einwilligung widerrufen; alternative Kontaktwege (E-Mail, Telefon) stehen jederzeit zur Verfügung.",
        },
      ],
    },
    {
      id: "email-newsletter",
      title: "E-Mail-Kommunikation & Newsletter",
      blocks: [
        {
          kind: "p",
          text: "Wir versenden transaktionale E-Mails (z. B. Bestätigungen, Statusinformationen, Rückmeldungen zu Ihrer Anfrage) auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO.",
        },
        {
          kind: "p",
          text: "Sofern Sie einen Newsletter oder werbliche Informationen abonnieren, erfolgt der Versand nur nach Ihrer Einwilligung im Double-Opt-in-Verfahren (Art. 6 Abs. 1 lit. a DSGVO). Sie können den Bezug jederzeit über den Abmeldelink in jeder E-Mail oder per Nachricht an uns beenden.",
        },
      ],
    },
    {
      id: "foerderung",
      title: "Förderung, Bildungsgutschein & Datenweitergabe an beteiligte Stellen",
      blocks: [
        {
          kind: "p",
          text: "Zur Anbahnung und Durchführung einer geförderten Weiterbildung ist es erforderlich, bestimmte Daten an beteiligte Stellen weiterzugeben, insbesondere an:",
        },
        {
          kind: "list",
          items: [
            "die zuständige **Agentur für Arbeit** bzw. das **Jobcenter** (Förderentscheidung, Bildungsgutschein),",
            "den durchführenden **Bildungsträger** / Maßnahmeträger,",
            "ggf. **kooperierende Arbeitgeber** (Eisenbahnverkehrsunternehmen) – nur mit Ihrer Einwilligung,",
            "ein ggf. eingesetztes **Partner-/CRM-System** zur Verwaltung des Bewerbungs- und Vermittlungsprozesses (als Auftragsverarbeiter oder eigenständig Verantwortlicher, je nach Konstellation).",
          ],
        },
        {
          kind: "p",
          text: "Die Weitergabe erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Durchführung des Verfahrens auf Ihre Veranlassung), Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung) bzw. – soweit erforderlich – Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Wir geben nur die für den jeweiligen Zweck erforderlichen Daten weiter.",
        },
      ],
    },
    {
      id: "auftragsverarbeiter",
      title: "Empfänger & Auftragsverarbeiter",
      blocks: [
        {
          kind: "p",
          text: "Zur Erbringung unserer Leistungen setzen wir sorgfältig ausgewählte Dienstleister ein, die personenbezogene Daten in unserem Auftrag und nach unseren Weisungen verarbeiten (Art. 28 DSGVO). Kategorien von Empfängern:",
        },
        {
          kind: "list",
          items: [
            "Hosting-, Datenbank- und Speicheranbieter (technischer Betrieb),",
            "Anbieter für Nachrichten-/Messaging-Dienste (WhatsApp Business, E-Mail-Versand),",
            "IT-Dienstleister für Wartung, Support und Sicherheit,",
            "Steuerberater/Wirtschaftsprüfer sowie Behörden im Rahmen gesetzlicher Pflichten.",
          ],
        },
        {
          kind: "p",
          text: "Eine Übermittlung in Drittländer erfolgt nur unter Beachtung der Art. 44 ff. DSGVO (z. B. Angemessenheitsbeschluss oder Standardvertragsklauseln).",
        },
      ],
    },
    {
      id: "reichweite",
      title: "Reichweitenmessung & Analyse",
      blocks: [
        {
          kind: "p",
          text: "Soweit wir Werkzeuge zur Reichweitenmessung oder Analyse einsetzen, erfolgt dies ausschließlich auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Details zu konkret eingesetzten Diensten, Zwecken, Speicherdauern und Empfängern ergänzen wir hier, sobald solche Dienste aktiv sind. **[Falls keine Analyse-Tools eingesetzt werden, kann dieser Abschnitt entfallen.]**",
        },
      ],
    },
    {
      id: "automatisiert",
      title: "Automatisierte Entscheidungen & Profiling",
      blocks: [
        {
          kind: "p",
          text: "Zur internen Priorisierung von Anfragen können wir Angaben in begrenztem Umfang automatisiert auswerten (z. B. ein Priorisierungs-/Scoring-Merkmal, um Anfragen schneller zu bearbeiten). Eine ausschließlich auf einer automatisierten Verarbeitung – einschließlich Profiling – beruhende Entscheidung mit rechtlicher Wirkung Ihnen gegenüber im Sinne des Art. 22 DSGVO findet nicht statt; über die Aufnahme und die weiteren Schritte entscheiden stets Mitarbeitende.",
        },
      ],
    },
    {
      id: "speicherdauer",
      title: "Speicherdauer",
      blocks: [
        {
          kind: "p",
          text: "Wir verarbeiten und speichern personenbezogene Daten nur so lange, wie es für die Erreichung des jeweiligen Zwecks erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen. Handels- und steuerrechtliche Aufbewahrungspflichten (z. B. §§ 257 HGB, 147 AO) können eine Aufbewahrung von 6 bis 10 Jahren erfordern. Nach Fristablauf werden die Daten gelöscht oder anonymisiert.",
        },
      ],
    },
    {
      id: "datensicherheit",
      title: "Datensicherheit",
      blocks: [
        {
          kind: "p",
          text: "Wir treffen technische und organisatorische Maßnahmen (Art. 32 DSGVO), um Ihre Daten gegen Verlust, Manipulation und unberechtigten Zugriff zu schützen. Dazu gehören eine verschlüsselte Übertragung (TLS/HTTPS), Zugriffsbeschränkungen nach dem Need-to-know-Prinzip, gehashte Speicherung von Passwörtern sowie Maßnahmen zur Missbrauchs- und Angriffsabwehr.",
        },
      ],
    },
    {
      id: "aenderungen",
      title: "Änderungen dieser Datenschutzerklärung",
      blocks: [
        {
          kind: "p",
          text: "Wir passen diese Datenschutzerklärung an, sobald Änderungen der von uns durchgeführten Datenverarbeitung dies erforderlich machen oder sich die Rechtslage ändert. Es gilt jeweils die auf dieser Seite veröffentlichte, aktuelle Fassung.",
        },
        {
          kind: "p",
          text: "**Stand dieser Datenschutzerklärung: " + UPDATED + ".**",
        },
      ],
    },
  ],
};

export default function DatenschutzPage() {
  const crumbs: Crumb[] = [
    { name: "Start", path: "/" },
    { name: "Datenschutz", path: PATH },
  ];

  return (
    <KnowledgeShell activePath={PATH} showTrust={false}>
      <div className="mx-auto max-w-3xl">
        <ArticleHero
          crumbs={crumbs}
          eyebrow="Rechtliches"
          title="Datenschutzerklärung"
          lede="Transparente Informationen nach DSGVO, BDSG und TDDDG: Welche personenbezogenen Daten wir verarbeiten, zu welchen Zwecken, auf welcher Rechtsgrundlage – und welche Rechte Ihnen zustehen."
          updated={UPDATED}
        />
        <LegalDocument data={DOC} />
      </div>

      <JsonLd data={[breadcrumbSchema(crumbs)]} />
    </KnowledgeShell>
  );
}
