/**
 * Railway-employer hub dataset.
 *
 * Facts are kept to publicly known, stable characteristics (verkehrsart,
 * coverage, typical deployment areas). Quantitative pay statements are kept
 * qualitative and anchor back to the national salary atlas rather than
 * inventing employer-specific numbers.
 */
import type { EmployerData } from "../types";

export const EMPLOYERS: ReadonlyArray<EmployerData> = [
  {
    slug: "deutsche-bahn",
    name: "Deutsche Bahn (DB)",
    kind: "DB-Konzern · Dachmarke",
    verkehrsart: "Nah-, Fern- & Güterverkehr",
    coverage: "bundesweit",
    profile: [
      "Die Deutsche Bahn ist der größte Eisenbahnkonzern Deutschlands und mit Abstand der größte Arbeitgeber für Triebfahrzeugführer. Unter dem Dach bündeln sich u. a. DB Regio (Nahverkehr), DB Fernverkehr (ICE/IC) und DB Cargo (Güterverkehr).",
      "Für angehende Lokführer ist die DB sowohl als Ausbilder (klassische Ausbildung) als auch als Abnehmer von Umschulungsabsolventen relevant — bundesweit und in nahezu allen Verkehrsarten.",
    ],
    einsatzgebiete: [
      "Nahverkehr in allen Bundesländern über DB Regio.",
      "Fernverkehr auf dem ICE-/IC-Netz über DB Fernverkehr.",
      "Schienengüterverkehr national und europäisch über DB Cargo.",
    ],
    standorte: [
      "Bundesweit mit Betriebsstellen in nahezu allen Ballungsräumen.",
      "Große Standorte u. a. in Berlin, Frankfurt, München, Köln, Hamburg, Leipzig.",
    ],
    gehalt: [
      "Die Vergütung folgt den Konzern-Tarifverträgen (u. a. mit EVG und GDL). Die konkreten Bänder liegen im Rahmen der national üblichen Lokführer-Spannen; Zulagen für Schicht, Nacht und Wochenende erhöhen das Effektivgehalt.",
    ],
    arbeitsbedingungen: [
      "Schicht-, Nacht- und Wochenenddienst sind die Regel.",
      "Tarifbindung, betriebliche Strukturen und vergleichsweise hohe Planungssicherheit.",
    ],
    karrierewege: [
      "Vom Triebfahrzeugführer zum Lehrlokführer, Disponenten oder in den Betriebsdienst.",
      "Wechsel zwischen Verkehrsarten (Regio ↔ Fernverkehr ↔ Cargo) ist möglich.",
    ],
    bewerbungsprozess: [
      "Bewerbung über das DB-Karriereportal, Eignungsuntersuchungen (medizinisch und psychologisch), anschließend Ausbildung oder Umschulung.",
    ],
    regionSlugs: ["nordrhein-westfalen", "bayern", "berlin", "niedersachsen", "hessen"],
    keyFacts: [
      { label: "Typ", value: "DB-Konzern" },
      { label: "Verkehr", value: "alle" },
      { label: "Reichweite", value: "bundesweit" },
      { label: "Rolle", value: "Ausbilder + Abnehmer" },
    ],
    faq: [
      {
        question: "Bildet die Deutsche Bahn auch Quereinsteiger aus?",
        answer:
          "Ja. Die DB stellt sowohl klassische Auszubildende als auch Umschüler/Quereinsteiger ein, abhängig vom regionalen Bedarf und der bestandenen Eignung.",
      },
      {
        question: "In welchen Verkehrsarten kann ich bei der DB fahren?",
        answer:
          "Im Nahverkehr (DB Regio), Fernverkehr (DB Fernverkehr) und Güterverkehr (DB Cargo) — je nach Standort und Bedarf.",
      },
    ],
  },
  {
    slug: "db-regio",
    name: "DB Regio",
    kind: "DB-Konzern · Nahverkehr",
    verkehrsart: "Nahverkehr (SPNV)",
    coverage: "bundesweit",
    profile: [
      "DB Regio betreibt den Schienenpersonennahverkehr der Deutschen Bahn und ist in fast allen Bundesländern auf Regional- und S-Bahn-Linien aktiv.",
      "Als bundesweiter Nahverkehrsbetreiber ist DB Regio einer der wichtigsten Einstiegsarbeitgeber für frisch ausgebildete und umgeschulte Lokführer.",
    ],
    einsatzgebiete: [
      "Regionalverkehr (RE/RB) und S-Bahn-Systeme in zahlreichen Verkehrsverbünden.",
    ],
    standorte: ["Bundesweit, mit regionalen Verkehrsbetrieben in jedem Bundesland."],
    gehalt: [
      "Vergütung nach Konzern-Tarif; Nahverkehrsdienste bringen planbare Zulagenstrukturen. Orientierung siehe Gehaltsatlas.",
    ],
    arbeitsbedingungen: [
      "Linien- und Umlaufdienste mit regelmäßigen Schicht- und Wochenendanteilen.",
      "Wohnortnaher Einsatz im jeweiligen Regionalnetz häufig möglich.",
    ],
    karrierewege: [
      "Einstieg im Nahverkehr, Spezialisierung auf bestimmte Netze/Fahrzeuge, Weiterentwicklung zum Ausbilder.",
    ],
    bewerbungsprozess: [
      "Bewerbung über das DB-Karriereportal beim regionalen Verkehrsbetrieb, danach Eignungsuntersuchung und Qualifizierung.",
    ],
    regionSlugs: ["bayern", "baden-wuerttemberg", "nordrhein-westfalen", "hessen", "niedersachsen"],
    keyFacts: [
      { label: "Typ", value: "DB-Konzern" },
      { label: "Verkehr", value: "Nahverkehr" },
      { label: "Reichweite", value: "bundesweit" },
      { label: "Einstieg", value: "häufig" },
    ],
    faq: [
      {
        question: "Ist DB Regio gut für den Einstieg geeignet?",
        answer:
          "Ja. Der planbare Nahverkehr und die bundesweite Präsenz machen DB Regio zu einem der häufigsten Einstiegsarbeitgeber nach der Umschulung.",
      },
    ],
  },
  {
    slug: "db-fernverkehr",
    name: "DB Fernverkehr",
    kind: "DB-Konzern · Fernverkehr",
    verkehrsart: "Fernverkehr (ICE/IC)",
    coverage: "bundesweit",
    profile: [
      "DB Fernverkehr betreibt das ICE- und Intercity-Netz. Triebfahrzeugführer fahren hier hochwertige Fernverkehrszüge auf langen Relationen, oft mit LZB/ETCS-Strecken.",
    ],
    einsatzgebiete: ["Fernverkehrslinien zwischen den großen Ballungsräumen."],
    standorte: ["Fernverkehrsstandorte in Metropolen wie Frankfurt, München, Berlin, Hamburg, Köln."],
    gehalt: [
      "Vergütung nach Konzern-Tarif; Fernverkehr ist häufig mit längeren Diensten und entsprechenden Zulagen verbunden. Orientierung siehe Gehaltsatlas.",
    ],
    arbeitsbedingungen: [
      "Längere Umläufe, teils mit auswärtigen Übernachtungen; moderne Fahrzeugflotte.",
    ],
    karrierewege: [
      "Spezialisierung auf Hochgeschwindigkeitsfahrzeuge und ETCS-Strecken; Ausbilderfunktionen.",
    ],
    bewerbungsprozess: [
      "Häufig nach Erfahrung im Nah- oder Güterverkehr; Bewerbung über das DB-Karriereportal.",
    ],
    regionSlugs: ["hessen", "bayern", "berlin", "hamburg", "nordrhein-westfalen"],
    keyFacts: [
      { label: "Typ", value: "DB-Konzern" },
      { label: "Verkehr", value: "Fernverkehr" },
      { label: "Technik", value: "LZB/ETCS" },
      { label: "Reichweite", value: "bundesweit" },
    ],
    faq: [
      {
        question: "Kann ich direkt im Fernverkehr starten?",
        answer:
          "Oft wird Erfahrung aus dem Nah- oder Güterverkehr erwartet, da Fernverkehr lange Relationen und Hochgeschwindigkeitstechnik umfasst. Der Quereinstieg führt daher meist zunächst in den Nahverkehr.",
      },
    ],
  },
  {
    slug: "db-cargo",
    name: "DB Cargo",
    kind: "DB-Konzern · Güterverkehr",
    verkehrsart: "Güterverkehr",
    coverage: "national & europäisch",
    profile: [
      "DB Cargo ist die Güterverkehrssparte der Deutschen Bahn und einer der größten Schienengüterverkehrsanbieter Europas. Lokführer bewegen hier Güterzüge im Einzelwagen- und Ganzzugverkehr.",
    ],
    einsatzgebiete: ["Güterverkehrskorridore, Rangierbahnhöfe und Industrieanschlüsse, national und grenzüberschreitend."],
    standorte: ["Große Güterstandorte u. a. in den Rhein-Ruhr-, Rhein-Main- und Hafenregionen."],
    gehalt: [
      "Güterverkehr ist durch Nacht- und Wochenenddienste häufig mit höheren Zulagen verbunden; das Effektivgehalt kann über dem reinen Nahverkehr liegen. Orientierung siehe Gehaltsatlas.",
    ],
    arbeitsbedingungen: [
      "Unregelmäßige Dienste, viel Nacht- und Wochenendanteil; weniger Fahrgastkontakt.",
    ],
    karrierewege: ["Spezialisierung auf Gefahrgut, Rangierdienst oder grenzüberschreitenden Verkehr."],
    bewerbungsprozess: ["Bewerbung über das DB-Karriereportal; Quereinsteiger sind im Güterverkehr willkommen."],
    regionSlugs: ["nordrhein-westfalen", "hessen", "niedersachsen", "saarland"],
    keyFacts: [
      { label: "Typ", value: "DB-Konzern" },
      { label: "Verkehr", value: "Güter" },
      { label: "Zulagen", value: "oft höher" },
      { label: "Reichweite", value: "national/EU" },
    ],
    faq: [
      {
        question: "Verdient man im Güterverkehr mehr?",
        answer:
          "Häufig ja: Durch den hohen Nacht- und Wochenendanteil fallen mehr Zulagen an, was das Effektivgehalt erhöhen kann. Die Grundvergütung folgt dem Tarif.",
      },
    ],
  },
  {
    slug: "national-express",
    name: "National Express",
    kind: "Wettbewerber · Nahverkehr",
    verkehrsart: "Nahverkehr (SPNV)",
    coverage: "Schwerpunkt NRW",
    profile: [
      "National Express betreibt in Deutschland Nahverkehrslinien mit Schwerpunkt in Nordrhein-Westfalen, unter anderem im Rhein-Ruhr-Express-Verbund (RRX).",
    ],
    einsatzgebiete: ["Regional- und RRX-Linien im Ballungsraum Rhein-Ruhr und angrenzenden Räumen."],
    standorte: ["Betriebsstandorte im Großraum Köln/Düsseldorf und im Ruhrgebiet."],
    gehalt: ["Vergütung nach Haustarif/Branchentarif; Orientierung siehe Gehaltsatlas."],
    arbeitsbedingungen: ["Moderne Fahrzeuge, dichter Takt im Ballungsraum, Schicht- und Wochenenddienst."],
    karrierewege: ["Einstieg im Nahverkehr, Weiterentwicklung zum Ausbilder/Disponenten."],
    bewerbungsprozess: ["Direktbewerbung beim Unternehmen; Eignungsuntersuchungen erforderlich."],
    regionSlugs: ["nordrhein-westfalen"],
    keyFacts: [
      { label: "Typ", value: "Wettbewerber" },
      { label: "Verkehr", value: "Nahverkehr" },
      { label: "Region", value: "NRW" },
      { label: "Netz", value: "RRX u. a." },
    ],
    faq: [
      {
        question: "Wo fährt National Express in Deutschland?",
        answer:
          "Schwerpunkt ist Nordrhein-Westfalen, unter anderem im Rhein-Ruhr-Express-System sowie auf weiteren Regionallinien.",
      },
    ],
  },
  {
    slug: "captrain",
    name: "Captrain",
    kind: "Wettbewerber · Güterverkehr",
    verkehrsart: "Güterverkehr",
    coverage: "national & europäisch",
    profile: [
      "Captrain ist ein privater Schienengüterverkehrsanbieter (Teil der SNCF-Gruppe) und in Deutschland sowie europäisch im Güterverkehr aktiv.",
    ],
    einsatzgebiete: ["Ganzzug- und Industrieverkehre, häufig grenzüberschreitend."],
    standorte: ["Standorte entlang der wichtigen Güterkorridore."],
    gehalt: ["Güterverkehrstypische Zulagenstruktur; Orientierung siehe Gehaltsatlas."],
    arbeitsbedingungen: ["Nacht- und Wochenenddienste, eigenständiges Arbeiten, wenig Fahrgastkontakt."],
    karrierewege: ["Spezialisierung auf grenzüberschreitenden Verkehr und Gefahrgut."],
    bewerbungsprozess: ["Direktbewerbung; Quereinsteiger mit Tf-Schein willkommen."],
    regionSlugs: ["nordrhein-westfalen", "niedersachsen", "saarland"],
    keyFacts: [
      { label: "Typ", value: "Wettbewerber" },
      { label: "Verkehr", value: "Güter" },
      { label: "Gruppe", value: "SNCF" },
      { label: "Reichweite", value: "national/EU" },
    ],
    faq: [
      {
        question: "Ist Captrain ein Güter- oder Personenverkehr?",
        answer:
          "Captrain ist ein reiner Schienengüterverkehrsanbieter und betreibt keine Personenzüge.",
      },
    ],
  },
  {
    slug: "odeg",
    name: "ODEG (Ostdeutsche Eisenbahn)",
    kind: "Wettbewerber · Nahverkehr",
    verkehrsart: "Nahverkehr (SPNV)",
    coverage: "Schwerpunkt Ostdeutschland",
    profile: [
      "Die ODEG betreibt Nahverkehrslinien im Osten Deutschlands, vor allem in Berlin, Brandenburg, Mecklenburg-Vorpommern und Sachsen.",
    ],
    einsatzgebiete: ["Regionallinien im Berliner Umland und in den ostdeutschen Flächenländern."],
    standorte: ["Betriebsstandorte u. a. im Raum Berlin/Brandenburg und Sachsen."],
    gehalt: ["Vergütung nach Branchen-/Haustarif; Orientierung siehe Gehaltsatlas."],
    arbeitsbedingungen: ["Regionalverkehr mit Schicht- und Wochenenddienst, oft wohnortnah."],
    karrierewege: ["Einstieg im Nahverkehr, Spezialisierung auf bestimmte Netze."],
    bewerbungsprozess: ["Direktbewerbung beim Unternehmen; Eignungsuntersuchungen erforderlich."],
    regionSlugs: ["berlin", "brandenburg", "mecklenburg-vorpommern", "sachsen"],
    keyFacts: [
      { label: "Typ", value: "Wettbewerber" },
      { label: "Verkehr", value: "Nahverkehr" },
      { label: "Region", value: "Ost" },
      { label: "Netze", value: "BB/MV/SN" },
    ],
    faq: [
      {
        question: "In welchen Regionen fährt die ODEG?",
        answer:
          "Schwerpunkt ist Ostdeutschland: Berlin, Brandenburg, Mecklenburg-Vorpommern und Sachsen.",
      },
    ],
  },
  {
    slug: "metronom",
    name: "metronom",
    kind: "Wettbewerber · Nahverkehr",
    verkehrsart: "Nahverkehr (SPNV)",
    coverage: "Schwerpunkt Niedersachsen",
    profile: [
      "Die metronom Eisenbahngesellschaft betreibt stark frequentierte Regionallinien in Niedersachsen und ins Hamburger und Bremer Umland.",
    ],
    einsatzgebiete: ["Hauptachsen u. a. Hamburg–Bremen, Hamburg–Hannover, Hannover–Göttingen/Uelzen."],
    standorte: ["Betriebsstandorte in Niedersachsen mit Anbindung an Hamburg und Bremen."],
    gehalt: ["Vergütung nach Haustarif; Orientierung siehe Gehaltsatlas."],
    arbeitsbedingungen: ["Dichter Takt auf Hauptachsen, Schicht- und Wochenenddienst."],
    karrierewege: ["Einstieg im Nahverkehr, Weiterentwicklung zum Ausbilder."],
    bewerbungsprozess: ["Direktbewerbung; Quereinsteiger mit Tf-Schein willkommen."],
    regionSlugs: ["niedersachsen", "hamburg", "bremen"],
    keyFacts: [
      { label: "Typ", value: "Wettbewerber" },
      { label: "Verkehr", value: "Nahverkehr" },
      { label: "Region", value: "Niedersachsen" },
      { label: "Achsen", value: "HH–HB–H" },
    ],
    faq: [
      {
        question: "Wo fährt metronom?",
        answer:
          "Auf stark genutzten Regionalachsen in Niedersachsen sowie in die Ballungsräume Hamburg und Bremen.",
      },
    ],
  },
  {
    slug: "eurobahn",
    name: "eurobahn",
    kind: "Wettbewerber · Nahverkehr",
    verkehrsart: "Nahverkehr (SPNV)",
    coverage: "Schwerpunkt NRW / Niedersachsen",
    profile: [
      "Die eurobahn (Keolis-Gruppe) betreibt Regionalverkehr vor allem in Nordrhein-Westfalen und im angrenzenden Niedersachsen.",
    ],
    einsatzgebiete: ["Regionallinien in Ostwestfalen-Lippe, dem Münsterland und angrenzenden Räumen."],
    standorte: ["Betriebsstandorte in NRW (u. a. Raum Hamm/Bielefeld)."],
    gehalt: ["Vergütung nach Haustarif; Orientierung siehe Gehaltsatlas."],
    arbeitsbedingungen: ["Regionalverkehr mit Schicht- und Wochenenddienst."],
    karrierewege: ["Einstieg im Nahverkehr, Spezialisierung auf bestimmte Netze."],
    bewerbungsprozess: ["Direktbewerbung beim Unternehmen; Eignungsuntersuchungen erforderlich."],
    regionSlugs: ["nordrhein-westfalen", "niedersachsen"],
    keyFacts: [
      { label: "Typ", value: "Wettbewerber" },
      { label: "Verkehr", value: "Nahverkehr" },
      { label: "Gruppe", value: "Keolis" },
      { label: "Region", value: "NRW" },
    ],
    faq: [
      {
        question: "Zu welcher Gruppe gehört die eurobahn?",
        answer: "Die eurobahn gehört zur Keolis-Gruppe und betreibt Nahverkehr vor allem in NRW.",
      },
    ],
  },
  {
    slug: "rheincargo",
    name: "RheinCargo",
    kind: "Wettbewerber · Güterverkehr",
    verkehrsart: "Güterverkehr",
    coverage: "Schwerpunkt Rheinland",
    profile: [
      "RheinCargo ist ein Güterbahn- und Hafenlogistikunternehmen mit Schwerpunkt im Rheinland (Köln/Neuss/Düsseldorf) und betreibt Schienengüterverkehre.",
    ],
    einsatzgebiete: ["Güterverkehre rund um die Rheinhäfen und Industriestandorte im Rheinland."],
    standorte: ["Standorte im Großraum Köln/Neuss/Düsseldorf."],
    gehalt: ["Güterverkehrstypische Zulagenstruktur; Orientierung siehe Gehaltsatlas."],
    arbeitsbedingungen: ["Nacht- und Wochenenddienste, Industrie- und Hafenverkehre."],
    karrierewege: ["Spezialisierung auf Hafen-/Industrieverkehre und Rangierdienst."],
    bewerbungsprozess: ["Direktbewerbung; Quereinsteiger mit Tf-Schein willkommen."],
    regionSlugs: ["nordrhein-westfalen"],
    keyFacts: [
      { label: "Typ", value: "Wettbewerber" },
      { label: "Verkehr", value: "Güter" },
      { label: "Region", value: "Rheinland" },
      { label: "Fokus", value: "Hafen/Industrie" },
    ],
    faq: [
      {
        question: "Was macht RheinCargo?",
        answer:
          "RheinCargo verbindet Schienengüterverkehr mit Hafenlogistik im Rheinland und transportiert vor allem Industrie- und Hafengüter.",
      },
    ],
  },
  {
    slug: "vlexx",
    name: "vlexx",
    kind: "Wettbewerber · Nahverkehr",
    verkehrsart: "Nahverkehr (SPNV)",
    coverage: "RLP / Saarland / Hessen",
    profile: [
      "vlexx betreibt Regionalverkehr vor allem in Rheinland-Pfalz und im angrenzenden Saarland und Hessen.",
    ],
    einsatzgebiete: ["Regionallinien im Raum Mainz, Kaiserslautern und angrenzenden Netzen."],
    standorte: ["Betriebsstandorte in Rheinland-Pfalz."],
    gehalt: ["Vergütung nach Haustarif; Orientierung siehe Gehaltsatlas."],
    arbeitsbedingungen: ["Regionalverkehr mit Schicht- und Wochenenddienst."],
    karrierewege: ["Einstieg im Nahverkehr, Spezialisierung auf bestimmte Netze."],
    bewerbungsprozess: ["Direktbewerbung beim Unternehmen; Eignungsuntersuchungen erforderlich."],
    regionSlugs: ["rheinland-pfalz", "saarland", "hessen"],
    keyFacts: [
      { label: "Typ", value: "Wettbewerber" },
      { label: "Verkehr", value: "Nahverkehr" },
      { label: "Region", value: "RLP" },
      { label: "Nachbarn", value: "SL/HE" },
    ],
    faq: [
      {
        question: "Wo fährt vlexx?",
        answer: "Schwerpunkt ist Rheinland-Pfalz, mit Verbindungen ins Saarland und nach Hessen.",
      },
    ],
  },
];

export function getEmployer(slug: string): EmployerData | undefined {
  return EMPLOYERS.find((e) => e.slug === slug);
}
