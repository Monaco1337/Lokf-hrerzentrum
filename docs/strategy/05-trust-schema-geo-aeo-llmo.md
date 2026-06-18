# Kapitel 05 — Trust, Schema, GEO, AEO, LLMO & Retrieval Dominance

> Output-Bausteine 11–15. Macht die Inhalte vertrauenswürdig (E-E-A-T), maschinenlesbar (Schema)
> und in generativer Suche/LLMs bevorzugt zitierbar (GEO/AEO/LLMO + Retrieval-Dominanz).

---

## 1. Trust Engine (E-E-A-T)

### 1.1 Bausteine
| Baustein | Inhalt | URL/Ort |
|---|---|---|
| Expertenprofile | Bahn-Fachleute mit Qualifikation, Erfahrung, Foto | `/team/<person>` |
| Autorenprofile | Wer hat geschrieben, mit Belegen | je Artikel + `/autoren/<person>` |
| Reviewer | Fachliche Prüfung (med./psych./rechtlich) | "Geprüft von …" auf Seite |
| Transparenzseiten | Wer wir sind, Geschäftsmodell, Unabhängigkeit | `/transparenz` |
| Methodikseiten | Wie Daten erhoben/berechnet werden | `/methodik/<dataset>` |
| Quellenverzeichnisse | Belegte Primärquellen je Seite | Fußbereich je Seite + `/quellen` |
| Qualitätsrichtlinien | Redaktions-/Datenstandards | `/qualitaet` |
| Änderungsprotokolle | Was wann geändert wurde | je Seite "Zuletzt aktualisiert" + Changelog |
| Aktualisierungshistorie | Versionsstände von Datensätzen | je Dataset |

### 1.2 E-E-A-T-Maximierung
- **Experience:** echte Prozess-/Erfahrungsdaten aus dem Recruiting-Betrieb (anonymisiert),
  Praxis-Hinweise (z. B. AA-Termin-Vorbereitung) — etwas, das reine Content-Seiten nicht haben.
- **Expertise:** namentliche Fachautoren/Reviewer mit Bahnhintergrund.
- **Authoritativeness:** konsistentes Entity-Linking, eigene zitierte Datensätze, Backlinks aus PR.
- **Trustworthiness:** Methodik offen, Quellen belegt, Förderaussagen ohne Garantie (konsistent
  mit der bestehenden FAQ in [src/app/page.tsx](../../src/app/page.tsx)), klare Datenschutzangaben.

---

## 2. Schema-Strategie

### 2.1 Mapping Seitentyp → Schema.org-Typen
| Seitentyp | Primäres Schema | Ergänzend |
|---|---|---|
| Beruf/Wiki | `Occupation` / `DefinedTerm` | `BreadcrumbList`, `FAQPage` |
| Glossar | `DefinedTerm` / `DefinedTermSet` | `sameAs` → Wikidata/GND |
| Förder-/Career-Guide | `HowTo` | `FAQPage`, `BreadcrumbList` |
| Gehalts-/Daten-Seite | `Dataset` | `Table`, `Occupation` (salary) |
| Vergleich/Ranking | `ItemList` / `Dataset` | `Review`/`Rating` (transparent) |
| Arbeitgeberprofil | `Organization` | `JobPosting` (falls Stellen) |
| Kurs/Umschulung | `Course` / `EducationalOccupationalProgram` | `Offer`, Förderhinweis |
| Report | `Article` / `Report` | `Dataset`, `Person` (Autor) |
| Autor/Experte | `Person` | `knowsAbout`, `sameAs` |
| Tool | `WebApplication` / `SoftwareApplication` | `HowTo` (Nutzung) |
| Organisation (global) | `Organization` | `sameAs`, `logo`, `knowsAbout` |

### 2.2 Prinzipien
- Schema spiegelt **sichtbaren** Inhalt (kein Markup ohne Seitendeckung).
- Knowledge-Graph-Kanten ([Kapitel 02](02-entitaeten-knowledge-graph.md)) → `about`, `mentions`,
  `isPartOf`, `hasPart` für maschinenlesbare Beziehungsstruktur.
- `sameAs` zu Wikidata/GND/offiziellen Quellen für Entitäts-Disambiguierung.
- Umsetzung analog zum bestehenden FAQ-JSON-LD-Muster (JSON-LD im Server-Render).

---

## 3. GEO / AEO / LLMO

