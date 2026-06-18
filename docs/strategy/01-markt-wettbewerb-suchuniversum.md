# Kapitel 01 — Marktanalyse, Wettbewerbsanalyse, Suchuniversum

> Output-Bausteine 1–3. Liefert das Marktmodell, die Lücken im Wettbewerb und das
> vollständige Suchuniversum, auf das alle weiteren Kapitel aufsetzen.

---

## 1. Marktanalyse — Zerlegung der Bahnbranche

Die Branche wird in 15 Dimensionen zerlegt. Jede Dimension ist später ein Hub-Typ
(siehe [Kapitel 03](03-informationsarchitektur-urls-content.md)) und ein Entitätscluster
(siehe [Kapitel 02](02-entitaeten-knowledge-graph.md)).

### 1.1 Berufe (Kernfeld)
- Triebfahrzeugführer / Lokführer (Personen-, Güter-, Rangier-, Werkverkehr)
- Eisenbahner im Betriebsdienst (Fachrichtung Lokführer/Transport, Fachrichtung Fahrweg)
- Zugbegleiter / Kundenbetreuer im Nahverkehr
- Rangierbegleiter, Wagenmeister, Bremsprobenberechtigte
- Fahrdienstleiter, Disponent, Zugverkehrssteuerer
- Instandhaltung: Mechatroniker/Elektroniker für Schienenfahrzeuge
- Oberbau-/Fahrwegberufe (Gleisbau, Signalmechanik)
- Ausbilder / Triebfahrzeugführer-Ausbilder

### 1.2 Qualifikationen & Berechtigungen
- Triebfahrzeugführerschein nach TfV (Klassen A/B), EU-Führerschein für Triebfahrzeugführer
- Zusatzbescheinigung (fahrzeug- und streckenbezogen)
- PZB/LZB/ETCS-Berechtigungen, Bremsprobenberechtigung, Rangierberechtigung
- Medizinische Tauglichkeit (Anlage zur TfV) und psychologische Eignung (Tauglichkeitsuntersuchung)
- Sprachniveau Deutsch (sicherheitsrelevant)

### 1.3 Arbeitgeber (Auswahl, später vollständig im Arbeitgeberatlas)
- DB-Konzern: DB Regio, DB Fernverkehr, DB Cargo, DB InfraGO
- Wettbewerbsbahnen Personenverkehr: Go-Ahead, Transdev (u. a. NordWestBahn), ODEG, NEB,
  Abellio-Nachfolger, Erixx, Vlexx, Agilis, BRB, Metronom, eurobahn
- Güterverkehr: SBB Cargo Deutschland, Captrain, RheinCargo, TX Logistik, Lineas, Metrans
- Werks-/Industriebahnen, Hafenbahnen, Eisenbahnverkehrsunternehmen (EVU) regional
- Personaldienstleister/Gestellung von Triebfahrzeugführern

### 1.4 Regionen
- 16 Bundesländer als Regional-Hubs
- Relevante Ballungs-/Pendlerräume und Knoten (Berlin/Brandenburg, Rhein-Ruhr, Rhein-Main,
  Stuttgart, München, Hamburg, Leipzig/Halle, Nürnberg)
- **Eigene Standorte als Anker:** Berlin und Saalfeld (entspricht `PreferredLocation` im Funnel)

### 1.5 Förderungen
- Bildungsgutschein (SGB III, § 81/§ 82) — Kern des bestehenden Funnels
- AVGS (Aktivierungs- und Vermittlungsgutschein)
- Qualifizierungschancengesetz / Beschäftigtenqualifizierung (für `EMPLOYED`-Pfad)
- Förderung durch Jobcenter (SGB II), Reha-/Sonderfälle
- Regionale Programme, ESF-kofinanzierte Maßnahmen

### 1.6 Prüfungen
- Theoretische und praktische TfV-Prüfung
- Eisenbahn-Bundesamt (EBA) als Aufsichts-/Anerkennungsinstanz
- Medizinische Untersuchung, psychologische Eignungsuntersuchung
- Fahrzeug-/Streckenkunde-Prüfungen, wiederkehrende Fortbildungen

### 1.7 Karrierepfade
- Quereinstieg → Umschulung → Triebfahrzeugführer → Senior/Ausbilder/Disposition
- Aufstieg in Leitstelle, Sicherheits-/Betriebsleitung, EBL-Funktionen
- Wechsel Personen-/Güterverkehr, Tarif-/Arbeitgeberwechsel

