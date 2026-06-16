/**
 * Configurable eligibility questions.
 *
 * The final list will be confirmed by the customer. This config is the single
 * source of truth - both the wizard UI and the scoring service read from here.
 *
 * Adding/removing a question is a code change (questionId stays stable so
 * historical EligibilityAnswer rows remain queryable).
 */

export type EligibilityQuestionKind = "BOOL" | "CHOICE";

export type EligibilityImpact =
  /** Blocks the lead entirely when the boolean answer matches `blockOn`. */
  | { type: "BLOCK"; blockOn: boolean; reason: string }
  /** Adds the points to the lead score when the boolean answer matches `bonusOn`. */
  | { type: "BONUS"; bonusOn: boolean; points: number }
  /** No automatic scoring - informational only. */
  | { type: "INFO" };

export interface EligibilityQuestion {
  /** Stable identifier persisted with answers. NEVER renumber existing ids. */
  id: string;
  kind: EligibilityQuestionKind;
  /** German question text shown in the wizard. */
  prompt: string;
  /** Whether the question MUST be answered before the wizard can advance. */
  required: boolean;
  /** Marks sensitive questions (MPU/Drogen) - rendered with neutral framing. */
  sensitive?: boolean;
  /** What the answer does to scoring/blocking. */
  impact: EligibilityImpact;
  /** Optional helper text. */
  helper?: string;
  /** For CHOICE questions only. */
  options?: ReadonlyArray<{ value: string; label: string }>;
}

export const ELIGIBILITY_QUESTIONS: ReadonlyArray<EligibilityQuestion> = [
  {
    id: "q_arbeitslos",
    kind: "BOOL",
    prompt: "Bist du aktuell arbeitslos oder arbeitssuchend?",
    required: true,
    impact: { type: "BONUS", bonusOn: true, points: 25 },
  },
  {
    id: "q_schichtdienst",
    kind: "BOOL",
    prompt: "Bist du bereit für Schichtdienst (Nacht-, Wochenend- und Feiertagsarbeit)?",
    required: true,
    impact: { type: "BLOCK", blockOn: false, reason: "NO_SHIFT_WORK" },
  },
  {
    id: "q_weiterbildung_15m",
    kind: "BOOL",
    prompt: "Hast du Interesse an einer 15-monatigen Weiterbildung in Vollzeit?",
    required: true,
    impact: { type: "BLOCK", blockOn: false, reason: "NO_PROGRAM_INTEREST" },
  },
  {
    id: "q_lokfuehrer_taetig",
    kind: "BOOL",
    prompt: "Bist du bereit, nach Abschluss als Lokführer zu arbeiten?",
    required: true,
    impact: { type: "BONUS", bonusOn: true, points: 10 },
  },
  {
    id: "q_mpu",
    kind: "BOOL",
    prompt: "Hast du derzeit ein laufendes MPU-Verfahren?",
    required: true,
    sensitive: true,
    impact: { type: "BLOCK", blockOn: true, reason: "MPU_ISSUE" },
    helper:
      "Diese Angabe wird vertraulich behandelt und nur zur Eignungsprüfung verwendet.",
  },
  {
    id: "q_drogen",
    kind: "BOOL",
    prompt:
      "Bestehen aktuell relevante Ausschlussgründe (z. B. laufende Suchtproblematik)?",
    required: true,
    sensitive: true,
    impact: { type: "BLOCK", blockOn: true, reason: "DRUG_ISSUE" },
    helper:
      "Diese Angabe wird vertraulich behandelt und nur zur Eignungsprüfung verwendet.",
  },
  {
    id: "q_ausweis",
    kind: "BOOL",
    prompt: "Hast du einen gültigen Ausweis?",
    required: true,
    impact: { type: "INFO" },
  },
  {
    id: "q_deutsch",
    kind: "BOOL",
    prompt: "Sind deine Deutschkenntnisse ausreichend (mindestens B2)?",
    required: true,
    impact: { type: "INFO" },
  },
  {
    id: "q_kba_clean",
    kind: "BOOL",
    prompt:
      "Hast du eine saubere Akte – keine Eintragungen in Flensburg wegen Drogen oder Alkohol?",
    required: true,
    sensitive: true,
    impact: { type: "BLOCK", blockOn: false, reason: "KBA_DRUG_ENTRY" },
    helper:
      "Das Eisenbahn-Bundesamt und der Bahnarzt verweigern den Triebfahrzeugführerschein bei Drogen- oder Alkohol-Einträgen.",
  },
  {
    id: "q_montage_hotel",
    kind: "BOOL",
    prompt:
      "Bist du bereit für bundesweite Einsätze und gelegentliche Hotel-Übernachtungen (werden bezahlt)?",
    required: true,
    impact: { type: "BLOCK", blockOn: false, reason: "NO_TRAVEL_HOTEL" },
    helper:
      "Lokführer-Einsätze finden oft bundesweit statt. Übernachtungskosten trägt der Arbeitgeber.",
  },
  {
    id: "q_psych_belastung",
    kind: "BOOL",
    prompt:
      "Traust du dir die psychische Belastung zu, z. B. den unwahrscheinlichen Fall eines Personenschadens?",
    required: true,
    sensitive: true,
    impact: { type: "BLOCK", blockOn: false, reason: "PSYCH_LOAD_REFUSED" },
    helper:
      "Statistisch sehr selten – aber wichtig, dass dir die Verantwortung einer tonnenschweren Maschine vorab klar ist.",
  },
];

export function getQuestionById(
  id: string,
): EligibilityQuestion | undefined {
  return ELIGIBILITY_QUESTIONS.find((q) => q.id === id);
}
