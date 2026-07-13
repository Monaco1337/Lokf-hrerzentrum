"use client";
/**
 * EligibilityWizard - orchestrates the 5-step funnel + result screen.
 *
 * State is a single `WizardState` object held here; each step receives a
 * `patch` callback to mutate slices and `onNext` / `onPrev` to navigate.
 *
 * A `draftId` (uuid) is created once per session and used to tie file uploads
 * to this draft until the Lead is created on submit.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { submitLead } from "@/server/actions/submitLead";

import { ELIGIBILITY_QUESTIONS } from "../scoring/eligibilityQuestions";
import { ConsentType, LeadPriority } from "../types";
import { Step1Basics } from "./wizard/Step1Basics";
import { Step2Employment } from "./wizard/Step2Employment";
import { Step3Location } from "./wizard/Step3Location";
import { Step4Eligibility } from "./wizard/Step4Eligibility";
import { Step5Consent } from "./wizard/Step5Consent";
import { Step6Result, type WhatsAppContact } from "./wizard/Step6Result";
import { INITIAL_STATE, type WizardState } from "./wizard/types";

interface ResultState {
  status: "loading" | "ok" | "error";
  priority?: LeadPriority;
  message?: string;
}

function emptyOrNull(v: string): string | null {
  const t = v.trim();
  return t.length === 0 ? null : t;
}

/**
 * Accepts the user-typed German date (TT.MM.JJJJ) and returns the canonical
 * ISO form YYYY-MM-DD. Returns null for empty input or invalid format so the
 * server schema can short-circuit.
 */
function normalizeBirthDate(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(t);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return t; // let zod reject upstream
}

function buildSubmitPayload(state: WizardState) {
  // Map K.O. snapshots into the legacy `answers` array so the scoring layer
  // and CRM continue to see the eligibility records they expect.
  const koMap: Record<string, boolean | null> = {
    hasNoKbaDrugEntries: state.hasNoKbaDrugEntries,
    acceptsShiftWork: state.acceptsShiftWork,
    acceptsTravelHotel: state.acceptsTravelHotel,
    acceptsPsychLoad: state.acceptsPsychLoad,
  };
  const koToQuestionId: Record<string, string> = {
    hasNoKbaDrugEntries: "q_kba_clean",
    acceptsShiftWork: "q_schichtdienst",
    acceptsTravelHotel: "q_montage_hotel",
    acceptsPsychLoad: "q_psych_belastung",
  };
  const derivedAnswers: Record<string, string> = {};
  for (const [k, qid] of Object.entries(koToQuestionId)) {
    const v = koMap[k];
    if (typeof v === "boolean") {
      derivedAnswers[qid] = v ? "yes" : "no";
    }
  }
  const mergedAnswers = { ...derivedAnswers, ...state.answers };

  const answers = ELIGIBILITY_QUESTIONS.map((q) => {
    const raw = mergedAnswers[q.id];
    const value = raw ?? "";
    let score = 0;
    if (q.impact.type === "BONUS") {
      const bool = value === "yes";
      if (bool === q.impact.bonusOn) score = q.impact.points;
    }
    return { questionId: q.id, answer: value, score };
  }).filter((a) => a.answer.length > 0);

  return {
    firstName: state.firstName.trim(),
    lastName: state.lastName.trim(),
    email: state.email.trim(),
    phone: state.phone.trim(),
    city: state.city.trim(),
    funnelPath: state.funnelPath,
    employmentStatus: state.employmentStatus,
    preferredLocation: state.preferredLocation,
    acceptsShiftWork: state.acceptsShiftWork === true,
    isInterestedInProgram: state.isInterestedInProgram === true,
    motivationText: emptyOrNull(state.motivationText),
    hasMpuIssue: state.hasMpuIssue === true,
    hasDrugIssue: state.hasDrugIssue === true,
    notesSensitive: emptyOrNull(state.notesSensitive),
    answers,
    consents: (
      Object.keys(state.consents) as Array<keyof typeof state.consents>
    ).map((k) => ({ type: k as ConsentType, granted: state.consents[k] })),
    source: null,
    utm: null,

    // Extended fields
    birthDate: normalizeBirthDate(state.birthDate),
    birthPlace: emptyOrNull(state.birthPlace),
    street: emptyOrNull(state.street),
    houseNumber: emptyOrNull(state.houseNumber),
    postalCode: emptyOrNull(state.postalCode),
    addressCity: emptyOrNull(state.city),
    nationality: emptyOrNull(state.nationality),

    agencyCity: emptyOrNull(state.agencyCity),
    agencyCustomerNumber: emptyOrNull(state.agencyCustomerNumber),
    agencyCaseWorker: emptyOrNull(state.agencyCaseWorker),

    unemployedSince: emptyOrNull(state.unemployedSince),
    careerHistory: emptyOrNull(state.careerHistory),
    schoolEducation: emptyOrNull(state.schoolEducation),
    graduationYear: emptyOrNull(state.graduationYear),
    languages: emptyOrNull(state.languages),
    computerSkills: emptyOrNull(state.computerSkills),
    interests: emptyOrNull(state.interests),

    acceptsTravelHotel: state.acceptsTravelHotel,
    acceptsPsychLoad: state.acceptsPsychLoad,
    hasNoKbaDrugEntries: state.hasNoKbaDrugEntries,

    uploadedFileIds: state.uploadedFiles.map((f) => f.id),
  };
}

function generateDraftId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `draft_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function EligibilityWizard({
  whatsappContact,
}: {
  whatsappContact?: WhatsAppContact | null | undefined;
} = {}) {
  const [step, setStep] = useState(0);
  const initial = useMemo<WizardState>(
    () => ({ ...INITIAL_STATE, draftId: generateDraftId() }),
    [],
  );
  const [state, setState] = useState<WizardState>(initial);
  const [result, setResult] = useState<ResultState | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  const patch = useCallback((partial: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const next = useCallback(() => setStep((s) => s + 1), []);
  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  const submit = useCallback(async () => {
    setResult({ status: "loading" });
    const payload = buildSubmitPayload(state);
    const response = await submitLead(payload);
    if (!response.ok) {
      setResult({ status: "error", message: response.message });
      return;
    }
    setResult({ status: "ok", priority: response.data.priority });
  }, [state]);

  const submitFromConsent = useCallback(async () => {
    if (!state.consents.PRIVACY) return;
    setStep(5);
    await submit();
  }, [state.consents.PRIVACY, submit]);

  if (result) {
    return <Step6Result result={result} whatsappContact={whatsappContact} />;
  }

  const props = { state, patch, onNext: next, onPrev: prev } as const;

  switch (step) {
    case 0:
      return <Step1Basics {...props} />;
    case 1:
      return <Step2Employment {...props} />;
    case 2:
      return <Step3Location {...props} />;
    case 3:
      return <Step4Eligibility {...props} />;
    case 4:
      return (
        <Step5Consent
          {...props}
          onNext={() => {
            void submitFromConsent();
          }}
        />
      );
    default:
      return null;
  }
}
