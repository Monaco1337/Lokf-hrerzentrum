import type {
  ConsentType,
  EmploymentStatus,
  FunnelPath,
  PreferredLocation,
} from "../../types";
import type { UploadedFileRef } from "../form/FileDropzone";

export interface WizardState {
  // K.O. answers (Schritt 1)
  acceptsShiftWork: boolean | null;
  acceptsTravelHotel: boolean | null;
  acceptsPsychLoad: boolean | null;
  hasNoKbaDrugEntries: boolean | null;

  // path & location (Schritt 2)
  funnelPath: FunnelPath | "";
  employmentStatus: EmploymentStatus | "";
  preferredLocation: PreferredLocation | "";

  // personal data (Schritt 3)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  birthPlace: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  nationality: string;

  // agency + cv (Schritt 4)
  agencyCity: string;
  agencyCustomerNumber: string;
  agencyCaseWorker: string;
  unemployedSince: string;
  careerHistory: string;
  schoolEducation: string;
  graduationYear: string;
  languages: string;
  computerSkills: string;
  interests: string;
  motivationText: string;

  // uploaded files (Schritt 4)
  uploadedFiles: UploadedFileRef[];

  // K.O. extras (kept for compatibility with scoring; sensible default = no issue)
  isInterestedInProgram: boolean;
  hasMpuIssue: boolean;
  hasDrugIssue: boolean;
  notesSensitive: string;

  // legacy free-form answers (kept for older eligibility questions)
  answers: Record<string, string>;

  // consents (Schritt 5)
  consents: Record<ConsentType, boolean>;

  /** Stable id used to tie uploads to this draft until the lead is created. */
  draftId: string;
}

export const INITIAL_STATE: Omit<WizardState, "draftId"> = {
  acceptsShiftWork: null,
  acceptsTravelHotel: null,
  acceptsPsychLoad: null,
  hasNoKbaDrugEntries: null,

  funnelPath: "",
  employmentStatus: "",
  preferredLocation: "",

  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthDate: "",
  birthPlace: "",
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  nationality: "",

  agencyCity: "",
  agencyCustomerNumber: "",
  agencyCaseWorker: "",
  unemployedSince: "",
  careerHistory: "",
  schoolEducation: "",
  graduationYear: "",
  languages: "",
  computerSkills: "",
  interests: "",
  motivationText: "",

  uploadedFiles: [],

  isInterestedInProgram: true,
  hasMpuIssue: false,
  hasDrugIssue: false,
  notesSensitive: "",

  answers: {},

  consents: {
    PRIVACY: false,
    EMAIL: false,
    WHATSAPP: false,
    PHONE: false,
    MARKETING: false,
  },
};

export interface StepProps {
  state: WizardState;
  patch: (partial: Partial<WizardState>) => void;
  onNext: () => void;
  onPrev: () => void;
}