### 1.8 Gehälter
- Einstieg vs. erfahren, Personen- vs. Güterverkehr, DB-Tarif vs. Wettbewerber
- Zulagen (Schicht, Nacht, Sonntag, Feiertag), regionale Unterschiede
- Datenbasis später: Gehaltsatlas (siehe [Kapitel 04](04-daten-und-tools.md))

### 1.9 Vorschriften & Regelwerk
- TfV, EBO, ESBO, Fahrdienstvorschrift (Ril 408), Signalbuch (Ril 301)
- EU-Richtlinien (Triebfahrzeugführerschein-Richtlinie), TSI
- Arbeitszeit (ArbZG, Tarifverträge), Sicherheitsmanagement

### 1.10 Technologien & 1.11 Fahrzeuge & 1.12 Signalsysteme
- Zugbeeinflussung: PZB 90, LZB, ETCS (Level 1/2), GSM-R/FRMCS
- Fahrzeugfamilien: Talent, FLIRT, Coradia, Desiro, Vectron, TRAXX, ICE-Baureihen
- Brems-/Antriebsarten, Stellwerkstechnik, digitale Schiene

### 1.13 Ausbildungsträger & 1.14 Umschulungsanbieter
- Anbieter zertifizierter Maßnahmen (AZAV) für die Lokführer-Umschulung
- DB-eigene Qualifizierung vs. private Bildungsträger
- Lokführerzentrum als Vorbereitungs-/Vermittlungs-Layer (eigener USP)

### 1.15 Arbeitsmarktsegmente
- Arbeitssuchende/Arbeitslose (`UNEMPLOYED`-Pfad), Beschäftigte mit Wechselabsicht (`EMPLOYED`-Pfad)
- Berufsrückkehrer, Geflüchtete mit Sprachniveau, Zeitarbeit→Festanstellung
- Fachkräftemangel-Segment: hoher struktureller Bedarf, demografischer Ersatzbedarf

---

## 2. Wettbewerbsanalyse — wer hält heute welche Position

Bewertung je Wettbewerbertyp: Stärke (S), strukturelle Schwäche/Lücke (L), Implikation für uns (→).

| Wettbewerbertyp | Beispiele | Stärke (S) | Lücke (L) | Implikation (→) |
|---|---|---|---|---|
| Arbeitgeber-Karriereseiten | DB Karriere, Wettbewerbsbahnen | Markenvertrauen, Stellen | Nur Eigeninteresse, keine neutralen Vergleiche/Daten, keine Förderlogik | → Neutralität + Förder-/Gehaltsvergleich besetzen |
| Jobbörsen | StepStone, Indeed, Bahnjobs | Stellenvolumen, Traffic | Thin Content, keine Tiefe zu Umschulung/Förderung/Eignung | → Tiefe + Entscheidungshilfen statt Stellenliste |
| Weiterbildungsportale | Kursnet (BA), Springest, kursfinder | Anbieterabdeckung | Generisch, kein Bahn-Fokus, keine eigenen Daten | → Bahn-spezifischer Umschulungs-/BG-Atlas |
| Enzyklopädien | Wikipedia, Wikidata | Autorität, LLM-Quelle | Kein Karriere-/Förder-/Conversion-Layer, keine Aktualität bei Gehalt/Markt | → Entity-Linking nutzen, mit Daten ergänzen, die Wikipedia nicht führt |
| Verlags-/Fachmedien | Tagespresse, Branchendienste | Reichweite, Zitierbarkeit | Punktuell, keine kontinuierliche Datenreihe | → Eigene Datenreihen liefern, die Medien zitieren |
| Foren/Communities | Drehscheibe-Online, Reddit | Authentische Erfahrungen | Unstrukturiert, schlecht retrievbar | → Strukturierte FAQ/Erfahrungsdaten aufbereiten |
| Behörden | BA, EBA, Bundesnetzagentur | Primärquelle, Vertrauen | Sperrige Sprache, keine Nutzerführung, keine Tools | → Übersetzen, verknüpfen, mit Tools nutzbar machen |

### 2.1 Strukturelle Marktlücke (die These)
Es gibt **keine neutrale, datengetriebene, aktuell gepflegte deutschsprachige Instanz**, die
Beruf + Qualifikation + Förderung + Gehalt + Arbeitgeber + Region + Eignung **verbindet** und
in Werkzeuge übersetzt. Genau diese Verbindung ist verteidigbar, weil sie (a) proprietäre Daten,
(b) einen funktionierenden Conversion-/Recruiting-Motor und (c) kontinuierliche Pflege erfordert —
drei Dinge, die einzelne Wettbewerber je nur teilweise besitzen.

