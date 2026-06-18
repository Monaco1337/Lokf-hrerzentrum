/**
 * Priority-city hub dataset.
 *
 * Each city carries localised content for the five required angles (Lokführer
 * werden, Umschulung, Bildungsgutschein, Arbeitgeber, Gehalt) referencing the
 * concrete local hubs and operating employers — not a templated mass page.
 */
import type { CityData } from "../types";

const BG_LOCAL = (city: string): string[] => [
  `Die Förderung der Umschulung über den Bildungsgutschein läuft in ${city} über die örtliche Agentur für Arbeit bzw. das Jobcenter. Die Entscheidung ist individuell — eine vollständige Unterlagenmappe erhöht die Chancen.`,
];

const GEHALT_LOCAL = (region: string): string[] => [
  `Das Gehalt orientiert sich an den bundesweiten Tarif- und Marktspannen; in ${region} wirken sich vor allem Arbeitgeber, Verkehrsart und Zulagen aus. Konkrete Werte im Gehaltsatlas.`,
];

export const CITIES: ReadonlyArray<CityData> = [
  {
    slug: "berlin",
    name: "Berlin",
    bundeslandSlug: "berlin",
    bundeslandName: "Berlin",
    intro: [
      "Berlin ist einer der größten Eisenbahnknoten Deutschlands — mit eigenständiger S-Bahn, dichtem Regionalverkehr und zentralem Fernverkehr.",
      "Für angehende Lokführer bedeutet das viele Arbeitgeber und einen anhaltend hohen Personalbedarf direkt vor Ort.",
    ],
    lokfuehrerWerden: [
      "In Berlin starten viele über eine Umschulung in den Beruf, da der Bedarf hoch und das Streckennetz dicht ist.",
    ],
    umschulung: [
      "Umschulungen werden bei nach AZAV zugelassenen Bildungsträgern im Berliner Raum angeboten und sind über den Bildungsgutschein förderfähig.",
    ],
    bildungsgutschein: BG_LOCAL("Berlin"),
    gehalt: GEHALT_LOCAL("Berlin"),
    employerSlugs: ["deutsche-bahn", "db-regio", "db-fernverkehr", "odeg"],
    keyFacts: [
      { label: "Bundesland", value: "Berlin" },
      { label: "Netz", value: "S-Bahn + Regio" },
      { label: "Bedarf", value: "sehr hoch" },
      { label: "Arbeitgeber", value: "DB, ODEG u. a." },
    ],
    faq: [
      {
        question: "Wo kann ich in Berlin die Umschulung machen?",
        answer:
          "Bei AZAV-zugelassenen Bildungsträgern im Berliner Raum; die Förderung läuft über die örtliche Agentur für Arbeit bzw. das Jobcenter.",
      },
    ],
  },
  {
    slug: "hamburg",
    name: "Hamburg",
    bundeslandSlug: "hamburg",
    bundeslandName: "Hamburg",
    intro: [
      "Hamburg verbindet dichten S-Bahn- und Regionalverkehr mit starkem Fern- und Hafen-Güterverkehr.",
      "Die Vielfalt der Verkehrsarten schafft besonders breite Einstiegsmöglichkeiten.",
    ],
    lokfuehrerWerden: [
      "Durch Hafen-, Nah- und Fernverkehr gibt es in Hamburg verschiedene Einstiegswege — vom Regionalverkehr bis zum Güterverkehr.",
    ],
    umschulung: [
      "Zugelassene Bildungsträger im Hamburger Raum bieten Umschulungen an, die über den Bildungsgutschein gefördert werden können.",
    ],
    bildungsgutschein: BG_LOCAL("Hamburg"),
    gehalt: GEHALT_LOCAL("Hamburg"),
    employerSlugs: ["deutsche-bahn", "db-regio", "db-fernverkehr", "metronom"],
    keyFacts: [
      { label: "Bundesland", value: "Hamburg" },
      { label: "Profil", value: "Hafen + Knoten" },
      { label: "Verkehr", value: "alle" },
      { label: "Arbeitgeber", value: "DB, metronom u. a." },
    ],
    faq: [
      {
        question: "Welche Verkehrsarten gibt es in Hamburg?",
        answer: "Nahverkehr (S-Bahn/Regio), Fernverkehr und ein großer Hafen-Güterverkehr.",
      },
    ],
  },
  {
    slug: "muenchen",
    name: "München",
    bundeslandSlug: "bayern",
    bundeslandName: "Bayern",
    intro: [
      "München ist der zentrale Verkehrsknoten Bayerns mit einem der meistgenutzten S-Bahn-Systeme Deutschlands.",
      "Der Personalbedarf im Nah- und Fernverkehr ist hoch.",
    ],
    lokfuehrerWerden: [
      "In München führt der Einstieg häufig über den Nahverkehr (S-Bahn/Regio), zunehmend über Umschulungen.",
    ],
    umschulung: [
      "Umschulungen werden bei zugelassenen Trägern im Großraum München angeboten und sind förderfähig.",
    ],
    bildungsgutschein: BG_LOCAL("München"),
    gehalt: GEHALT_LOCAL("Bayern"),
    employerSlugs: ["deutsche-bahn", "db-regio", "db-fernverkehr"],
    keyFacts: [
      { label: "Bundesland", value: "Bayern" },
      { label: "Netz", value: "S-Bahn München" },
      { label: "Verkehr", value: "Nah + Fern" },
      { label: "Bedarf", value: "hoch" },
    ],
    faq: [
      {
        question: "Wie steige ich in München in den Beruf ein?",
        answer: "Meist über den Nahverkehr (S-Bahn/Regio), häufig im Rahmen einer geförderten Umschulung.",
      },
    ],
  },
  {
    slug: "koeln",
    name: "Köln",
    bundeslandSlug: "nordrhein-westfalen",
    bundeslandName: "Nordrhein-Westfalen",
    intro: [
      "Köln ist ein zentraler Knoten im dichten Rhein-Ruhr-Netz mit Nah-, Fern- und Güterverkehr.",
      "Die Nähe zu den Rheinhäfen sorgt zusätzlich für starken Güterverkehr.",
    ],
    lokfuehrerWerden: [
      "In Köln gibt es durch die Liniendichte und mehrere Arbeitgeber viele Einstiegsmöglichkeiten.",
    ],
    umschulung: [
      "Zugelassene Bildungsträger im Großraum Köln bieten Umschulungen an, die förderfähig sind.",
    ],
    bildungsgutschein: BG_LOCAL("Köln"),
    gehalt: GEHALT_LOCAL("Nordrhein-Westfalen"),
    employerSlugs: ["deutsche-bahn", "db-regio", "national-express", "rheincargo"],
    keyFacts: [
      { label: "Bundesland", value: "NRW" },
      { label: "Raum", value: "Rhein-Ruhr" },
      { label: "Verkehr", value: "alle" },
      { label: "Arbeitgeber", value: "DB, NX, RheinCargo" },
    ],
    faq: [
      {
        question: "Welche Arbeitgeber gibt es in Köln?",
        answer: "Unter anderem die DB, National Express und im Güterverkehr RheinCargo.",
      },
    ],
  },
  {
    slug: "frankfurt",
    name: "Frankfurt am Main",
    bundeslandSlug: "hessen",
    bundeslandName: "Hessen",
    intro: [
      "Frankfurt ist eines der wichtigsten Eisenbahn-Drehkreuze Europas mit dichtem S-Bahn-, Fern- und Güterverkehr.",
      "Der Knoten bündelt besonders viele Verkehrsarten auf engem Raum.",
    ],
    lokfuehrerWerden: [
      "Durch das Drehkreuz Frankfurt sind sehr unterschiedliche Einsätze möglich — vom S-Bahn-Verkehr bis zum Fernverkehr.",
    ],
    umschulung: [
      "Im Rhein-Main-Raum bieten zugelassene Träger Umschulungen an, die über den Bildungsgutschein förderfähig sind.",
    ],
    bildungsgutschein: BG_LOCAL("Frankfurt"),
    gehalt: GEHALT_LOCAL("Hessen"),
    employerSlugs: ["deutsche-bahn", "db-regio", "db-fernverkehr", "vlexx"],
    keyFacts: [
      { label: "Bundesland", value: "Hessen" },
      { label: "Profil", value: "Drehkreuz" },
      { label: "Verkehr", value: "alle" },
      { label: "Bedeutung", value: "europäisch" },
    ],
    faq: [
      {
        question: "Warum ist Frankfurt für Lokführer interessant?",
        answer: "Weil der Knoten Nah-, Fern- und Güterverkehr bündelt und dadurch vielfältige Einsätze bietet.",
      },
    ],
  },
  {
    slug: "stuttgart",
    name: "Stuttgart",
    bundeslandSlug: "baden-wuerttemberg",
    bundeslandName: "Baden-Württemberg",
    intro: [
      "Stuttgart ist der zentrale Knoten Baden-Württembergs mit S-Bahn und Fernverkehr.",
      "Umfangreiche Infrastrukturprojekte unterstreichen die Bedeutung des Standorts.",
    ],
    lokfuehrerWerden: ["In Stuttgart führt der Einstieg häufig über den S-Bahn- und Regionalverkehr."],
    umschulung: ["Zugelassene Träger im Großraum Stuttgart bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Stuttgart"),
    gehalt: GEHALT_LOCAL("Baden-Württemberg"),
    employerSlugs: ["deutsche-bahn", "db-regio", "db-fernverkehr"],
    keyFacts: [
      { label: "Bundesland", value: "BW" },
      { label: "Netz", value: "S-Bahn Stuttgart" },
      { label: "Verkehr", value: "Nah + Fern" },
      { label: "Bedarf", value: "hoch" },
    ],
    faq: [
      {
        question: "Welcher Verkehr prägt Stuttgart?",
        answer: "Vor allem der S-Bahn- und Regionalverkehr im Ballungsraum sowie der Fernverkehr.",
      },
    ],
  },
  {
    slug: "duesseldorf",
    name: "Düsseldorf",
    bundeslandSlug: "nordrhein-westfalen",
    bundeslandName: "Nordrhein-Westfalen",
    intro: [
      "Die Landeshauptstadt Düsseldorf ist Teil des dichten Rhein-Ruhr-Netzes mit starkem Nah- und Güterverkehr.",
    ],
    lokfuehrerWerden: ["Die Liniendichte im Rhein-Ruhr-Raum bietet in Düsseldorf viele Einstiegsmöglichkeiten."],
    umschulung: ["Zugelassene Träger im Großraum Düsseldorf bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Düsseldorf"),
    gehalt: GEHALT_LOCAL("Nordrhein-Westfalen"),
    employerSlugs: ["deutsche-bahn", "db-regio", "national-express", "rheincargo"],
    keyFacts: [
      { label: "Bundesland", value: "NRW" },
      { label: "Raum", value: "Rhein-Ruhr" },
      { label: "Verkehr", value: "Nah + Güter" },
      { label: "Arbeitgeber", value: "DB, NX u. a." },
    ],
    faq: [
      {
        question: "Ist Düsseldorf gut für den Einstieg?",
        answer: "Ja, die dichte Liniendichte und mehrere Arbeitgeber bieten viele Möglichkeiten.",
      },
    ],
  },
  {
    slug: "dortmund",
    name: "Dortmund",
    bundeslandSlug: "nordrhein-westfalen",
    bundeslandName: "Nordrhein-Westfalen",
    intro: [
      "Dortmund ist ein wichtiger Knoten im östlichen Ruhrgebiet mit dichtem Nah- und Güterverkehr.",
    ],
    lokfuehrerWerden: ["Im Ruhrgebiet ist der Personalbedarf hoch; Dortmund bietet viele Einstiegswege."],
    umschulung: ["Zugelassene Träger im Ruhrgebiet bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Dortmund"),
    gehalt: GEHALT_LOCAL("Nordrhein-Westfalen"),
    employerSlugs: ["deutsche-bahn", "db-regio", "eurobahn", "national-express"],
    keyFacts: [
      { label: "Bundesland", value: "NRW" },
      { label: "Raum", value: "Ruhrgebiet" },
      { label: "Verkehr", value: "Nah + Güter" },
      { label: "Arbeitgeber", value: "DB, eurobahn u. a." },
    ],
    faq: [
      {
        question: "Welche Arbeitgeber gibt es in Dortmund?",
        answer: "Neben der DB sind u. a. eurobahn und National Express im Ruhrgebiet aktiv.",
      },
    ],
  },
  {
    slug: "essen",
    name: "Essen",
    bundeslandSlug: "nordrhein-westfalen",
    bundeslandName: "Nordrhein-Westfalen",
    intro: ["Essen liegt im Herzen des Ruhrgebiets mit sehr dichtem Nahverkehr und Güterverkehrsachsen."],
    lokfuehrerWerden: ["Die zentrale Lage im Ruhrgebiet bietet in Essen viele Einsatzmöglichkeiten."],
    umschulung: ["Zugelassene Träger im Ruhrgebiet bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Essen"),
    gehalt: GEHALT_LOCAL("Nordrhein-Westfalen"),
    employerSlugs: ["deutsche-bahn", "db-regio", "eurobahn", "national-express"],
    keyFacts: [
      { label: "Bundesland", value: "NRW" },
      { label: "Raum", value: "Ruhrgebiet" },
      { label: "Verkehr", value: "Nah + Güter" },
      { label: "Bedarf", value: "hoch" },
    ],
    faq: [
      {
        question: "Wie ist die Lage in Essen?",
        answer: "Zentral im Ruhrgebiet mit dichtem Nahverkehr und nahen Güterverkehrsachsen.",
      },
    ],
  },
  {
    slug: "leipzig",
    name: "Leipzig",
    bundeslandSlug: "sachsen",
    bundeslandName: "Sachsen",
    intro: [
      "Leipzig ist ein wachsender Verkehrsknoten in Mitteldeutschland mit S-Bahn (Mitteldeutschland) und starkem Logistikumfeld.",
    ],
    lokfuehrerWerden: ["Das wachsende Verkehrsaufkommen schafft in Leipzig zunehmend Einstiegsmöglichkeiten."],
    umschulung: ["Zugelassene Träger im Raum Leipzig bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Leipzig"),
    gehalt: GEHALT_LOCAL("Sachsen"),
    employerSlugs: ["deutsche-bahn", "db-regio", "odeg"],
    keyFacts: [
      { label: "Bundesland", value: "Sachsen" },
      { label: "Netz", value: "S-Bahn Mitteldt." },
      { label: "Umfeld", value: "Logistik" },
      { label: "Trend", value: "wachsend" },
    ],
    faq: [
      {
        question: "Wie entwickelt sich Leipzig?",
        answer: "Leipzig wächst als Verkehrs- und Logistikstandort, was den Personalbedarf erhöht.",
      },
    ],
  },
  {
    slug: "dresden",
    name: "Dresden",
    bundeslandSlug: "sachsen",
    bundeslandName: "Sachsen",
    intro: ["Dresden ist ein zentraler Knoten im Osten Sachsens mit S-Bahn und Regionalverkehr."],
    lokfuehrerWerden: ["In Dresden führt der Einstieg häufig über den Nah- und S-Bahn-Verkehr."],
    umschulung: ["Zugelassene Träger im Raum Dresden bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Dresden"),
    gehalt: GEHALT_LOCAL("Sachsen"),
    employerSlugs: ["deutsche-bahn", "db-regio", "odeg"],
    keyFacts: [
      { label: "Bundesland", value: "Sachsen" },
      { label: "Netz", value: "S-Bahn Dresden" },
      { label: "Anbieter", value: "DB + ODEG" },
      { label: "Verkehr", value: "Nahverkehr" },
    ],
    faq: [
      {
        question: "Wer fährt Nahverkehr in Dresden?",
        answer: "Neben der DB ist die ODEG im Großraum Dresden aktiv.",
      },
    ],
  },
  {
    slug: "hannover",
    name: "Hannover",
    bundeslandSlug: "niedersachsen",
    bundeslandName: "Niedersachsen",
    intro: [
      "Hannover ist der zentrale Knoten Niedersachsens mit S-Bahn, Regional- und Fernverkehr.",
      "metronom und eurobahn ergänzen das Angebot der DB.",
    ],
    lokfuehrerWerden: ["Der Knoten Hannover bietet vielfältige Einstiegsmöglichkeiten in den Nahverkehr."],
    umschulung: ["Zugelassene Träger im Raum Hannover bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Hannover"),
    gehalt: GEHALT_LOCAL("Niedersachsen"),
    employerSlugs: ["deutsche-bahn", "db-regio", "metronom", "eurobahn"],
    keyFacts: [
      { label: "Bundesland", value: "Niedersachsen" },
      { label: "Profil", value: "Knoten" },
      { label: "Anbieter", value: "DB, metronom" },
      { label: "Verkehr", value: "Nah + Fern" },
    ],
    faq: [
      {
        question: "Welche Arbeitgeber gibt es in Hannover?",
        answer: "Neben der DB sind u. a. metronom und eurobahn im Großraum Hannover aktiv.",
      },
    ],
  },
  {
    slug: "nuernberg",
    name: "Nürnberg",
    bundeslandSlug: "bayern",
    bundeslandName: "Bayern",
    intro: ["Nürnberg ist der zweite große Knoten Bayerns mit eigenem S-Bahn-System und Fernverkehr."],
    lokfuehrerWerden: ["In Nürnberg führt der Einstieg häufig über den S-Bahn- und Regionalverkehr."],
    umschulung: ["Zugelassene Träger im Raum Nürnberg bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Nürnberg"),
    gehalt: GEHALT_LOCAL("Bayern"),
    employerSlugs: ["deutsche-bahn", "db-regio", "db-fernverkehr"],
    keyFacts: [
      { label: "Bundesland", value: "Bayern" },
      { label: "Netz", value: "S-Bahn Nürnberg" },
      { label: "Verkehr", value: "Nah + Fern" },
      { label: "Bedarf", value: "hoch" },
    ],
    faq: [
      {
        question: "Hat Nürnberg eine eigene S-Bahn?",
        answer: "Ja, Nürnberg verfügt über ein eigenes S-Bahn-System mit Regional- und Fernverkehrsanbindung.",
      },
    ],
  },
  {
    slug: "bremen",
    name: "Bremen",
    bundeslandSlug: "bremen",
    bundeslandName: "Bremen",
    intro: [
      "Bremen ist ein bedeutender Hafen- und Logistikstandort mit starkem Güterverkehr und Regionalanbindung.",
    ],
    lokfuehrerWerden: ["Durch Hafen- und Regionalverkehr gibt es in Bremen verschiedene Einstiegswege."],
    umschulung: ["Zugelassene Träger im Raum Bremen bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Bremen"),
    gehalt: GEHALT_LOCAL("Bremen"),
    employerSlugs: ["deutsche-bahn", "db-regio", "metronom"],
    keyFacts: [
      { label: "Bundesland", value: "Bremen" },
      { label: "Profil", value: "Hafen/Logistik" },
      { label: "Verkehr", value: "Nah + Güter" },
      { label: "Anbieter", value: "DB, metronom" },
    ],
    faq: [
      {
        question: "Wofür ist Bremen bekannt?",
        answer: "Für seinen Hafen- und Logistikstandort mit starkem Güterverkehr und guter Regionalanbindung.",
      },
    ],
  },
  {
    slug: "bochum",
    name: "Bochum",
    bundeslandSlug: "nordrhein-westfalen",
    bundeslandName: "Nordrhein-Westfalen",
    intro: ["Bochum liegt zentral im Ruhrgebiet mit dichtem Nahverkehr und kurzen Wegen zu vielen Arbeitgebern."],
    lokfuehrerWerden: ["Die zentrale Ruhrgebietslage bietet in Bochum viele Einsatzmöglichkeiten."],
    umschulung: ["Zugelassene Träger im Ruhrgebiet bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Bochum"),
    gehalt: GEHALT_LOCAL("Nordrhein-Westfalen"),
    employerSlugs: ["deutsche-bahn", "db-regio", "eurobahn"],
    keyFacts: [
      { label: "Bundesland", value: "NRW" },
      { label: "Raum", value: "Ruhrgebiet" },
      { label: "Verkehr", value: "Nahverkehr" },
      { label: "Wege", value: "kurz" },
    ],
    faq: [
      {
        question: "Warum ist Bochum praktisch?",
        answer: "Durch die zentrale Lage im Ruhrgebiet sind die Wege zu vielen Betriebsstandorten kurz.",
      },
    ],
  },
  {
    slug: "duisburg",
    name: "Duisburg",
    bundeslandSlug: "nordrhein-westfalen",
    bundeslandName: "Nordrhein-Westfalen",
    intro: [
      "Duisburg ist ein zentraler Güterverkehrs- und Hafenstandort (größter Binnenhafen Europas) mit starkem Schienengüterverkehr.",
    ],
    lokfuehrerWerden: ["Der starke Güterverkehr macht Duisburg besonders für den Einstieg im Güterbereich interessant."],
    umschulung: ["Zugelassene Träger im Ruhrgebiet bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Duisburg"),
    gehalt: GEHALT_LOCAL("Nordrhein-Westfalen"),
    employerSlugs: ["deutsche-bahn", "db-cargo", "rheincargo", "db-regio"],
    keyFacts: [
      { label: "Bundesland", value: "NRW" },
      { label: "Profil", value: "Binnenhafen" },
      { label: "Verkehr", value: "Güter stark" },
      { label: "Arbeitgeber", value: "DB Cargo, RheinCargo" },
    ],
    faq: [
      {
        question: "Wofür ist Duisburg im Bahnverkehr wichtig?",
        answer: "Für den Schienengüterverkehr rund um den größten Binnenhafen Europas.",
      },
    ],
  },
  {
    slug: "bonn",
    name: "Bonn",
    bundeslandSlug: "nordrhein-westfalen",
    bundeslandName: "Nordrhein-Westfalen",
    intro: ["Bonn liegt an der stark befahrenen Rheinschiene mit guter Anbindung an Köln und den Regionalverkehr."],
    lokfuehrerWerden: ["Die Nähe zum Knoten Köln bietet in Bonn gute Einstiegsmöglichkeiten im Nahverkehr."],
    umschulung: ["Zugelassene Träger im Großraum Köln/Bonn bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Bonn"),
    gehalt: GEHALT_LOCAL("Nordrhein-Westfalen"),
    employerSlugs: ["deutsche-bahn", "db-regio", "national-express"],
    keyFacts: [
      { label: "Bundesland", value: "NRW" },
      { label: "Lage", value: "Rheinschiene" },
      { label: "Bezug", value: "Köln" },
      { label: "Verkehr", value: "Nahverkehr" },
    ],
    faq: [
      {
        question: "Wie ist Bonn angebunden?",
        answer: "Bonn liegt an der Rheinschiene mit enger Verbindung zum Knoten Köln.",
      },
    ],
  },
  {
    slug: "muenster",
    name: "Münster",
    bundeslandSlug: "nordrhein-westfalen",
    bundeslandName: "Nordrhein-Westfalen",
    intro: ["Münster ist der zentrale Knoten des Münsterlandes mit Regionalverkehr in mehrere Richtungen."],
    lokfuehrerWerden: ["Als Regionalknoten bietet Münster Einstiegsmöglichkeiten im Nahverkehr."],
    umschulung: ["Zugelassene Träger im Raum Münster/Westfalen bieten förderfähige Umschulungen an."],
    bildungsgutschein: BG_LOCAL("Münster"),
    gehalt: GEHALT_LOCAL("Nordrhein-Westfalen"),
    employerSlugs: ["deutsche-bahn", "db-regio", "eurobahn"],
    keyFacts: [
      { label: "Bundesland", value: "NRW" },
      { label: "Raum", value: "Münsterland" },
      { label: "Profil", value: "Regionalknoten" },
      { label: "Anbieter", value: "DB, eurobahn" },
    ],
    faq: [
      {
        question: "Welche Rolle spielt Münster?",
        answer: "Münster ist der zentrale Regionalknoten des Münsterlandes mit Verbindungen in mehrere Richtungen.",
      },
    ],
  },
];

export function getCity(slug: string): CityData | undefined {
  return CITIES.find((c) => c.slug === slug);
}
