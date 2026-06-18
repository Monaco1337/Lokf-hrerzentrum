/**
 * Lokführer salary dataset (v1).
 *
 * Figures are aggregated, rounded monthly-gross estimates derived from publicly
 * observable job postings and collective-agreement bands for the German market.
 * They are decision-support orientation values, NOT guaranteed earnings — actual
 * pay depends on employer, collective agreement, region, shift model, experience
 * and allowances. The methodology is published alongside the data on the page.
 */
import type { KeyFact, SalarySegment } from "../types";

/** Reference period the snapshot represents. */
export const SALARY_DATA_PERIOD = "2026";

/** Monthly-gross ranges by segment (EUR). */
export const SALARY_SEGMENTS: ReadonlyArray<SalarySegment> = [
  { segment: "Einstieg (nach Umschulung)", context: "Personen-/Nahverkehr", min: 2800, median: 3100, max: 3400 },
  { segment: "Mit Berufserfahrung", context: "Personen-/Nahverkehr", min: 3300, median: 3700, max: 4200 },
  { segment: "Güterverkehr", context: "oft höhere Zulagen", min: 3400, median: 3900, max: 4500 },
  { segment: "Erfahren inkl. Zulagen", context: "Schicht/Nacht/Sonntag", min: 3900, median: 4600, max: 5600 },
];

/** Headline facts for the salary page hero. */
export const SALARY_KEY_FACTS: ReadonlyArray<KeyFact> = [
  { label: "Einstieg", value: "≈ 2.800–3.400 €", hint: "monatl. brutto, nach Umschulung" },
  { label: "Mit Erfahrung", value: "≈ 3.300–4.200 €", hint: "monatl. brutto" },
  { label: "Mit Zulagen", value: "bis ≈ 5.600 €", hint: "Schicht/Nacht/Sonntag/Feiertag" },
  { label: "Stand", value: SALARY_DATA_PERIOD, hint: "jährliche Aktualisierung" },
];

/** What drives the spread — explanatory factors shown as a list. */
export const SALARY_FACTORS: ReadonlyArray<{ factor: string; effect: string }> = [
  { factor: "Verkehrsart", effect: "Güterverkehr vergütet häufig etwas höher als der Nahverkehr." },
  { factor: "Tarifbindung", effect: "DB- und Wettbewerbstarife (z. B. EVG/GDL) setzen unterschiedliche Bänder." },
  { factor: "Zulagen", effect: "Schicht-, Nacht-, Sonntags- und Feiertagszuschläge erhöhen das Effektivgehalt deutlich." },
  { factor: "Erfahrung", effect: "Mit Streckenkunde und Dienstjahren steigt die Eingruppierung." },
  { factor: "Region", effect: "Regionale Arbeitsmärkte und Lebenshaltungskosten beeinflussen das Niveau." },
];

/** Short methodology statement (also feeds the Dataset schema description). */
export const SALARY_METHODOLOGY: ReadonlyArray<string> = [
  "Die Werte sind aggregierte, gerundete Orientierungswerte (Monatsbrutto) auf Basis öffentlich beobachtbarer Stellenausschreibungen und tariflicher Bänder für den deutschen Markt.",
  "Es handelt sich um Spannen, keine garantierten Gehälter. Das tatsächliche Einkommen hängt von Arbeitgeber, Tarifvertrag, Region, Schichtmodell, Erfahrung und Zulagen ab.",
  "Der Datensatz wird jährlich aktualisiert; jede Ausgabe trägt einen Stand. Quartalsweise Korrekturen werden bei wesentlichen Marktbewegungen vorgenommen.",
];