---

## 3. Suchuniversum

Das Suchuniversum wird **entitäts- × intentbasiert** aufgespannt (nicht keywordbasiert). Pro
Entität aus [Kapitel 02](02-entitaeten-knowledge-graph.md) werden sieben Intent-Typen bedient.

### 3.1 Intent-Typen
| Intent | Frageform des Nutzers | Antworttyp / Seitentyp |
|---|---|---|
| Informational | "Was ist…", "Wie funktioniert…" | Wiki-/Glossar-/Pillar-Seite mit Information Gain |
| Commercial Investigation | "beste Umschulung…", "DB vs. Wettbewerber Gehalt" | Vergleichs-/Daten-/Ranking-Seite |
| Transactional | "Umschulung Lokführer starten", "Bildungsgutschein beantragen" | Conversion-Hub → Eignungscheck |
| Local | "Lokführer Umschulung Berlin", "…Saalfeld/Bundesland" | Regional-Hub |
| Career | "Quereinstieg Lokführer", "Karriere ohne Ausbildung" | Career-Hub + Karriereplaner-Tool |
| Research/Daten | "Lokführer Gehalt 2026", "Fachkräftemangel Bahn" | Datenportal/Report (PR- & Citation-Asset) |
| AI Retrieval | LLM-Antwortbedarf, faktische Zusammenfassung | Strukturierte, schema-ausgezeichnete, zitierfähige Fakten |

### 3.2 Intent-Cluster je Kern-Entität (Beispiele)

**Lokführer / Triebfahrzeugführer**
- Informational: Aufgaben, Arbeitszeiten, Voraussetzungen, Tauglichkeit, Unterschied Lokführer/Tf
- Commercial: Umschulung vs. Ausbildung, Anbietervergleich, Dauer, Kosten/Förderung
- Transactional: Umschulung starten, Eignung prüfen, Bildungsgutschein
- Local: je Bundesland/Stadt + Standorte Berlin/Saalfeld
- Career: Quereinstieg, Mindestalter, mit/ohne Schulabschluss, zweiter Bildungsweg
- Research: Gehalt aktuell, Bedarf, offene Stellen, Tarifentwicklung
- AI Retrieval: knappe, belegte Definitionen + Zahlen

**Bildungsgutschein**
- Was ist er, wer hat Anspruch, wie beantragen, welche Unterlagen, employed vs. unemployed
- Conversion direkt an `EligibilityWizard` und CRM-Pipeline gekoppelt

**Bahnarbeitsmarkt / Fachkräftemangel**
- Research-/Daten-getrieben → speist Reports und Digital PR ([Kapitel 06](06-conversion-digital-pr.md))

### 3.3 Abdeckungsprinzip
Keine relevante Suchintention bleibt unbeantwortet — aber jede Antwortseite muss den
Information-Gain- und Retrieval-Dominanz-Test bestehen. Reine Volumenabdeckung ohne Mehrwert
ist verboten (siehe Anti-Ziele in [README](README.md#3-optimierungsziele-und-anti-ziele)).

---

## 4. Umsetzung (PHASE 1–4)

**PHASE 1 — Fundament (Monat 0–3)**
- Marktmodell als maschinenlesbares Taxonomie-Schema festschreiben (Quelle für Hubs & Graph).
- Top-50 Kern-Entitäten und ihre Intent-Cluster priorisieren (Kern: Lokführer, Umschulung,
  Bildungsgutschein, Quereinstieg, Gehalt, Standorte Berlin/Saalfeld).
- Wettbewerbs-Lückenkarte je Top-Entität (wo fehlt strukturierte Info/Daten/Tools).

**PHASE 2 — Abdeckung (Monat 3–9)**
- Intent-Matrix für die Top-200 Entitäten vervollständigen.
- Regional- und Arbeitgeber-Dimension systematisch erfassen (Input für Atlas & programmatische Hubs).

**PHASE 3 — Dominanz (Monat 9–18)**
- Kontinuierliche Lückenanalyse gegen LLM-Antworten ([Kapitel 05](05-trust-schema-geo-aeo-llmo.md)).
- Marktsegment-Monitoring (Fachkräftemangel, Tarif) als wiederkehrende Datenreihe.

**PHASE 4 — Institutionalisierung (Monat 18–36)**
- Suchuniversum als lebendes Marktmodell pflegen; jährliche Re-Kalibrierung mit Realdaten aus CRM.
