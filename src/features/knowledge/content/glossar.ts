/**
 * Glossary / encyclopedia entities for the German railway labour market.
 *
 * Each entry is answer-first (the `short` field is a self-contained, citable
 * definition) and carries entity-linking references (`sameAs`) plus internal
 * relations (`related`) so the knowledge graph is navigable for users and LLMs.
 * Facts are kept conservative and verifiable; figures live in dedicated data
 * pages, not here.
 */
import type { GlossaryTerm } from "../types";

import { GLOSSARY_EXTENDED } from "./glossarExtended";

const GLOSSARY_CORE: ReadonlyArray<GlossaryTerm> = [
  {
    slug: "triebfahrzeugfuehrer",
    term: "Triebfahrzeugführer",
    abbr: "Tf",
    category: "Beruf",
    short:
      "Ein Triebfahrzeugführer (umgangssprachlich Lokführer) steuert Triebfahrzeuge im Eisenbahnverkehr und ist sicherheitsverantwortlich für Zug, Fahrgäste oder Ladung.",
    body: [
      "Der Triebfahrzeugführer – im Alltag meist Lokführer genannt – führt Triebfahrzeuge im Personen-, Güter-, Rangier- oder Werkverkehr. Die Tätigkeit ist sicherheitsrelevant und unterliegt der Triebfahrzeugführerscheinverordnung (TfV).",
      "Voraussetzung sind ein gültiger Triebfahrzeugführerschein, eine bestandene medizinische Tauglichkeits- sowie psychologische Eignungsuntersuchung und ausreichende Deutschkenntnisse. Der Einstieg ist klassisch über eine Ausbildung, sehr häufig aber auch über eine geförderte Umschulung im Quereinstieg möglich.",
      "Aufgrund von Altersstruktur und steigendem Verkehrsaufkommen besteht in Deutschland ein anhaltender Fachkräftebedarf, was den Beruf für Quereinsteiger besonders attraktiv macht.",
    ],
    synonyms: ["Lokführer", "Lokomotivführer", "Lokfahrer", "Tf"],
    sameAs: ["https://de.wikipedia.org/wiki/Triebfahrzeugf%C3%BChrer"],
    related: ["tfv", "quereinstieg", "tauglichkeitsuntersuchung", "umschulung"],
  },
  {
    slug: "tfv",
    term: "Triebfahrzeugführerschein",
    abbr: "TfV",
    category: "Qualifikation",
    short:
      "Der Triebfahrzeugführerschein ist die gesetzlich vorgeschriebene Fahrerlaubnis für Triebfahrzeugführer, geregelt in der Triebfahrzeugführerscheinverordnung (TfV).",
    body: [
      "Der Triebfahrzeugführerschein wird auf Basis der Triebfahrzeugführerscheinverordnung (TfV) erteilt und bestätigt die grundsätzliche Befähigung, Triebfahrzeuge zu führen. Er ist EU-weit anerkannt.",
      "Zusätzlich zum Führerschein benötigen Triebfahrzeugführer eine Zusatzbescheinigung, die die konkreten Fahrzeuge und Strecken (Fahrzeug- und Streckenkunde) ausweist. Beides zusammen ist Voraussetzung für den eigenverantwortlichen Einsatz.",
      "Die Erteilung setzt eine bestandene theoretische und praktische Prüfung sowie den Nachweis der gesundheitlichen und psychologischen Eignung voraus.",
    ],
    synonyms: ["Lokführerschein", "EU-Triebfahrzeugführerschein"],
    sameAs: ["https://de.wikipedia.org/wiki/Triebfahrzeugf%C3%BChrerschein"],
    related: ["triebfahrzeugfuehrer", "eba", "tauglichkeitsuntersuchung"],
  },
  {
    slug: "pzb",
    term: "Punktförmige Zugbeeinflussung",
    abbr: "PZB",
    category: "Technik",
    short:
      "Die PZB ist ein Zugbeeinflussungssystem, das an einzelnen Punkten der Strecke prüft, ob der Triebfahrzeugführer Signale korrekt beachtet, und im Ernstfall automatisch bremst.",
    body: [
      "Die punktförmige Zugbeeinflussung (PZB, auch Indusi) überwacht an definierten Gleismagneten, ob ein Zug Halt zeigende oder geschwindigkeitsbeschränkende Signale beachtet. Reagiert der Triebfahrzeugführer nicht, leitet das System eine Zwangsbremsung ein.",
      "PZB ist auf einem Großteil des deutschen Schienennetzes Standard und damit fester Bestandteil der Ausbildung. Sie ergänzt die Verantwortung des Triebfahrzeugführers um eine technische Sicherungsebene.",
    ],
    synonyms: ["Indusi", "Induktive Zugsicherung"],
    sameAs: ["https://de.wikipedia.org/wiki/Punktf%C3%B6rmige_Zugbeeinflussung"],
    related: ["lzb", "etcs", "triebfahrzeugfuehrer"],
  },
  {
    slug: "lzb",
    term: "Linienförmige Zugbeeinflussung",
    abbr: "LZB",
    category: "Technik",
    short:
      "Die LZB ist ein kontinuierliches Zugbeeinflussungssystem, das Hochgeschwindigkeits- und dicht befahrene Strecken durchgehend überwacht und Führerstandssignalisierung ermöglicht.",
    body: [
      "Die linienförmige Zugbeeinflussung (LZB) überträgt – anders als die punktförmige PZB – kontinuierlich Informationen zwischen Strecke und Fahrzeug. Dadurch sind höhere Geschwindigkeiten und kürzere Zugfolgen sicher möglich.",
      "Die LZB ermöglicht Führerstandssignalisierung, bei der Sollgeschwindigkeit und Fahrvorgaben direkt im Führerstand angezeigt werden. Sie gilt technisch als Vorläufer und wird sukzessive durch ETCS abgelöst.",
    ],
    synonyms: ["Linienzugbeeinflussung"],
    sameAs: ["https://de.wikipedia.org/wiki/Linienzugbeeinflussung"],
    related: ["pzb", "etcs"],
  },
  {
    slug: "etcs",
    term: "European Train Control System",
    abbr: "ETCS",
    category: "Technik",
    short:
      "ETCS ist das europaweit einheitliche Zugbeeinflussungs- und Signalsystem und das Herzstück der digitalen Schiene; es löst nationale Systeme wie PZB und LZB schrittweise ab.",
    body: [
      "Das European Train Control System (ETCS) ist Teil des European Rail Traffic Management System (ERTMS) und schafft eine einheitliche, grenzüberschreitende Zugsicherung in Europa.",
      "ETCS wird in mehreren Ausbaustufen (Level 1 und 2, perspektivisch höhere Stufen) eingeführt. Mit der Digitalisierung des Schienennetzes gewinnt ETCS-Kompetenz in Ausbildung und Weiterbildung von Triebfahrzeugführern stark an Bedeutung.",
    ],
    synonyms: ["ERTMS", "Europäisches Zugbeeinflussungssystem"],
    sameAs: ["https://de.wikipedia.org/wiki/European_Train_Control_System"],
    related: ["pzb", "lzb", "triebfahrzeugfuehrer"],
  },
  {
    slug: "bildungsgutschein",
    term: "Bildungsgutschein",
    category: "Förderung",
    short:
      "Ein Bildungsgutschein ist eine Förderzusage der Agentur für Arbeit oder des Jobcenters, mit der die Kosten einer zertifizierten Weiterbildung – etwa zur Umschulung zum Lokführer – übernommen werden können.",
    body: [
      "Der Bildungsgutschein ist ein Instrument der Förderung der beruflichen Weiterbildung nach dem Sozialgesetzbuch (SGB III). Er kann die Lehrgangskosten einer nach AZAV zugelassenen Maßnahme vollständig übernehmen.",
      "Über die Ausgabe entscheidet ausschließlich die Agentur für Arbeit bzw. das Jobcenter auf Basis der individuellen Situation. Eine Bewilligung kann niemand garantieren – eine gute Vorbereitung der Unterlagen erhöht jedoch die Chancen erheblich.",
      "Sowohl Arbeitssuchende als auch Beschäftigte können – je nach Förderweg – in Frage kommen. Welcher Weg passt, lässt sich im Eignungscheck unverbindlich klären.",
    ],
    synonyms: ["Bildungsgutschein Agentur für Arbeit", "AZAV-Förderung"],
    sameAs: ["https://de.wikipedia.org/wiki/Bildungsgutschein"],
    related: ["umschulung", "eba", "quereinstieg"],
  },
  {
    slug: "quereinstieg",
    term: "Quereinstieg Lokführer",
    category: "Karriere",
    short:
      "Quereinstieg bezeichnet den Wechsel in den Lokführerberuf aus einem anderen Beruf – in der Regel über eine rund 12- bis 15-monatige Umschulung, häufig gefördert durch einen Bildungsgutschein.",
    body: [
      "Der Lokführerberuf ist einer der bekanntesten Quereinstiegsberufe in Deutschland: Eine klassische dreijährige Erstausbildung ist nicht zwingend nötig, da Umschulungen gezielt auf die Tätigkeit vorbereiten.",
      "Entscheidend sind persönliche und gesundheitliche Eignung, nicht der ursprüngliche Beruf. Viele erfolgreiche Triebfahrzeugführer kommen aus Handwerk, Logistik, Produktion oder dem kaufmännischen Bereich.",
      "Die Umschulung dauert in Vollzeit üblicherweise rund 12 bis 15 Monate und schließt mit der Triebfahrzeugführerschein-Prüfung ab.",
    ],
    synonyms: ["Quereinsteiger Lokführer", "Seiteneinstieg Lokführer"],
    related: ["umschulung", "triebfahrzeugfuehrer", "bildungsgutschein"],
  },
  {
    slug: "umschulung",
    term: "Umschulung zum Lokführer",
    category: "Qualifikation",
    short:
      "Eine Umschulung zum Lokführer ist eine verkürzte, berufsbegleitend oder in Vollzeit absolvierte Qualifizierung (rund 12–15 Monate), die Quereinsteiger zum geprüften Triebfahrzeugführer ausbildet.",
    body: [
      "Die Umschulung vermittelt in komprimierter Form die Inhalte, die zum Bestehen der Triebfahrzeugführerschein-Prüfung und für den sicheren Betrieb nötig sind: Fahrzeug- und Streckenkunde, Signal- und Sicherungstechnik (PZB/LZB/ETCS), Betriebsvorschriften sowie praktische Fahrausbildung.",
      "Sie findet bei nach AZAV zugelassenen Bildungsträgern statt und ist damit grundsätzlich über den Bildungsgutschein förderfähig. In Vollzeit dauert sie üblicherweise rund 12 bis 15 Monate, davon ein erheblicher Praxisanteil.",
    ],
    synonyms: ["Lokführer Umschulung", "Weiterbildung Triebfahrzeugführer"],
    related: ["quereinstieg", "bildungsgutschein", "tfv"],
  },
  {
    slug: "eba",
    term: "Eisenbahn-Bundesamt",
    abbr: "EBA",
    category: "Behörde",
    short:
      "Das Eisenbahn-Bundesamt ist die Aufsichts- und Genehmigungsbehörde für die Eisenbahnen des Bundes in Deutschland und zuständig für sicherheitsrelevante Regelungen rund um den Bahnbetrieb.",
    body: [
      "Das Eisenbahn-Bundesamt (EBA) ist als Bundesoberbehörde unter anderem für Sicherheit, Aufsicht und bestimmte Zulassungen im deutschen Eisenbahnwesen zuständig.",
      "Für angehende Triebfahrzeugführer ist das EBA vor allem als regelsetzende und überwachende Instanz relevant, etwa im Zusammenhang mit den Anforderungen an Führerscheine, Tauglichkeit und Ausbildung.",
    ],
    synonyms: ["EBA"],
    sameAs: ["https://de.wikipedia.org/wiki/Eisenbahn-Bundesamt"],
    related: ["tfv", "tauglichkeitsuntersuchung"],
  },
  {
    slug: "tauglichkeitsuntersuchung",
    term: "Medizinische & psychologische Eignung",
    category: "Qualifikation",
    short:
      "Vor der Tätigkeit als Triebfahrzeugführer sind eine medizinische Tauglichkeitsuntersuchung und eine psychologische Eignungsuntersuchung verpflichtend, um die sicherheitsrelevante Belastbarkeit nachzuweisen.",
    body: [
      "Die medizinische Untersuchung prüft unter anderem Seh- und Hörvermögen, allgemeine Gesundheit und Belastbarkeit. Die psychologische Eignungsuntersuchung bewertet Konzentration, Reaktionsfähigkeit, Aufmerksamkeit und Stressresistenz.",
      "Beide Untersuchungen sind sicherheitsrelevant und damit feste Voraussetzung für Ausbildung und Berufsausübung. Eine ehrliche Selbsteinschätzung im Vorfeld – etwa im Eignungscheck – hilft, den richtigen Weg einzuschätzen.",
    ],
    synonyms: ["Tauglichkeitsuntersuchung", "psychologischer Eignungstest Lokführer"],
    related: ["triebfahrzeugfuehrer", "tfv", "eba"],
  },
];

/**
 * Full glossary = curated core entities + the extended railway entity set.
 * De-duplicated by slug (core wins) so cross-references stay stable.
 */
export const GLOSSARY: ReadonlyArray<GlossaryTerm> = (() => {
  const seen = new Set(GLOSSARY_CORE.map((t) => t.slug));
  const merged = [...GLOSSARY_CORE];
  for (const term of GLOSSARY_EXTENDED) {
    if (!seen.has(term.slug)) {
      seen.add(term.slug);
      merged.push(term);
    }
  }
  return merged;
})();

/** Look up a single glossary term by slug. */
export function getGlossaryTerm(slug: string): GlossaryTerm | undefined {
  return GLOSSARY.find((t) => t.slug === slug);
}

/** Resolve related terms (existing slugs only) for a given term. */
export function relatedTerms(term: GlossaryTerm): GlossaryTerm[] {
  return (term.related ?? [])
    .map((slug) => GLOSSARY.find((t) => t.slug === slug))
    .filter((t): t is GlossaryTerm => Boolean(t));
}
