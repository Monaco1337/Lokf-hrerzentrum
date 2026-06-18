/**
 * Extended railway glossary entities. Conservative, verifiable definitions
 * across technology, signalling, vehicles, brakes, operations, regulation,
 * qualification, authorities, funding, careers and infrastructure. Answer-first
 * `short` field; `body` adds context. Quantitative/regulatory specifics are kept
 * general where exactness would risk inaccuracy.
 */
import type { GlossaryTerm } from "../types";

export const GLOSSARY_EXTENDED: ReadonlyArray<GlossaryTerm> = [
  // ---- Technik ----
  {
    slug: "zugbeeinflussung",
    term: "Zugbeeinflussung",
    category: "Technik",
    short:
      "Zugbeeinflussung ist der Oberbegriff für technische Systeme, die die Fahrweise überwachen und im Gefahrenfall automatisch bremsen — z. B. PZB, LZB und ETCS.",
    body: [
      "Zugbeeinflussungssysteme sichern den Bahnbetrieb, indem sie prüfen, ob Signale und Geschwindigkeiten eingehalten werden, und bei Bedarf eingreifen. In Deutschland sind PZB und LZB verbreitet, ETCS wird flächendeckend ausgebaut.",
    ],
    synonyms: ["Zugsicherung"],
    related: ["pzb", "lzb", "etcs"],
  },
  {
    slug: "ertms",
    term: "European Rail Traffic Management System",
    abbr: "ERTMS",
    category: "Technik",
    short:
      "ERTMS ist das europäische Gesamtsystem für Zugsteuerung und -kommunikation; es umfasst die Zugbeeinflussung ETCS und den Funkstandard GSM-R.",
    body: [
      "ERTMS soll grenzüberschreitenden Verkehr vereinheitlichen. Seine zwei Hauptbausteine sind ETCS (Zugbeeinflussung) und GSM-R (digitaler Zugfunk).",
    ],
    related: ["etcs", "gsm-r"],
  },
  {
    slug: "balise",
    term: "Balise",
    category: "Technik",
    short:
      "Eine Balise ist ein im Gleis montierter Datenpunkt, der bei ETCS Informationen wie Position und Streckendaten an das Fahrzeug überträgt.",
    body: [
      "Balisen sind ein Kernelement von ETCS. Sie liefern dem Fahrzeugrechner punktuell Daten, aus denen zusammen mit weiteren Informationen die zulässige Fahrweise berechnet wird.",
    ],
    related: ["etcs", "ertms"],
  },
  {
    slug: "gsm-r",
    term: "GSM-R (Zugfunk)",
    abbr: "GSM-R",
    category: "Technik",
    short:
      "GSM-R ist der digitale Bahnfunkstandard auf GSM-Basis für die Kommunikation zwischen Triebfahrzeugführer und Betriebszentrale.",
    body: [
      "GSM-R (Global System for Mobile Communications – Railway) ist der europäische Standard für den betrieblichen Zugfunk und Teil von ERTMS.",
    ],
    synonyms: ["Zugfunk"],
    related: ["ertms", "etcs"],
  },
  {
    slug: "stellwerk",
    term: "Stellwerk",
    category: "Technik",
    short:
      "Ein Stellwerk steuert Signale und Weichen eines Bahnbereichs und sichert so Zugfahrten und Rangierbewegungen.",
    body: [
      "Stellwerke gibt es in mehreren Generationen — von mechanischen über Relais- bis zu elektronischen Stellwerken (ESTW). Bedient werden sie vom Fahrdienstleiter.",
    ],
    related: ["estw", "fahrdienstleiter", "weiche"],
  },
  {
    slug: "estw",
    term: "Elektronisches Stellwerk",
    abbr: "ESTW",
    category: "Technik",
    short:
      "Das elektronische Stellwerk (ESTW) ist die modernste Stellwerksbauart, bei der Signale und Weichen rechnergestützt gesteuert werden.",
    body: [
      "ESTW erlauben die Fernsteuerung großer Streckenbereiche aus Betriebszentralen und sind Grundlage der weiteren Digitalisierung des Netzes.",
    ],
    related: ["stellwerk", "etcs"],
  },
  {
    slug: "weiche",
    term: "Weiche",
    category: "Technik",
    short:
      "Eine Weiche ist ein Gleisbauelement, das Schienenfahrzeugen den Übergang von einem Gleis auf ein anderes ermöglicht.",
    body: [
      "Weichen werden vom Stellwerk gestellt und sind ein zentrales Element jeder Fahrstraße. Ihre Lage bestimmt den Fahrweg eines Zuges.",
    ],
    related: ["fahrstrasse", "stellwerk"],
  },
  {
    slug: "fahrstrasse",
    term: "Fahrstraße",
    category: "Betrieb",
    short:
      "Eine Fahrstraße ist der für eine Zug- oder Rangierfahrt eingestellte und gesicherte Fahrweg inklusive der zugehörigen Weichen und Signale.",
    body: [
      "Erst wenn eine Fahrstraße eingestellt und gesichert ist, kann das zugehörige Signal Fahrt zeigen. Das verhindert sich kreuzende oder gefährdende Fahrten.",
    ],
    related: ["weiche", "hauptsignal", "stellwerk"],
  },
  {
    slug: "blockstelle",
    term: "Blockstelle / Blockabschnitt",
    category: "Betrieb",
    short:
      "Der Blockabschnitt ist ein Streckenteil, in dem sich nur ein Zug befinden darf; Blockstellen sichern den nötigen Abstand zwischen Zügen.",
    body: [
      "Das Blockprinzip teilt die Strecke in Abschnitte. Ein folgender Zug darf erst einfahren, wenn der vorausfahrende den Abschnitt verlassen hat — Grundlage sicherer Zugfolge.",
    ],
    related: ["zugfolge", "hauptsignal"],
  },
  {
    slug: "oberleitung",
    term: "Oberleitung",
    category: "Infrastruktur",
    short:
      "Die Oberleitung versorgt elektrische Triebfahrzeuge mit Fahrstrom; in Deutschland mit 15 kV bei 16,7 Hz Wechselspannung.",
    body: [
      "Über die Oberleitung nimmt der Stromabnehmer des Fahrzeugs den Fahrstrom auf. Nicht elektrifizierte Strecken werden mit Diesel- oder alternativen Antrieben befahren.",
    ],
    synonyms: ["Fahrleitung"],
    related: ["stromabnehmer", "elektrolokomotive"],
  },
  {
    slug: "stromabnehmer",
    term: "Stromabnehmer",
    category: "Fahrzeug",
    short:
      "Der Stromabnehmer (Pantograph) ist die Vorrichtung auf dem Dach elektrischer Triebfahrzeuge, die den Fahrstrom aus der Oberleitung aufnimmt.",
    body: [
      "Der Stromabnehmer wird angehoben, um Kontakt zur Oberleitung herzustellen, und für stromlose oder nicht elektrifizierte Abschnitte abgesenkt.",
    ],
    synonyms: ["Pantograph"],
    related: ["oberleitung", "elektrolokomotive"],
  },
  {
    slug: "neigetechnik",
    term: "Neigetechnik",
    category: "Fahrzeug",
    short:
      "Neigetechnik neigt den Wagenkasten aktiv in Kurven, sodass höhere Kurvengeschwindigkeiten bei gleichem Komfort möglich sind.",
    body: [
      "Neigetechnik wird auf kurvenreichen Strecken eingesetzt, um Fahrzeiten zu verkürzen, ohne den Oberbau umzubauen. Sie stellt besondere Anforderungen an Fahrzeug und Personal.",
    ],
    related: ["baureihe"],
  },
  {
    slug: "lichtraumprofil",
    term: "Lichtraumprofil",
    category: "Infrastruktur",
    short:
      "Das Lichtraumprofil ist der Raum um das Gleis, der von Hindernissen freizuhalten ist, damit Fahrzeuge sicher verkehren können.",
    body: [
      "Fahrzeuge müssen innerhalb der Fahrzeugbegrenzung bleiben, die Strecke das Lichtraumprofil freihalten. Beides zusammen sichert die Durchfahrt.",
    ],
    related: ["normalspur"],
  },
  // ---- Signale ----
  {
    slug: "hauptsignal",
    term: "Hauptsignal",
    category: "Signal",
    short:
      "Ein Hauptsignal gibt an, ob und mit welcher Geschwindigkeit in den folgenden Streckenabschnitt eingefahren werden darf (Halt oder Fahrt).",
    body: [
      "Hauptsignale stehen am Beginn eines gesicherten Abschnitts. Sie werden in der Regel durch ein vorausgehendes Vorsignal angekündigt.",
    ],
    related: ["vorsignal", "fahrstrasse", "hv-signalsystem"],
  },
  {
    slug: "vorsignal",
    term: "Vorsignal",
    category: "Signal",
    short:
      "Ein Vorsignal kündigt in ausreichendem Abstand an, was das zugehörige Hauptsignal zeigt, damit rechtzeitig gebremst werden kann.",
    body: [
      "Da Bremswege im Bahnverkehr lang sind, informiert das Vorsignal den Triebfahrzeugführer vorausschauend über den Begriff des folgenden Hauptsignals.",
    ],
    related: ["hauptsignal", "hv-signalsystem"],
  },
  {
    slug: "ks-signalsystem",
    term: "Ks-Signalsystem",
    abbr: "Ks",
    category: "Signal",
    short:
      "Das Ks-Signalsystem ist ein modernes Kombinationssignalsystem, das Haupt- und Vorsignalinformationen an einem Signalschirm zusammenfasst.",
    body: [
      "Ks-Signale (Kombinationssignale) wurden eingeführt, um die älteren H/V- und Hl-Systeme zu vereinheitlichen und die Signalisierung zu vereinfachen.",
    ],
    related: ["hauptsignal", "vorsignal", "hv-signalsystem"],
  },
  {
    slug: "hv-signalsystem",
    term: "H/V-Signalsystem",
    abbr: "H/V",
    category: "Signal",
    short:
      "Das H/V-Signalsystem ist das klassische deutsche Haupt-/Vorsignalsystem, bei dem Haupt- und Vorsignale getrennte Schirme nutzen.",
    body: [
      "Das H/V-System ist historisch weit verbreitet und wird schrittweise durch das Ks-System ersetzt. Beide Systeme sind Teil der Signalkunde in der Ausbildung.",
    ],
    related: ["ks-signalsystem", "hauptsignal", "vorsignal"],
  },
  {
    slug: "rangiersignal",
    term: "Rangiersignal",
    category: "Signal",
    short:
      "Rangiersignale regeln Rangierbewegungen, also das Bewegen von Fahrzeugen abseits regulärer Zugfahrten, z. B. im Bahnhof oder Rangierbahnhof.",
    body: [
      "Rangiersignale unterscheiden sich von Zugfahrtsignalen und gehören zur Signalkunde. Sie erlauben oder verbieten Rangierfahrten.",
    ],
    related: ["rangieren", "rangierbahnhof"],
  },
  {
    slug: "lichtsignal",
    term: "Lichtsignal",
    category: "Signal",
    short:
      "Lichtsignale zeigen ihre Begriffe über farbige Lichter (Lichtpunkte) und haben die älteren mechanischen Formsignale weitgehend abgelöst.",
    body: [
      "Lichtsignale sind heute der Regelfall. Sie sind gut erkennbar und lassen sich flexibel ansteuern.",
    ],
    related: ["formsignal", "hauptsignal"],
  },
  {
    slug: "formsignal",
    term: "Formsignal",
    category: "Signal",
    short:
      "Formsignale zeigen ihre Bedeutung über die mechanische Stellung von Flügeln oder Scheiben; sie sind die historische Bauform der Eisenbahnsignale.",
    body: [
      "Formsignale werden zunehmend durch Lichtsignale ersetzt, sind aber an manchen Strecken noch anzutreffen und Teil der Signalkunde.",
    ],
    related: ["lichtsignal", "hauptsignal"],
  },
  // ---- Fahrzeuge ----
  {
    slug: "lokomotive",
    term: "Lokomotive",
    category: "Fahrzeug",
    short:
      "Eine Lokomotive ist ein Triebfahrzeug ohne eigene Nutzlastfläche, das Wagen zieht oder schiebt — im Personen- wie im Güterverkehr.",
    body: [
      "Lokomotiven werden nach Antrieb (Elektro, Diesel) und Einsatz (Strecken-, Rangierlok) unterschieden. Im Nahverkehr dominieren dagegen oft Triebzüge.",
    ],
    related: ["elektrolokomotive", "diesellokomotive", "triebzug"],
  },
  {
    slug: "elektrolokomotive",
    term: "Elektrolokomotive",
    category: "Fahrzeug",
    short:
      "Eine Elektrolokomotive bezieht ihre Antriebsenergie über den Stromabnehmer aus der Oberleitung und ist auf elektrifizierten Strecken im Einsatz.",
    body: [
      "E-Loks sind effizient und leistungsstark, aber an die Oberleitung gebunden. Auf nicht elektrifizierten Abschnitten kommen Dieselfahrzeuge zum Einsatz.",
    ],
    related: ["oberleitung", "stromabnehmer", "diesellokomotive"],
  },
  {
    slug: "diesellokomotive",
    term: "Diesellokomotive",
    category: "Fahrzeug",
    short:
      "Eine Diesellokomotive erzeugt ihre Antriebsenergie aus einem Dieselmotor und ist unabhängig von der Oberleitung einsetzbar.",
    body: [
      "Dieselloks werden auf nicht elektrifizierten Strecken, im Rangierdienst und im Güterverkehr eingesetzt.",
    ],
    related: ["elektrolokomotive", "rangierlokomotive"],
  },
  {
    slug: "rangierlokomotive",
    term: "Rangierlokomotive",
    category: "Fahrzeug",
    short:
      "Eine Rangierlokomotive ist eine meist kleinere Lok für das Zusammenstellen und Bewegen von Zügen in Bahnhöfen und Rangierbahnhöfen.",
    body: [
      "Rangierloks sind auf häufiges Anfahren und niedrige Geschwindigkeiten ausgelegt und arbeiten oft eng mit dem Rangierpersonal zusammen.",
    ],
    related: ["rangieren", "rangierbahnhof"],
  },
  {
    slug: "triebwagen",
    term: "Triebwagen",
    category: "Fahrzeug",
    short:
      "Ein Triebwagen ist ein angetriebenes Schienenfahrzeug mit eigener Fahrgastfläche, das ohne separate Lok verkehren kann.",
    body: [
      "Triebwagen sind im Nahverkehr verbreitet. Mehrere gekuppelte Einheiten bilden einen Triebzug.",
    ],
    related: ["triebzug", "lokomotive"],
  },
  {
    slug: "triebzug",
    term: "Triebzug",
    category: "Fahrzeug",
    short:
      "Ein Triebzug ist eine fest gekuppelte Einheit aus angetriebenen und nicht angetriebenen Wagen, die als Ganzes verkehrt (z. B. S-Bahn- oder ICE-Züge).",
    body: [
      "Triebzüge bieten verteilten Antrieb und kurze Wendezeiten und prägen den modernen Nah- und Hochgeschwindigkeitsverkehr.",
    ],
    related: ["triebwagen", "ice"],
  },
  {
    slug: "ice",
    term: "Intercity-Express",
    abbr: "ICE",
    category: "Fahrzeug",
    short:
      "Der Intercity-Express (ICE) ist der Markenname der Hochgeschwindigkeitszüge der Deutschen Bahn im Fernverkehr.",
    body: [
      "ICE-Züge verkehren auf Schnellfahrstrecken und über das konventionelle Netz und werden von DB Fernverkehr betrieben.",
    ],
    related: ["triebzug", "schnellfahrstrecke", "db-fernverkehr"],
  },
  {
    slug: "baureihe",
    term: "Baureihe",
    category: "Fahrzeug",
    short:
      "Eine Baureihe ist eine standardisierte Fahrzeugtypklasse; Triebfahrzeugführer benötigen für jede Baureihe eine entsprechende Berechtigung.",
    body: [
      "Die Zuordnung zu Baureihen ordnet Fahrzeuge nach Bauart und Eigenschaften. Die Befähigung für konkrete Baureihen wird über die Fahrzeugkunde erworben.",
    ],
    related: ["fahrzeugkunde", "baureihenberechtigung"],
  },
  // ---- Bremsen ----
  {
    slug: "druckluftbremse",
    term: "Druckluftbremse",
    category: "Bremse",
    short:
      "Die Druckluftbremse ist das Standard-Bremssystem im Bahnverkehr; sie wirkt über eine durchgehende Hauptluftleitung im ganzen Zug.",
    body: [
      "Ein Absinken des Drucks in der Hauptluftleitung löst die Bremsung aus — auch bei einer Zugtrennung, was die Bremse selbsttätig (fail-safe) macht.",
    ],
    related: ["bremsprobe", "notbremse"],
  },
  {
    slug: "magnetschienenbremse",
    term: "Magnetschienenbremse",
    category: "Bremse",
    short:
      "Die Magnetschienenbremse presst Magnete direkt auf die Schiene und erhöht so die Bremswirkung, vor allem bei Schnell- und Notbremsungen.",
    body: [
      "Sie wirkt unabhängig vom Rad-Schiene-Kraftschluss und verkürzt den Bremsweg in kritischen Situationen.",
    ],
    related: ["druckluftbremse", "notbremse"],
  },
  {
    slug: "notbremse",
    term: "Notbremse",
    category: "Bremse",
    short:
      "Die Notbremse leitet eine sofortige Schnellbremsung ein; im Personenverkehr kann sie auch von Fahrgästen ausgelöst werden.",
    body: [
      "In vielen modernen Fahrzeugen sorgt eine Notbremsüberbrückung dafür, dass der Triebfahrzeugführer den Zug noch aus dem Gefahrenbereich (z. B. Tunnel) fahren kann.",
    ],
    related: ["druckluftbremse", "magnetschienenbremse"],
  },
  {
    slug: "feststellbremse",
    term: "Feststellbremse",
    category: "Bremse",
    short:
      "Die Feststellbremse sichert ein abgestelltes Fahrzeug mechanisch gegen Wegrollen, unabhängig vom Luftdruck im Bremssystem.",
    body: [
      "Sie ist beim Abstellen von Fahrzeugen vorgeschrieben, da die Druckluftbremse über die Zeit Druck verlieren kann.",
    ],
    related: ["druckluftbremse"],
  },
  {
    slug: "bremsprobe",
    term: "Bremsprobe",
    category: "Bremse",
    short:
      "Die Bremsprobe ist die vorgeschriebene Prüfung der Bremsanlage vor der Fahrt, um Funktion und Wirksamkeit der Bremse sicherzustellen.",
    body: [
      "Je nach Situation werden volle oder vereinfachte Bremsproben durchgeführt. Sie sind fester Bestandteil der betrieblichen Abläufe.",
    ],
    related: ["druckluftbremse", "bremshundertstel"],
  },
  {
    slug: "bremshundertstel",
    term: "Bremshundertstel (Bremsverhältnis)",
    category: "Bremse",
    short:
      "Bremshundertstel geben das Verhältnis von Bremsgewicht zu Zuggewicht in Prozent an und bestimmen die zulässige Geschwindigkeit eines Zuges.",
    body: [
      "Aus den Bremshundertsteln und dem Gefälle wird abgeleitet, wie schnell ein Zug auf einem Abschnitt fahren darf.",
    ],
    related: ["bremsprobe", "druckluftbremse"],
  },
  // ---- Betrieb ----
  {
    slug: "fahrdienstleiter",
    term: "Fahrdienstleiter",
    abbr: "Fdl",
    category: "Betrieb",
    short:
      "Der Fahrdienstleiter regelt vom Stellwerk aus Zugfahrten und Rangierbewegungen in seinem Bereich und ist eine zentrale betriebliche Funktion.",
    body: [
      "Triebfahrzeugführer und Fahrdienstleiter arbeiten eng zusammen: Der Fdl stellt Fahrstraßen und Signale, der Tf führt den Zug entsprechend.",
    ],
    related: ["stellwerk", "fahrstrasse", "betriebsdienst"],
  },
  {
    slug: "rangieren",
    term: "Rangieren",
    category: "Betrieb",
    short:
      "Rangieren ist das Bewegen von Fahrzeugen abseits regulärer Zugfahrten, etwa zum Zusammenstellen, Trennen oder Umsetzen von Zügen.",
    body: [
      "Rangierfahrten erfolgen meist mit niedriger Geschwindigkeit und besonderen Signalen, häufig im Bahnhof oder Rangierbahnhof.",
    ],
    related: ["rangierlokomotive", "rangierbahnhof", "rangiersignal"],
  },
  {
    slug: "zugfahrt",
    term: "Zugfahrt",
    category: "Betrieb",
    short:
      "Eine Zugfahrt ist die gesicherte Fahrt eines Zuges auf einer eingestellten Fahrstraße zwischen Bahnhöfen oder Betriebsstellen.",
    body: [
      "Im Gegensatz zur Rangierfahrt unterliegt die Zugfahrt vollständiger Signal- und Fahrstraßensicherung.",
    ],
    related: ["fahrstrasse", "rangieren"],
  },
  {
    slug: "buchfahrplan",
    term: "Buchfahrplan",
    category: "Betrieb",
    short:
      "Der Buchfahrplan ist der Fahrplan für das Triebfahrzeugpersonal mit streckenbezogenen Angaben wie Geschwindigkeiten, Halten und Besonderheiten.",
    body: [
      "Anders als der Aushangfahrplan für Fahrgäste enthält der Buchfahrplan die betrieblich notwendigen Details für die Fahrt.",
    ],
    related: ["fahrplan", "langsamfahrstelle"],
  },
  {
    slug: "fahrplan",
    term: "Fahrplan",
    category: "Betrieb",
    short:
      "Der Fahrplan legt Fahrzeiten, Halte und Trassen der Züge fest und bildet die Grundlage für einen geordneten Bahnbetrieb.",
    body: [
      "Aus dem Netzfahrplan werden die konkreten Dienst- und Buchfahrpläne für das Personal abgeleitet.",
    ],
    related: ["buchfahrplan", "zugnummer"],
  },
  {
    slug: "zugnummer",
    term: "Zugnummer",
    category: "Betrieb",
    short:
      "Die Zugnummer identifiziert einen Zug eindeutig im Betrieb und ermöglicht die Zuordnung von Fahrplan, Trasse und Disposition.",
    body: [
      "Über die Zugnummer wird ein Zug in Stellwerken, Betriebszentralen und Fahrplänen geführt.",
    ],
    related: ["fahrplan"],
  },
  {
    slug: "langsamfahrstelle",
    term: "Langsamfahrstelle",
    abbr: "La",
    category: "Betrieb",
    short:
      "Eine Langsamfahrstelle ist ein Streckenabschnitt mit vorübergehend herabgesetzter Geschwindigkeit, etwa wegen Bauarbeiten oder Mängeln.",
    body: [
      "Langsamfahrstellen werden dem Personal über Verzeichnisse und Signale bekannt gegeben, damit rechtzeitig gebremst wird.",
    ],
    related: ["buchfahrplan"],
  },
  {
    slug: "bahnuebergang",
    term: "Bahnübergang",
    abbr: "BÜ",
    category: "Betrieb",
    short:
      "Ein Bahnübergang ist die höhengleiche Kreuzung von Schiene und Straße, die durch Schranken, Lichtzeichen oder andere Sicherungen geschützt wird.",
    body: [
      "Bahnübergänge sind sicherheitskritisch; ihre Sicherung und das Verhalten bei Störungen sind Teil der betrieblichen Regeln.",
    ],
    related: ["zugfahrt"],
  },
  {
    slug: "zugfolge",
    term: "Zugfolge",
    category: "Betrieb",
    short:
      "Die Zugfolge beschreibt den zeitlichen und räumlichen Abstand aufeinanderfolgender Züge; das Blockprinzip sichert den Mindestabstand.",
    body: [
      "Eine dichte Zugfolge erhöht die Kapazität, erfordert aber leistungsfähige Sicherungstechnik wie LZB oder ETCS.",
    ],
    related: ["blockstelle", "lzb", "etcs"],
  },
  {
    slug: "betriebsdienst",
    term: "Eisenbahnbetriebsdienst",
    category: "Betrieb",
    short:
      "Der Eisenbahnbetriebsdienst umfasst alle Tätigkeiten, die den sicheren Ablauf von Zug- und Rangierfahrten gewährleisten — vom Fahren bis zur Disposition.",
    body: [
      "Triebfahrzeugführer, Fahrdienstleiter, Rangier- und Zugpersonal gehören zum Betriebsdienst. Die Ausbildung Eisenbahner im Betriebsdienst bildet hierfür aus.",
    ],
    related: ["fahrdienstleiter", "eisenbahner-im-betriebsdienst"],
  },
  {
    slug: "disponent",
    term: "Disponent / Betriebszentrale",
    category: "Betrieb",
    short:
      "Disponenten steuern in Betriebszentralen den Verkehrsablauf, lösen Konflikte und koordinieren bei Störungen die Zugfahrten.",
    body: [
      "Die Disposition ist eine mögliche Weiterentwicklung für erfahrene Triebfahrzeugführer mit Betriebskenntnis.",
    ],
    related: ["fahrdienstleiter", "betriebsdienst"],
  },
  // ---- Vorschriften ----
  {
    slug: "ebo",
    term: "Eisenbahn-Bau- und Betriebsordnung",
    abbr: "EBO",
    category: "Vorschrift",
    short:
      "Die EBO ist die zentrale Rechtsverordnung für Bau und Betrieb der Haupt- und Nebenbahnen in Deutschland und setzt sicherheitsrelevante Mindeststandards.",
    body: [
      "Die EBO regelt u. a. Anforderungen an Fahrzeuge, Strecken und Betrieb. Sie ist eine wesentliche Grundlage des deutschen Eisenbahnrechts.",
    ],
    related: ["eisenbahn-signalordnung", "fahrdienstvorschrift", "eba"],
  },
  {
    slug: "eisenbahn-signalordnung",
    term: "Signalordnung",
    category: "Vorschrift",
    short:
      "Die Signalordnung legt Aussehen und Bedeutung der Eisenbahnsignale fest und ist Grundlage der Signalkunde in der Ausbildung.",
    body: [
      "Sie definiert, welche Signalbegriffe es gibt und wie sie anzuwenden sind — von Haupt- und Vorsignalen bis zu Rangier- und Zusatzsignalen.",
    ],
    related: ["hauptsignal", "vorsignal", "rangiersignal"],
  },
  {
    slug: "fahrdienstvorschrift",
    term: "Fahrdienstvorschrift",
    category: "Vorschrift",
    short:
      "Die Fahrdienstvorschrift regelt das Fahren und Rangieren im Eisenbahnbetrieb; im DB-Regelwerk ist dies insbesondere die Richtlinie 408.",
    body: [
      "Sie beschreibt die betrieblichen Abläufe für Zug- und Rangierfahrten und ist zentraler Lerninhalt für Triebfahrzeugführer.",
    ],
    synonyms: ["Richtlinie 408", "FV"],
    related: ["betriebsdienst", "zugfahrt", "rangieren"],
  },
  {
    slug: "db-regelwerk",
    term: "DB-Regelwerk (Richtlinien)",
    category: "Vorschrift",
    short:
      "Das DB-Regelwerk ist die Sammlung interner Richtlinien (Ril), die den Betrieb auf dem Netz konkretisieren — von Fahren und Rangieren bis Signalkunde.",
    body: [
      "Die Richtlinien (z. B. 301 für Signale, 408 für Fahren und Rangieren) setzen die gesetzlichen Vorgaben betrieblich um und sind Lerngrundlage in der Ausbildung.",
    ],
    synonyms: ["Richtlinien", "Ril"],
    related: ["fahrdienstvorschrift", "eisenbahn-signalordnung"],
  },
  // ---- Qualifikation / Ausbildung / Prüfung ----
  {
    slug: "eisenbahner-im-betriebsdienst",
    term: "Eisenbahner im Betriebsdienst",
    category: "Qualifikation",
    short:
      "Eisenbahner im Betriebsdienst ist der klassische Ausbildungsberuf (u. a. Fachrichtung Lokführer und Transport), der zum Triebfahrzeugführer führen kann.",
    body: [
      "Die dreijährige duale Ausbildung vermittelt Betriebs-, Fahrzeug- und Sicherungswissen. Quereinsteiger erreichen ähnliche Qualifikationen über die Umschulung.",
    ],
    related: ["betriebsdienst", "umschulung", "tfv"],
  },
  {
    slug: "streckenkunde",
    term: "Streckenkunde",
    category: "Qualifikation",
    short:
      "Streckenkunde ist die nachzuweisende Kenntnis der zu befahrenden Strecken inklusive Signale, Geschwindigkeiten, Gefällen und Besonderheiten.",
    body: [
      "Ohne gültige Streckenkunde darf ein Triebfahrzeugführer eine Strecke nicht eigenverantwortlich befahren. Sie ist Teil der Zusatzbescheinigung.",
    ],
    related: ["fahrzeugkunde", "zusatzbescheinigung"],
  },
  {
    slug: "fahrzeugkunde",
    term: "Fahrzeugkunde",
    category: "Qualifikation",
    short:
      "Fahrzeugkunde ist die nachzuweisende Kenntnis der zu führenden Baureihen inklusive Bedienung, Technik und Verhalten bei Störungen.",
    body: [
      "Für jede Baureihe wird eine eigene Berechtigung erworben. Fahrzeug- und Streckenkunde zusammen ermöglichen den eigenverantwortlichen Einsatz.",
    ],
    related: ["streckenkunde", "baureihe", "baureihenberechtigung"],
  },
  {
    slug: "zusatzbescheinigung",
    term: "Zusatzbescheinigung",
    category: "Qualifikation",
    short:
      "Die Zusatzbescheinigung ergänzt den Triebfahrzeugführerschein und weist die konkreten Fahrzeuge, Strecken und das Eisenbahnverkehrsunternehmen aus.",
    body: [
      "Während der Führerschein die grundsätzliche Befähigung bestätigt, konkretisiert die Zusatzbescheinigung den tatsächlichen Einsatzrahmen.",
    ],
    related: ["tfv", "streckenkunde", "fahrzeugkunde"],
  },
  {
    slug: "baureihenberechtigung",
    term: "Baureihenberechtigung",
    category: "Qualifikation",
    short:
      "Die Baureihenberechtigung erlaubt das Führen einer bestimmten Fahrzeugbaureihe und wird über die entsprechende Fahrzeugkunde erworben.",
    body: [
      "Wechselt ein Triebfahrzeugführer auf eine neue Baureihe, ist eine zusätzliche Qualifizierung erforderlich.",
    ],
    related: ["fahrzeugkunde", "baureihe"],
  },
  {
    slug: "tf-pruefung",
    term: "Triebfahrzeugführer-Prüfung",
    category: "Qualifikation",
    short:
      "Die Tf-Prüfung umfasst einen theoretischen und einen praktischen Teil und ist Voraussetzung für die Erteilung des Triebfahrzeugführerscheins.",
    body: [
      "Geprüft werden u. a. Betriebsvorschriften, Signal-, Fahrzeug- und Streckenkunde sowie die praktische Fahrt. Sie schließt Ausbildung oder Umschulung ab.",
    ],
    related: ["tfv", "umschulung", "eisenbahner-im-betriebsdienst"],
  },
  {
    slug: "azav",
    term: "AZAV-Zulassung",
    abbr: "AZAV",
    category: "Qualifikation",
    short:
      "Die AZAV (Akkreditierungs- und Zulassungsverordnung Arbeitsförderung) regelt, welche Bildungsträger und Maßnahmen über Bildungsgutschein förderfähig sind.",
    body: [
      "Nur nach AZAV zugelassene Maßnahmen können über den Bildungsgutschein gefördert werden. Die Zulassung ist daher ein wichtiges Qualitätsmerkmal von Umschulungen.",
    ],
    related: ["bildungsgutschein", "fbw", "umschulung"],
  },
  {
    slug: "ausbildung-lokfuehrer",
    term: "Ausbildung zum Lokführer",
    category: "Qualifikation",
    short:
      "Die klassische Ausbildung zum Lokführer erfolgt meist als dreijährige duale Ausbildung Eisenbahner im Betriebsdienst, Fachrichtung Lokführer und Transport.",
    body: [
      "Sie richtet sich vor allem an Berufseinsteiger. Wer aus einem anderen Beruf wechselt, nutzt in der Regel die kürzere Umschulung.",
    ],
    related: ["eisenbahner-im-betriebsdienst", "umschulung", "quereinstieg"],
  },
  // ---- Förderung ----
  {
    slug: "fbw",
    term: "Förderung der beruflichen Weiterbildung",
    abbr: "FbW",
    category: "Förderung",
    short:
      "Die Förderung der beruflichen Weiterbildung (FbW) ist das Instrument nach SGB III, über das u. a. der Bildungsgutschein für Umschulungen ausgegeben wird.",
    body: [
      "Über die FbW können Lehrgangskosten und teils Begleitkosten einer zugelassenen Maßnahme übernommen werden. Die Entscheidung trifft die Agentur für Arbeit oder das Jobcenter.",
    ],
    related: ["bildungsgutschein", "azav", "agentur-fuer-arbeit"],
  },
  // ---- Behörden / Institutionen ----
  {
    slug: "era",
    term: "EU-Eisenbahnagentur",
    abbr: "ERA",
    category: "Behörde",
    short:
      "Die European Union Agency for Railways (ERA) ist die Eisenbahnagentur der EU und arbeitet an einheitlichen Sicherheits- und Interoperabilitätsstandards.",
    body: [
      "Die ERA fördert ein einheitliches europäisches Eisenbahnsystem, u. a. im Zusammenhang mit ERTMS/ETCS und gegenseitiger Anerkennung von Zulassungen.",
    ],
    related: ["ertms", "etcs", "eba"],
  },
  {
    slug: "evu",
    term: "Eisenbahnverkehrsunternehmen",
    abbr: "EVU",
    category: "Behörde",
    short:
      "Ein Eisenbahnverkehrsunternehmen (EVU) erbringt Verkehrsleistungen auf der Schiene — also Personen- oder Güterverkehr — und ist der typische Arbeitgeber für Lokführer.",
    body: [
      "EVU nutzen die Infrastruktur der Eisenbahninfrastrukturunternehmen (EIU). Beispiele sind DB Regio, DB Cargo oder Wettbewerber wie metronom und Captrain.",
    ],
    related: ["eiu", "db-regio", "deutsche-bahn"],
  },
  {
    slug: "eiu",
    term: "Eisenbahninfrastrukturunternehmen",
    abbr: "EIU",
    category: "Behörde",
    short:
      "Ein Eisenbahninfrastrukturunternehmen (EIU) betreibt die Schieneninfrastruktur (Gleise, Signale, Bahnhöfe) und stellt sie den Verkehrsunternehmen zur Verfügung.",
    body: [
      "Das größte EIU in Deutschland ist DB InfraGO. EIU und EVU sind organisatorisch getrennt.",
    ],
    related: ["evu", "db-infrago"],
  },
  {
    slug: "db-infrago",
    term: "DB InfraGO",
    category: "Behörde",
    short:
      "DB InfraGO ist die gemeinwohlorientierte Infrastruktursparte der Deutschen Bahn, die 2024 u. a. aus DB Netz hervorgegangen ist und das Schienennetz betreibt.",
    body: [
      "DB InfraGO verantwortet Netz und Bahnhöfe und ist damit das zentrale Eisenbahninfrastrukturunternehmen in Deutschland.",
    ],
    synonyms: ["DB Netz"],
    related: ["eiu", "deutsche-bahn"],
  },
  {
    slug: "bundesnetzagentur",
    term: "Bundesnetzagentur",
    abbr: "BNetzA",
    category: "Behörde",
    short:
      "Die Bundesnetzagentur ist u. a. Regulierungsbehörde für den diskriminierungsfreien Zugang zur Eisenbahninfrastruktur in Deutschland.",
    body: [
      "Sie überwacht den Wettbewerb auf der Schiene, etwa beim Zugang zu Trassen und Anlagen.",
    ],
    related: ["eba", "eiu"],
  },
  {
    slug: "bmdv",
    term: "Bundesministerium für Verkehr",
    abbr: "BMDV",
    category: "Behörde",
    short:
      "Das Bundesministerium für Digitales und Verkehr (BMDV) ist auf Bundesebene für die Verkehrspolitik einschließlich der Eisenbahn zuständig.",
    body: [
      "Dem Geschäftsbereich des Ministeriums sind nachgeordnete Behörden wie das Eisenbahn-Bundesamt zugeordnet.",
    ],
    related: ["eba"],
  },
  {
    slug: "agentur-fuer-arbeit",
    term: "Agentur für Arbeit",
    category: "Behörde",
    short:
      "Die Agentur für Arbeit entscheidet über Leistungen der Arbeitsförderung — darunter den Bildungsgutschein für eine geförderte Umschulung.",
    body: [
      "Für Empfänger von Arbeitslosengeld II ist häufig das Jobcenter zuständig. Beide entscheiden individuell über die Förderung.",
    ],
    related: ["jobcenter", "bildungsgutschein", "fbw"],
  },
  {
    slug: "jobcenter",
    term: "Jobcenter",
    category: "Behörde",
    short:
      "Das Jobcenter betreut Empfänger von Grundsicherung und kann — wie die Agentur für Arbeit — Bildungsgutscheine für Umschulungen ausgeben.",
    body: [
      "Die Zuständigkeit (Agentur für Arbeit oder Jobcenter) hängt von der individuellen Situation ab.",
    ],
    related: ["agentur-fuer-arbeit", "bildungsgutschein"],
  },
  // ---- Karriere / Arbeit ----
  {
    slug: "schichtdienst",
    term: "Schichtdienst",
    category: "Karriere",
    short:
      "Der Lokführerberuf ist Schichtdienst: Früh-, Spät-, Nacht- und Wochenenddienste gehören dazu und werden über Zulagen vergütet.",
    body: [
      "Der Schichtdienst erfordert Flexibilität, bietet aber durch Zulagen ein spürbar höheres Effektivgehalt als die Grundvergütung allein.",
    ],
    related: ["zulagen", "tarifvertrag"],
  },
  {
    slug: "zulagen",
    term: "Zulagen",
    category: "Karriere",
    short:
      "Zulagen sind tarifliche Zuschläge für Schicht-, Nacht-, Sonntags- und Feiertagsarbeit, die das Gehalt von Lokführern deutlich erhöhen können.",
    body: [
      "Da der Beruf im Schichtdienst stattfindet, machen Zulagen einen wesentlichen Teil des Effektivgehalts aus. Höhe und Art richten sich nach dem Tarifvertrag.",
    ],
    related: ["schichtdienst", "tarifvertrag"],
  },
  {
    slug: "tarifvertrag",
    term: "Tarifvertrag",
    category: "Karriere",
    short:
      "Tarifverträge regeln Gehalt, Arbeitszeit und Zulagen der Lokführer; im Bahnbereich sind v. a. die Gewerkschaften EVG und GDL relevant.",
    body: [
      "Je nach Arbeitgeber und Tarifbindung unterscheiden sich Eingruppierung und Zulagen, was die Gehaltsunterschiede zwischen Unternehmen erklärt.",
    ],
    related: ["evg", "gdl", "zulagen"],
  },
  {
    slug: "gdl",
    term: "Gewerkschaft Deutscher Lokomotivführer",
    abbr: "GDL",
    category: "Karriere",
    short:
      "Die GDL ist die Berufsgewerkschaft der Lokomotivführer und weiterer Berufsgruppen und schließt eigene Tarifverträge im Bahnbereich ab.",
    body: [
      "Die GDL vertritt vor allem das Fahrpersonal und verhandelt Tarifverträge, die Gehalt und Arbeitsbedingungen beeinflussen.",
    ],
    related: ["evg", "tarifvertrag"],
  },
  {
    slug: "evg",
    term: "Eisenbahn- und Verkehrsgewerkschaft",
    abbr: "EVG",
    category: "Karriere",
    short:
      "Die EVG ist eine große Gewerkschaft im Eisenbahn- und Verkehrssektor und schließt Tarifverträge für zahlreiche Berufsgruppen ab.",
    body: [
      "Die EVG vertritt ein breites Spektrum an Beschäftigten und ist neben der GDL ein zentraler Tarifpartner im Bahnbereich.",
    ],
    related: ["gdl", "tarifvertrag"],
  },
  {
    slug: "lehrlokfuehrer",
    term: "Lehrlokführer",
    category: "Karriere",
    short:
      "Ein Lehrlokführer bildet angehende Triebfahrzeugführer praktisch aus und begleitet sie bei der Fahrausbildung — eine typische Entwicklungsmöglichkeit.",
    body: [
      "Erfahrene Triebfahrzeugführer können sich zum Lehrlokführer (Ausbilder) weiterentwickeln und so ihr Wissen weitergeben.",
    ],
    related: ["disponent", "betriebsdienst"],
  },
  // ---- Infrastruktur ----
  {
    slug: "normalspur",
    term: "Normalspur (Regelspur)",
    category: "Infrastruktur",
    short:
      "Die Normalspur bezeichnet die Standard-Spurweite von 1.435 mm, die in Deutschland und großen Teilen Europas verwendet wird.",
    body: [
      "Die einheitliche Spurweite ist Voraussetzung für durchgehenden Verkehr über Netz- und Ländergrenzen hinweg.",
    ],
    synonyms: ["Regelspur"],
    related: ["lichtraumprofil", "schienennetz"],
  },
  {
    slug: "schienennetz",
    term: "Schienennetz",
    category: "Infrastruktur",
    short:
      "Das Schienennetz ist die Gesamtheit der Bahnstrecken; in Deutschland wird der größte Teil von DB InfraGO betrieben.",
    body: [
      "Das Netz gliedert sich u. a. in Haupt- und Nebenbahnen sowie Schnellfahrstrecken und bestimmt, wo Verkehr möglich ist.",
    ],
    related: ["db-infrago", "schnellfahrstrecke", "hauptbahn"],
  },
  {
    slug: "bahnhof",
    term: "Bahnhof",
    category: "Infrastruktur",
    short:
      "Ein Bahnhof ist eine Betriebsstelle mit mindestens einer Weiche, an der Züge beginnen, enden, halten, kreuzen oder überholen können.",
    body: [
      "Bahnhöfe sind betrieblich definiert (nicht nur als Halt für Fahrgäste) und spielen für Fahrstraßen und Zugfolge eine zentrale Rolle.",
    ],
    related: ["fahrstrasse", "rangierbahnhof"],
  },
  {
    slug: "rangierbahnhof",
    term: "Rangierbahnhof",
    category: "Infrastruktur",
    short:
      "Ein Rangierbahnhof dient dem Zusammenstellen und Auflösen von Güterzügen; hier werden Wagen sortiert und zu neuen Zügen gebildet.",
    body: [
      "Große Rangierbahnhöfe sind Knotenpunkte des Güterverkehrs und Einsatzort für Rangierloks und -personal.",
    ],
    related: ["rangieren", "rangierlokomotive", "db-cargo"],
  },
  {
    slug: "gleisanschluss",
    term: "Gleisanschluss",
    category: "Infrastruktur",
    short:
      "Ein Gleisanschluss verbindet ein Werk oder einen Industriebetrieb direkt mit dem Schienennetz und ermöglicht Güterverkehr bis zum Kunden.",
    body: [
      "Gleisanschlüsse sind wichtig für den Schienengüterverkehr und werden häufig im Rangierbetrieb bedient.",
    ],
    related: ["rangieren", "db-cargo"],
  },
  {
    slug: "schnellfahrstrecke",
    term: "Schnellfahrstrecke",
    abbr: "SFS",
    category: "Infrastruktur",
    short:
      "Eine Schnellfahrstrecke ist für hohe Geschwindigkeiten ausgelegt und meist mit moderner Zugbeeinflussung (LZB/ETCS) ausgerüstet.",
    body: [
      "Auf Schnellfahrstrecken verkehren vor allem Fernverkehrszüge wie der ICE. Sie stellen besondere Anforderungen an Fahrzeuge und Personal.",
    ],
    related: ["ice", "lzb", "etcs"],
  },
  {
    slug: "hauptbahn",
    term: "Haupt- und Nebenbahn",
    category: "Infrastruktur",
    short:
      "Hauptbahnen sind stark belastete, höher ausgebaute Strecken; Nebenbahnen sind geringer belastete Strecken mit einfacheren Anforderungen.",
    body: [
      "Die Einstufung als Haupt- oder Nebenbahn beeinflusst zulässige Geschwindigkeiten, Ausrüstung und betriebliche Regeln nach EBO.",
    ],
    related: ["ebo", "schienennetz"],
  },
  // ---- Technik / Sicherheit (Ergänzung) ----
  {
    slug: "sifa",
    term: "Sicherheitsfahrschaltung",
    abbr: "Sifa",
    category: "Technik",
    short:
      "Die Sifa (Sicherheitsfahrschaltung) überwacht die Handlungsfähigkeit des Triebfahrzeugführers; bleibt eine Bedienung aus, löst sie eine Zwangsbremsung aus.",
    body: [
      "Die Sifa ist eine Totmanneinrichtung: Der Triebfahrzeugführer muss regelmäßig ein Bedienelement betätigen. Reagiert er nicht, hält das System den Zug automatisch an.",
    ],
    synonyms: ["Totmanneinrichtung"],
    related: ["zwangsbremsung", "zugbeeinflussung"],
  },
  {
    slug: "indusi",
    term: "Induktive Zugsicherung",
    abbr: "Indusi",
    category: "Technik",
    short:
      "Indusi (induktive Zugsicherung) ist die historische Bezeichnung und Grundlage der heutigen punktförmigen Zugbeeinflussung (PZB).",
    body: [
      "Aus der Indusi entwickelte sich die PZB. Das Grundprinzip — induktive Beeinflussung zwischen Gleismagnet und Fahrzeug — ist bis heute Teil der Zugbeeinflussung.",
    ],
    related: ["pzb", "zugbeeinflussung"],
  },
  {
    slug: "zwangsbremsung",
    term: "Zwangsbremsung",
    category: "Bremse",
    short:
      "Eine Zwangsbremsung ist eine vom Sicherungssystem (z. B. PZB, LZB, ETCS oder Sifa) automatisch ausgelöste Schnellbremsung.",
    body: [
      "Die Zwangsbremsung greift ein, wenn der Triebfahrzeugführer nicht regelkonform handelt — etwa bei Überschreiten der zulässigen Geschwindigkeit oder fehlender Sifa-Bedienung.",
    ],
    related: ["sifa", "pzb", "notbremse"],
  },
  // ---- Fahrzeug (Ergänzung) ----
  {
    slug: "triebfahrzeug",
    term: "Triebfahrzeug",
    category: "Fahrzeug",
    short:
      "Ein Triebfahrzeug ist ein angetriebenes Schienenfahrzeug — also eine Lokomotive oder ein Triebwagen/Triebzug. Es wird vom Triebfahrzeugführer geführt.",
    body: [
      "Der Begriff fasst alle Fahrzeuge mit eigenem Antrieb zusammen. Vom Triebfahrzeug leitet sich auch die Berufsbezeichnung Triebfahrzeugführer ab.",
    ],
    related: ["lokomotive", "triebzug", "triebfahrzeugfuehrer"],
  },
  {
    slug: "fuehrerstand",
    term: "Führerstand",
    category: "Fahrzeug",
    short:
      "Der Führerstand ist der Arbeitsplatz des Triebfahrzeugführers im Fahrzeug mit den Bedien-, Anzeige- und Sicherungselementen.",
    body: [
      "Vom Führerstand aus steuert der Triebfahrzeugführer das Fahrzeug, überwacht die Anzeigen der Zugbeeinflussung und bedient die Bremse.",
    ],
    related: ["triebfahrzeug", "zugbeeinflussung"],
  },
  {
    slug: "schraubenkupplung",
    term: "Schraubenkupplung",
    category: "Fahrzeug",
    short:
      "Die Schraubenkupplung ist die klassische, manuell zu bedienende Kupplung im europäischen Eisenbahnverkehr zum Verbinden von Fahrzeugen.",
    body: [
      "Sie wird vor allem im Wagen- und Güterverkehr eingesetzt. Triebzüge nutzen dagegen häufig automatische Kupplungen.",
    ],
    related: ["rangieren", "triebzug"],
  },
  {
    slug: "spurkranz",
    term: "Spurkranz",
    category: "Technik",
    short:
      "Der Spurkranz ist der innen vorstehende Rand des Eisenbahnrads, der das Fahrzeug in der Spur hält und ein Entgleisen verhindert.",
    body: [
      "Spurkranz und Schienenkopf führen das Rad. Zusammen mit der konischen Radlauffläche sorgt das für den sicheren Lauf in der Spur.",
    ],
    related: ["normalspur"],
  },
  {
    slug: "bahnstrom",
    term: "Bahnstrom",
    category: "Infrastruktur",
    short:
      "Bahnstrom bezeichnet die Energieversorgung elektrischer Bahnen; in Deutschland wird die Fahrleitung mit 15 kV bei 16,7 Hz betrieben.",
    body: [
      "Das deutsche Bahnstromsystem unterscheidet sich vom öffentlichen Netz. Über die Oberleitung gelangt der Strom zum Stromabnehmer der Fahrzeuge.",
    ],
    related: ["oberleitung", "stromabnehmer", "elektrolokomotive"],
  },
  // ---- Betrieb / Verkehr (Ergänzung) ----
  {
    slug: "nahverkehr",
    term: "Schienenpersonennahverkehr",
    abbr: "SPNV",
    category: "Betrieb",
    short:
      "Der Schienenpersonennahverkehr (SPNV) umfasst Regional- und S-Bahn-Verkehr und ist das häufigste Einsatzfeld für neu ausgebildete Lokführer.",
    body: [
      "Der SPNV wird von den Ländern bestellt und von EVU wie DB Regio oder Wettbewerbern betrieben. Er bietet meist planbare, wohnortnahe Dienste.",
    ],
    related: ["fernverkehr", "gueterverkehr", "verkehrsverbund"],
  },
  {
    slug: "fernverkehr",
    term: "Schienenpersonenfernverkehr",
    abbr: "SPFV",
    category: "Betrieb",
    short:
      "Der Schienenpersonenfernverkehr (SPFV) verbindet über lange Strecken die großen Zentren, in Deutschland vor allem mit ICE und Intercity.",
    body: [
      "Der Fernverkehr wird in Deutschland überwiegend eigenwirtschaftlich von DB Fernverkehr betrieben und nutzt häufig Schnellfahrstrecken.",
    ],
    related: ["nahverkehr", "ice", "schnellfahrstrecke"],
  },
  {
    slug: "gueterverkehr",
    term: "Schienengüterverkehr",
    abbr: "SGV",
    category: "Betrieb",
    short:
      "Der Schienengüterverkehr (SGV) transportiert Güter per Bahn — im Einzelwagen- und Ganzzugverkehr, häufig grenzüberschreitend.",
    body: [
      "Der Güterverkehr ist durch Nacht- und Wochenenddienste geprägt und bietet wegen der Zulagen oft ein höheres Effektivgehalt. Anbieter sind u. a. DB Cargo, Captrain und RheinCargo.",
    ],
    related: ["nahverkehr", "rangierbahnhof", "gefahrgut"],
  },
  {
    slug: "verkehrsverbund",
    term: "Verkehrsverbund",
    category: "Betrieb",
    short:
      "Ein Verkehrsverbund ist ein Zusammenschluss von Verkehrsunternehmen mit einheitlichem Tarif und abgestimmten Fahrplänen in einer Region.",
    body: [
      "Verkehrsverbünde organisieren den Nahverkehr aus Fahrgastsicht. Für Lokführer sind sie der Rahmen, in dem viele Nahverkehrslinien betrieben werden.",
    ],
    related: ["nahverkehr"],
  },
  {
    slug: "gefahrgut",
    term: "Gefahrgut",
    category: "Betrieb",
    short:
      "Gefahrgut sind gefährliche Güter, deren Transport auf der Schiene besonderen Vorschriften (international dem RID) unterliegt.",
    body: [
      "Der Gefahrguttransport stellt erhöhte Anforderungen an Kennzeichnung, Handhabung und Personal und ist vor allem im Güterverkehr relevant.",
    ],
    related: ["gueterverkehr"],
  },
  {
    slug: "ebula",
    term: "Elektronischer Buchfahrplan",
    abbr: "EBuLa",
    category: "Betrieb",
    short:
      "Der elektronische Buchfahrplan (EBuLa) zeigt dem Triebfahrzeugpersonal Fahrplan- und Streckendaten digital im Führerstand an.",
    body: [
      "EBuLa ersetzt den gedruckten Buchfahrplan durch eine elektronische Anzeige und kann u. a. Langsamfahrstellen aktuell einspielen.",
    ],
    related: ["buchfahrplan", "langsamfahrstelle", "fuehrerstand"],
  },
];
