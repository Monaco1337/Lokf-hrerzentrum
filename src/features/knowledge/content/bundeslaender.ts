/**
 * Federal-state (Bundesland) hub dataset.
 *
 * Each entry carries genuinely region-specific information: labour-market
 * characterisation, network particularities, operating employers and the cities
 * we cover. Funding mechanics are nationally uniform (SGB III / Bildungsgutschein
 * via the local Agentur für Arbeit), so the funding text localises the
 * responsible agency rather than inventing state-specific programmes.
 */
import type { RegionData } from "../types";

const SALARY_REF =
  "Die Vergütung folgt den bundesweiten Tarif- und Marktspannen; regionale Unterschiede ergeben sich vor allem über Arbeitgeber, Verkehrsart und Zulagen. Konkrete Werte im Gehaltsatlas.";

export const REGIONS: ReadonlyArray<RegionData> = [
  {
    slug: "nordrhein-westfalen",
    name: "Nordrhein-Westfalen",
    kfz: "NRW",
    capital: "Düsseldorf",
    intro: [
      "Nordrhein-Westfalen ist mit dem dicht vernetzten Ballungsraum Rhein-Ruhr einer der wichtigsten Eisenbahnmärkte Deutschlands — sowohl im Personen- als auch im Güterverkehr.",
      "Für angehende Lokführer bedeutet das: viele Arbeitgeber, kurze Wege und ein hoher, anhaltender Personalbedarf in Nah- und Güterverkehr.",
    ],
    arbeitsmarkt: [
      "Die hohe Liniendichte im Rhein-Ruhr-Gebiet und der starke Güterverkehr rund um die Rheinhäfen sorgen für überdurchschnittlich viele Einsatzmöglichkeiten.",
      "Neben der DB sind mehrere Wettbewerber aktiv, was die Auswahl an Arbeitgebern erhöht.",
    ],
    besonderheiten: [
      "Rhein-Ruhr-Express (RRX) und dichte S-Bahn-Netze in Köln, Düsseldorf und im Ruhrgebiet.",
      "Bedeutende Güterverkehrsknoten rund um die Rheinhäfen.",
    ],
    foerderung: [
      "Die Förderung über den Bildungsgutschein läuft über die örtlichen Agenturen für Arbeit bzw. Jobcenter in NRW.",
    ],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "db-cargo", "national-express", "eurobahn", "rheincargo", "captrain"],
    citySlugs: ["koeln", "duesseldorf", "dortmund", "essen", "bochum", "duisburg", "bonn", "muenster"],
    keyFacts: [
      { label: "Kürzel", value: "NRW" },
      { label: "Schwerpunkt", value: "Rhein-Ruhr" },
      { label: "Verkehr", value: "Nah + Güter" },
      { label: "Bedarf", value: "sehr hoch" },
    ],
    faq: [
      {
        question: "Welche Arbeitgeber gibt es für Lokführer in NRW?",
        answer:
          "Neben der Deutschen Bahn (DB Regio, DB Cargo) sind u. a. National Express, eurobahn, RheinCargo und Captrain in NRW aktiv.",
      },
      {
        question: "Ist der Bedarf an Lokführern in NRW hoch?",
        answer:
          "Ja. Die hohe Liniendichte und der starke Güterverkehr sorgen für einen anhaltend hohen Personalbedarf.",
      },
    ],
  },
  {
    slug: "bayern",
    name: "Bayern",
    kfz: "BY",
    capital: "München",
    intro: [
      "Bayern ist das flächengrößte Bundesland mit einem weit verzweigten Streckennetz und dem Verkehrsknoten München.",
      "Der Bedarf an Triebfahrzeugführern ist hoch — sowohl im Ballungsraum München und Nürnberg als auch im Flächenverkehr.",
    ],
    arbeitsmarkt: [
      "München und Nürnberg sind starke Nahverkehrsknoten; dazu kommen lange Flächenrelationen im Regionalverkehr.",
      "Die DB ist dominant, daneben fahren mehrere Wettbewerber im bayerischen Nahverkehr.",
    ],
    besonderheiten: [
      "S-Bahn-Systeme in München und Nürnberg.",
      "Fernverkehrsachsen mit ICE-Anbindung über München.",
    ],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter in Bayern."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "db-fernverkehr"],
    citySlugs: ["muenchen", "nuernberg"],
    keyFacts: [
      { label: "Kürzel", value: "BY" },
      { label: "Knoten", value: "München" },
      { label: "Verkehr", value: "Nah + Fern" },
      { label: "Fläche", value: "größtes Land" },
    ],
    faq: [
      {
        question: "Wo ist der Bedarf in Bayern am höchsten?",
        answer:
          "In den Ballungsräumen München und Nürnberg sowie auf den langen Flächenrelationen im Regionalverkehr.",
      },
    ],
  },
  {
    slug: "baden-wuerttemberg",
    name: "Baden-Württemberg",
    kfz: "BW",
    capital: "Stuttgart",
    intro: [
      "Baden-Württemberg verbindet den starken Ballungsraum Stuttgart mit einem dichten Regionalnetz im Südwesten.",
      "Große Infrastrukturprojekte und ein hoher Verkehrsbedarf machen das Land zu einem aktiven Markt für Lokführer.",
    ],
    arbeitsmarkt: [
      "Stuttgart ist der zentrale Knoten; im Regional- und S-Bahn-Verkehr besteht hoher Personalbedarf.",
      "Neben der DB sind im Nahverkehr Wettbewerber aktiv.",
    ],
    besonderheiten: [
      "S-Bahn Stuttgart und umfangreiche Infrastrukturmaßnahmen rund um den Knoten Stuttgart.",
    ],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter in Baden-Württemberg."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "db-fernverkehr"],
    citySlugs: ["stuttgart"],
    keyFacts: [
      { label: "Kürzel", value: "BW" },
      { label: "Knoten", value: "Stuttgart" },
      { label: "Verkehr", value: "Nah + Fern" },
      { label: "Bedarf", value: "hoch" },
    ],
    faq: [
      {
        question: "Welcher Standort ist in Baden-Württemberg am wichtigsten?",
        answer: "Der Knoten Stuttgart mit S-Bahn und Fernverkehr ist der zentrale Standort.",
      },
    ],
  },
  {
    slug: "niedersachsen",
    name: "Niedersachsen",
    kfz: "NI",
    capital: "Hannover",
    intro: [
      "Niedersachsen verbindet den Knoten Hannover mit wichtigen Nord-Süd- und West-Ost-Achsen.",
      "Mit der metronom-Gesellschaft und weiteren Anbietern gibt es neben der DB mehrere Arbeitgeber.",
    ],
    arbeitsmarkt: [
      "Hannover ist ein bedeutender Verkehrsknoten; auf den Hauptachsen herrscht dichter Regionalverkehr.",
      "Wettbewerber wie metronom und eurobahn ergänzen das Angebot der DB.",
    ],
    besonderheiten: [
      "Stark genutzte Regionalachsen Richtung Hamburg, Bremen und Göttingen.",
    ],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter in Niedersachsen."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "metronom", "eurobahn", "captrain"],
    citySlugs: ["hannover"],
    keyFacts: [
      { label: "Kürzel", value: "NI" },
      { label: "Knoten", value: "Hannover" },
      { label: "Anbieter", value: "DB + metronom" },
      { label: "Verkehr", value: "Nahverkehr" },
    ],
    faq: [
      {
        question: "Welche Wettbewerber fahren in Niedersachsen?",
        answer: "Unter anderem metronom und eurobahn betreiben Regionalverkehr neben der DB.",
      },
    ],
  },
  {
    slug: "hessen",
    name: "Hessen",
    kfz: "HE",
    capital: "Wiesbaden",
    intro: [
      "Hessen ist mit dem Knoten Frankfurt einer der zentralen Eisenbahn-Drehkreuze Europas.",
      "Personen-, Fern- und Güterverkehr bündeln sich hier, was einen breiten Arbeitsmarkt für Lokführer schafft.",
    ],
    arbeitsmarkt: [
      "Der Frankfurter Knoten gehört zu den meistbefahrenen Bereichen Deutschlands.",
      "Neben der DB sind im Nahverkehr Wettbewerber aktiv.",
    ],
    besonderheiten: [
      "Frankfurt als zentrales Fernverkehrs- und S-Bahn-Drehkreuz.",
    ],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter in Hessen."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "db-fernverkehr", "vlexx", "db-cargo"],
    citySlugs: ["frankfurt"],
    keyFacts: [
      { label: "Kürzel", value: "HE" },
      { label: "Knoten", value: "Frankfurt" },
      { label: "Verkehr", value: "alle" },
      { label: "Bedeutung", value: "Drehkreuz" },
    ],
    faq: [
      {
        question: "Warum ist Hessen für Lokführer attraktiv?",
        answer:
          "Der Frankfurter Knoten bündelt Nah-, Fern- und Güterverkehr und bietet dadurch viele und vielfältige Einsatzmöglichkeiten.",
      },
    ],
  },
  {
    slug: "sachsen",
    name: "Sachsen",
    kfz: "SN",
    capital: "Dresden",
    intro: [
      "Sachsen verbindet die Knoten Leipzig und Dresden mit einem dichten Regionalnetz im Osten Deutschlands.",
      "Neben der DB ist die ODEG ein wichtiger Nahverkehrsanbieter.",
    ],
    arbeitsmarkt: [
      "Leipzig und Dresden sind starke Knoten mit S-Bahn-Verkehr.",
      "Der Personalbedarf im Nahverkehr ist hoch.",
    ],
    besonderheiten: ["S-Bahn-Systeme in Leipzig (Mitteldeutschland) und Dresden."],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter in Sachsen."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "odeg"],
    citySlugs: ["leipzig", "dresden"],
    keyFacts: [
      { label: "Kürzel", value: "SN" },
      { label: "Knoten", value: "Leipzig/Dresden" },
      { label: "Anbieter", value: "DB + ODEG" },
      { label: "Verkehr", value: "Nahverkehr" },
    ],
    faq: [
      {
        question: "Wer fährt Nahverkehr in Sachsen?",
        answer: "Neben der DB ist vor allem die ODEG im sächsischen Nahverkehr aktiv.",
      },
    ],
  },
  {
    slug: "rheinland-pfalz",
    name: "Rheinland-Pfalz",
    kfz: "RP",
    capital: "Mainz",
    intro: [
      "Rheinland-Pfalz verbindet den Raum Mainz mit Rhein- und Moselachsen und grenzt an wichtige Güterkorridore.",
      "Neben der DB ist vlexx ein bekannter Nahverkehrsanbieter.",
    ],
    arbeitsmarkt: [
      "Regionalverkehr entlang von Rhein und Mosel sowie Pendlerverkehr Richtung Rhein-Main.",
    ],
    besonderheiten: ["Stark befahrene Rheinschiene als Güterkorridor."],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter in Rheinland-Pfalz."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "vlexx"],
    citySlugs: [],
    keyFacts: [
      { label: "Kürzel", value: "RP" },
      { label: "Raum", value: "Mainz" },
      { label: "Anbieter", value: "DB + vlexx" },
      { label: "Korridor", value: "Rheinschiene" },
    ],
    faq: [
      {
        question: "Welcher Wettbewerber fährt in Rheinland-Pfalz?",
        answer: "vlexx betreibt Regionalverkehr in Rheinland-Pfalz und angrenzenden Räumen.",
      },
    ],
  },
  {
    slug: "schleswig-holstein",
    name: "Schleswig-Holstein",
    kfz: "SH",
    capital: "Kiel",
    intro: [
      "Schleswig-Holstein verbindet die Räume Kiel und Lübeck mit der Metropole Hamburg.",
      "Pendler- und Regionalverkehr Richtung Hamburg prägen den Markt.",
    ],
    arbeitsmarkt: [
      "Starker Pendlerverkehr ins Hamburger Umland; Regionalnetz im Norden.",
    ],
    besonderheiten: ["Anbindung an den Knoten Hamburg; Nord-Süd-Achse Richtung Dänemark."],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter in Schleswig-Holstein."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio"],
    citySlugs: [],
    keyFacts: [
      { label: "Kürzel", value: "SH" },
      { label: "Räume", value: "Kiel/Lübeck" },
      { label: "Pendler", value: "Richtung HH" },
      { label: "Verkehr", value: "Nahverkehr" },
    ],
    faq: [
      {
        question: "Wohin pendeln viele Fahrgäste in Schleswig-Holstein?",
        answer: "Ein großer Teil des Verkehrs richtet sich auf den Knoten Hamburg aus.",
      },
    ],
  },
  {
    slug: "brandenburg",
    name: "Brandenburg",
    kfz: "BB",
    capital: "Potsdam",
    intro: [
      "Brandenburg umschließt die Hauptstadt Berlin und ist eng mit dem Berliner Verkehrssystem verflochten.",
      "Regional- und S-Bahn-Verkehr ins Berliner Umland prägen den Markt; die ODEG ist stark vertreten.",
    ],
    arbeitsmarkt: [
      "Dichter Pendlerverkehr zwischen Berlin und dem Umland.",
      "Neben der DB ist die ODEG ein wichtiger Anbieter.",
    ],
    besonderheiten: ["Enge Verzahnung mit dem Berliner S-Bahn- und Regionalnetz."],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter in Brandenburg."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "odeg"],
    citySlugs: [],
    keyFacts: [
      { label: "Kürzel", value: "BB" },
      { label: "Bezug", value: "Berliner Umland" },
      { label: "Anbieter", value: "DB + ODEG" },
      { label: "Verkehr", value: "Nahverkehr" },
    ],
    faq: [
      {
        question: "Wie hängt Brandenburg mit Berlin zusammen?",
        answer:
          "Brandenburg umschließt Berlin; ein großer Teil des Regional- und S-Bahn-Verkehrs ist auf die Hauptstadt ausgerichtet.",
      },
    ],
  },
  {
    slug: "thueringen",
    name: "Thüringen",
    kfz: "TH",
    capital: "Erfurt",
    intro: [
      "Thüringen ist mit dem ICE-Knoten Erfurt ein wichtiger Punkt im deutschen Fernverkehrsnetz.",
      "Regionalverkehr verbindet die Mittelzentren des Landes.",
    ],
    arbeitsmarkt: [
      "Erfurt als ICE-Knoten und Regionalverkehr in der Fläche.",
    ],
    besonderheiten: ["ICE-Knoten Erfurt an der Schnellfahrstrecke."],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter in Thüringen."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio"],
    citySlugs: [],
    keyFacts: [
      { label: "Kürzel", value: "TH" },
      { label: "Knoten", value: "Erfurt" },
      { label: "Verkehr", value: "Nah + Fern" },
      { label: "Bezug", value: "ICE-Strecke" },
    ],
    faq: [
      {
        question: "Was ist die Besonderheit Thüringens?",
        answer: "Erfurt ist ein ICE-Knoten an der Schnellfahrstrecke und damit Fernverkehrsstandort.",
      },
    ],
  },
  {
    slug: "sachsen-anhalt",
    name: "Sachsen-Anhalt",
    kfz: "ST",
    capital: "Magdeburg",
    intro: [
      "Sachsen-Anhalt verbindet die Knoten Magdeburg und Halle mit überregionalen Achsen.",
      "Regional- und Güterverkehr prägen den Markt.",
    ],
    arbeitsmarkt: ["Regionalverkehr um Magdeburg und Halle sowie Güterverkehrsachsen."],
    besonderheiten: ["Lage an wichtigen West-Ost-Verbindungen."],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter in Sachsen-Anhalt."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio"],
    citySlugs: [],
    keyFacts: [
      { label: "Kürzel", value: "ST" },
      { label: "Knoten", value: "Magdeburg/Halle" },
      { label: "Verkehr", value: "Nah + Güter" },
      { label: "Lage", value: "West-Ost" },
    ],
    faq: [
      {
        question: "Welche Knoten gibt es in Sachsen-Anhalt?",
        answer: "Vor allem Magdeburg und Halle sind zentrale Verkehrsknoten des Landes.",
      },
    ],
  },
  {
    slug: "mecklenburg-vorpommern",
    name: "Mecklenburg-Vorpommern",
    kfz: "MV",
    capital: "Schwerin",
    intro: [
      "Mecklenburg-Vorpommern ist ein Flächenland mit Küstentourismus und entsprechendem Saisonverkehr.",
      "Neben der DB ist die ODEG im Regionalverkehr aktiv.",
    ],
    arbeitsmarkt: ["Regionalverkehr in der Fläche sowie touristischer Saisonverkehr an der Küste."],
    besonderheiten: ["Saison- und Tourismusverkehr an der Ostseeküste."],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter in Mecklenburg-Vorpommern."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "odeg"],
    citySlugs: [],
    keyFacts: [
      { label: "Kürzel", value: "MV" },
      { label: "Profil", value: "Flächenland" },
      { label: "Anbieter", value: "DB + ODEG" },
      { label: "Verkehr", value: "Nahverkehr" },
    ],
    faq: [
      {
        question: "Wie ist der Bahnverkehr in MV geprägt?",
        answer:
          "Durch Regionalverkehr in der Fläche und touristischen Saisonverkehr an der Ostseeküste.",
      },
    ],
  },
  {
    slug: "saarland",
    name: "Saarland",
    kfz: "SL",
    capital: "Saarbrücken",
    intro: [
      "Das Saarland ist klein, aber mit grenzüberschreitendem Verkehr nach Frankreich und Industriegeschichte ein eigener Markt.",
      "Neben der DB ist vlexx im Regionalverkehr aktiv.",
    ],
    arbeitsmarkt: ["Regionalverkehr um Saarbrücken und grenzüberschreitende Verbindungen nach Frankreich."],
    besonderheiten: ["Grenzüberschreitender Verkehr Richtung Frankreich."],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter im Saarland."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "vlexx", "db-cargo"],
    citySlugs: [],
    keyFacts: [
      { label: "Kürzel", value: "SL" },
      { label: "Knoten", value: "Saarbrücken" },
      { label: "Bezug", value: "grenznah FR" },
      { label: "Verkehr", value: "Nah + Güter" },
    ],
    faq: [
      {
        question: "Was ist im Saarland besonders?",
        answer: "Der grenzüberschreitende Verkehr nach Frankreich und die industrielle Prägung der Region.",
      },
    ],
  },
  {
    slug: "bremen",
    name: "Bremen",
    kfz: "HB",
    capital: "Bremen",
    intro: [
      "Der Stadtstaat Bremen ist ein bedeutender Hafen- und Logistikstandort mit starkem Güterverkehr.",
      "Im Personenverkehr ist Bremen ein Knoten zwischen Hamburg, Hannover und Niedersachsen.",
    ],
    arbeitsmarkt: [
      "Starker Güter- und Hafenverkehr sowie Regionalverkehr ins niedersächsische Umland.",
    ],
    besonderheiten: ["Hafen- und Logistikverkehre; Anbindung über metronom Richtung Hamburg."],
    foerderung: ["Förderung über die örtliche Agentur für Arbeit bzw. das Jobcenter Bremen."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "metronom"],
    citySlugs: ["bremen"],
    keyFacts: [
      { label: "Kürzel", value: "HB" },
      { label: "Profil", value: "Hafen/Logistik" },
      { label: "Verkehr", value: "Nah + Güter" },
      { label: "Stadtstaat", value: "ja" },
    ],
    faq: [
      {
        question: "Wofür ist Bremen im Bahnverkehr wichtig?",
        answer: "Vor allem für den Hafen- und Güterverkehr sowie als Regionalknoten in Norddeutschland.",
      },
    ],
  },
  {
    slug: "hamburg",
    name: "Hamburg",
    kfz: "HH",
    capital: "Hamburg",
    intro: [
      "Hamburg ist als Stadtstaat einer der größten Verkehrsknoten Deutschlands und größter Seehafen des Landes.",
      "Personen-, Fern- und Güterverkehr (Hafenhinterland) bündeln sich hier und schaffen einen breiten Arbeitsmarkt.",
    ],
    arbeitsmarkt: [
      "Dichter S-Bahn- und Regionalverkehr, starker Fernverkehr und massiver Hafen-Güterverkehr.",
    ],
    besonderheiten: ["Größter deutscher Seehafen mit umfangreichem Hinterlandverkehr; S-Bahn Hamburg."],
    foerderung: ["Förderung über die örtliche Agentur für Arbeit bzw. das Jobcenter Hamburg."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "db-fernverkehr", "metronom"],
    citySlugs: ["hamburg"],
    keyFacts: [
      { label: "Kürzel", value: "HH" },
      { label: "Profil", value: "Hafen + Knoten" },
      { label: "Verkehr", value: "alle" },
      { label: "Stadtstaat", value: "ja" },
    ],
    faq: [
      {
        question: "Warum ist Hamburg für Lokführer attraktiv?",
        answer:
          "Wegen der Kombination aus dichtem Nah- und Fernverkehr und einem der größten Güterverkehrsaufkommen Deutschlands durch den Hafen.",
      },
    ],
  },
  {
    slug: "berlin",
    name: "Berlin",
    kfz: "B",
    capital: "Berlin",
    intro: [
      "Die Hauptstadt Berlin ist ein zentraler Eisenbahnknoten mit einem der dichtesten Nahverkehrssysteme Deutschlands.",
      "S-Bahn, Regional- und Fernverkehr bündeln sich hier; mehrere Arbeitgeber sind aktiv.",
    ],
    arbeitsmarkt: [
      "Sehr dichtes S-Bahn- und Regionalnetz, starker Fernverkehr und hoher Personalbedarf.",
      "Neben der DB ist die ODEG im Regionalverkehr präsent.",
    ],
    besonderheiten: ["Eigenständiges S-Bahn-System Berlin; zentraler Fernverkehrsknoten (Hauptbahnhof)."],
    foerderung: ["Förderung über die örtlichen Agenturen für Arbeit bzw. Jobcenter in Berlin."],
    salaryNote: SALARY_REF,
    employerSlugs: ["deutsche-bahn", "db-regio", "db-fernverkehr", "odeg"],
    citySlugs: ["berlin"],
    keyFacts: [
      { label: "Kürzel", value: "B" },
      { label: "Profil", value: "Hauptstadtknoten" },
      { label: "Verkehr", value: "alle" },
      { label: "Bedarf", value: "sehr hoch" },
    ],
    faq: [
      {
        question: "Wie ist der Markt für Lokführer in Berlin?",
        answer:
          "Sehr aktiv: Das dichte Nahverkehrsnetz und der zentrale Fernverkehrsknoten sorgen für hohen, anhaltenden Personalbedarf.",
      },
    ],
  },
];

export function getRegion(slug: string): RegionData | undefined {
  return REGIONS.find((r) => r.slug === slug);
}