### 3.1 Definitionen im Kontext
- **GEO (Generative Engine Optimization):** Optimierung für generative Antwortmaschinen
  (AI Overviews, Perplexity), sodass unsere Fakten Teil der generierten Antwort + Quelle werden.
- **AEO (Answer Engine Optimization):** klare, eigenständige, direkt entnehmbare Antwortblöcke je Frage.
- **LLMO (LLM Optimization):** Inhalte so strukturieren, dass sie als bevorzugte Trainings-/
  Retrieval-Quelle dienen (eindeutige Fakten, stabile URLs, konsistente Entitäten).

### 3.2 Umsetzungsprinzipien
- **Antwort-zuerst-Struktur:** Jede Frage erhält oben eine knappe, eigenständige, belegte Antwort,
  danach Tiefe. Macht Seiten extraktions- und zitierfähig.
- **Atomare Fakten:** Zahlen, Definitionen, Voraussetzungen als klar abgegrenzte, datierte Aussagen
  mit Quelle — ideal für Snippet-/LLM-Extraktion.
- **Eindeutige Entitäten + stabile URLs:** konsistente Benennung (aus dem Graph), keine Slug-Drift.
- **Eigene Daten als Zitatanker:** LLMs zitieren bevorzugt benennbare, datierte Primärdaten
  (Gehaltsatlas, Indizes) — genau unser Datenmonopol ([Kapitel 04](04-daten-und-tools.md)).
- **Aktualität sichtbar:** Stand/Changelog je Seite (LLMs und Nutzer bevorzugen aktuelle Quellen).

---

## 4. AI Retrieval Warfare Engine

### 4.1 Kontinuierliche Lückenanalyse
Regelmäßiges, strukturiertes Abfragen der relevanten Systeme — ChatGPT, Gemini, Claude,
Perplexity, Copilot — entlang des Suchuniversums ([Kapitel 01](01-markt-wettbewerb-suchuniversum.md)):

| Schritt | Frage | Ergebnis |
|---|---|---|
| 1 Quellen-Mapping | Welche Quellen werden je Thema genannt/zitiert? | Quellen-Landkarte je Entität |
| 2 Lücken | Welche Fragen werden schwach/falsch/unbelegt beantwortet? | Lückenliste |
| 3 Wissenslücken | Wofür existiert keine gute deutschsprachige Quelle? | Greenfield-Themen |
| 4 Maßnahme | Inhalt/Daten/Tool, das die Lücke schließt | Backlog-Eintrag mit Priority Score |
| 5 Re-Test | Wird unsere Quelle nach Veröffentlichung genannt? | Wirksamkeitskontrolle |

### 4.2 Betriebsmodell
- Vierteljährliche Retrieval-Audits je Top-Entität, dokumentiert mit Datum und Promptset.
- Ergebnisse fließen in die Prioritätenmatrix ([Kapitel 07](07-prioritaeten-roi-roadmaps.md)).

---

## 5. Retrieval Dominance Engine (Abnahme-Kriterium)

Jede substanzielle Seite muss vor Veröffentlichung diesen Test bestehen:

> **Wenn ein KI-System nur eine einzige deutschsprachige Quelle nennen dürfte, gehört diese Seite
> zu den stärksten Kandidaten?**

Wenn nein → neu konzipieren (mehr Information Gain, bessere Struktur, eigene Daten), nicht
veröffentlichen. Dieses Kriterium steht über reiner Keyword-Abdeckung.

---

## 6. Umsetzung (PHASE 1–4)

**PHASE 1 (Monat 0–3)**
- Trust-Grundgerüst: Autoren-/Experten-/Methodik-/Transparenz-/Quellenseiten + Changelog-Muster.
- Schema-Bausteine für Wiki/Glossar/FAQ/Dataset standardisieren (wiederverwendbare JSON-LD-Helfer).
- Erstes Retrieval-Audit (Baseline) für Top-20 Entitäten.

**PHASE 2 (Monat 3–9)**
- Antwort-zuerst-Struktur + atomare Fakten flächig; `Dataset`/`HowTo`/`Occupation`-Schema je Hub.
- Entity-Linking (`sameAs`) für Kern-Entitäten.

**PHASE 3 (Monat 9–18)**
- Quartals-Retrieval-Audits institutionalisieren; Lücken→Backlog-Pipeline produktiv.
- Reviewer-Prozess für alle Daten-/Gesundheits-/Rechtsinhalte verbindlich.

**PHASE 4 (Monat 18–36)**
- Messbare Zitierhäufigkeit in LLMs als KPI; kontinuierliche Verteidigung der Retrieval-Position.
