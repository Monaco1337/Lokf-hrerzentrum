/**
 * Zod schemas for the wizard and the submit action.
 *
 * The wizard validates per step with React Hook Form. The Server Action
 * re-validates the composed submit payload because the server trusts no
 * client input.
 */
import { z } from "zod";

import {
  ConsentTypeSchema,
  EmploymentStatusSchema,
  FunnelPathSchema,
  PreferredLocationSchema,
  UploadedFileKindSchema,
} from "../types";

const trimmedString = (label: string, max = 200) =>
  z
    .string({ required_error: `${label} ist erforderlich` })
    .trim()
    .min(1, `${label} ist erforderlich`)
    .max(max, `${label} ist zu lang`);

const optionalTrimmed = (max = 200) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v))
    .nullable();

export const phoneRegex = /^[+0-9 \-/()]{6,30}$/;
export const postalCodeRegex = /^\d{4,5}$/;
export const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
export const germanDateRegex = /^\d{2}\.\d{2}\.\d{4}$/;

export const Step1BasicsSchema = z.object({
  firstName: trimmedString("Vorname", 80),
  lastName: trimmedString("Nachname", 80),
  email: z
    .string({ required_error: "E-Mail ist erforderlich" })
    .trim()
    .email("Gültige E-Mail erforderlich"),
  phone: z
    .string({ required_error: "Telefon ist erforderlich" })
    .trim()
    .regex(phoneRegex, "Gültige Telefonnummer erforderlich"),
  city: trimmedString("Stadt", 80),
});
export type Step1Basics = z.infer<typeof Step1BasicsSchema>;

// ---------------------------------------------------------------------------
// Extended person data (used in new wizard "Persönliche Daten" step)
// ---------------------------------------------------------------------------
// Accepts either TT.MM.JJJJ (client-side input) or YYYY-MM-DD (after wizard
// normalization on submit). Both formats are stored as string here; the
// service layer converts to a Date.
const flexibleDateRegex = /^(?:\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})$/;

export const PersonDetailsSchema = z.object({
  birthDate: z
    .string()
    .trim()
    .regex(flexibleDateRegex, "Geburtsdatum als TT.MM.JJJJ eintippen")
    .nullable()
    .or(z.literal("").transform(() => null)),
  birthPlace: optionalTrimmed(120),
  street: optionalTrimmed(120),
  houseNumber: optionalTrimmed(20),
  postalCode: z
    .string()
    .trim()
    .regex(postalCodeRegex, "PLZ ist ungültig")
    .nullable()
    .or(z.literal("").transform(() => null)),
  addressCity: optionalTrimmed(120),
  nationality: optionalTrimmed(80),
});
export type PersonDetails = z.infer<typeof PersonDetailsSchema>;

// ---------------------------------------------------------------------------
// Agency data (required for arbeitslos funnel, optional otherwise)
// ---------------------------------------------------------------------------
export const AgencyDataSchema = z.object({
  agencyCity: optionalTrimmed(120),
  agencyCustomerNumber: optionalTrimmed(60),
  agencyCaseWorker: optionalTrimmed(120),
});
export type AgencyData = z.infer<typeof AgencyDataSchema>;

// ---------------------------------------------------------------------------
// Live-interview / CV data (used to generate Lebenslauf later)
// ---------------------------------------------------------------------------
export const CvInterviewSchema = z.object({
  unemployedSince: optionalTrimmed(80),
  careerHistory: optionalTrimmed(4000),
  schoolEducation: optionalTrimmed(200),
  graduationYear: optionalTrimmed(20),
  languages: optionalTrimmed(200),
  computerSkills: optionalTrimmed(200),
  interests: optionalTrimmed(200),
});
export type CvInterview = z.infer<typeof CvInterviewSchema>;

export const Step2EmploymentSchema = z.object({
  funnelPath: FunnelPathSchema,
  employmentStatus: EmploymentStatusSchema,
});
export type Step2Employment = z.infer<typeof Step2EmploymentSchema>;

export const Step3LocationSchema = z.object({
  preferredLocation: PreferredLocationSchema,
});
export type Step3Location = z.infer<typeof Step3LocationSchema>;

export const EligibilityAnswerEntrySchema = z.object({
  questionId: z.string().min(1).max(80),
  answer: z.string().min(1).max(40),
  score: z.number().int().min(-100).max(100),
});
export type EligibilityAnswerEntryInput = z.infer<
  typeof EligibilityAnswerEntrySchema
>;

export const Step4EligibilitySchema = z.object({
  acceptsShiftWork: z.boolean(),
  isInterestedInProgram: z.boolean(),
  motivationText: z.string().trim().max(1500).nullable(),
  hasMpuIssue: z.boolean(),
  hasDrugIssue: z.boolean(),
  notesSensitive: z.string().trim().max(1000).nullable(),
  answers: z.array(EligibilityAnswerEntrySchema).max(50),
  // Extended K.O. criteria (new wizard)
  acceptsTravelHotel: z.boolean(),
  acceptsPsychLoad: z.boolean(),
  hasNoKbaDrugEntries: z.boolean(),
});
export type Step4Eligibility = z.infer<typeof Step4EligibilitySchema>;

// ---------------------------------------------------------------------------
// Uploaded file references (the actual upload happens separately via the
// uploadFile Server Action; the submit payload references already-uploaded IDs)
// ---------------------------------------------------------------------------
export const UploadedFileReferenceSchema = z.object({
  id: z.string().min(1).max(60),
  kind: UploadedFileKindSchema,
  originalName: z.string().min(1).max(255),
  sizeBytes: z.number().int().nonnegative(),
});
export type UploadedFileReference = z.infer<typeof UploadedFileReferenceSchema>;

export const ConsentItemSchema = z.object({
  type: ConsentTypeSchema,
  granted: z.boolean(),
});

export const Step5ConsentSchema = z
  .object({
    consents: z.array(ConsentItemSchema).min(1).max(10),
  })
  .superRefine((val, ctx) => {
    const privacy = val.consents.find((c) => c.type === "PRIVACY");
    if (!privacy || !privacy.granted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["consents"],
        message: "Datenschutzhinweis muss akzeptiert werden",
      });
    }
    for (const required of ["EMAIL", "WHATSAPP", "PHONE"] as const) {
      const item = val.consents.find((c) => c.type === required);
      if (!item || !item.granted) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["consents"],
          message: `Einwilligung ${required} ist erforderlich`,
        });
      }
    }
  });
export type Step5Consent = z.infer<typeof Step5ConsentSchema>;

// ---------------------------------------------------------------------------
// ContactInquiry - "Noch eine Frage?" form on the landing page.
// Intentionally narrow: no funnel routing, no scoring, no consents beyond the
// privacy acknowledgement. Honeypot + minimal-render-time guard against bots.
// ---------------------------------------------------------------------------

export const ContactInquirySchema = z
  .object({
    firstName: trimmedString("Vorname", 80),
    lastName: trimmedString("Nachname", 80),
    email: z
      .string({ required_error: "E-Mail ist erforderlich" })
      .trim()
      .email("Gültige E-Mail erforderlich")
      .max(160),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Gültige Telefonnummer erforderlich")
      .max(40)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    message: trimmedString("Nachricht", 2000).refine(
      (v) => v.length >= 10,
      "Bitte beschreibe deine Frage mit mindestens 10 Zeichen.",
    ),
    privacyAccepted: z.literal(true, {
      errorMap: () => ({
        message: "Bitte die Datenschutzerklärung bestätigen.",
      }),
    }),
    // Honeypot: must remain empty. Real users never see/touch this field.
    company: z
      .string()
      .max(0, "Spam erkannt")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    // Anti-bot: client sends ms-since-mount. We reject impossibly fast submits.
    renderedAt: z.number().int().nonnegative().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.company && val.company.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["company"],
        message: "Spam erkannt",
      });
    }
  });

export type ContactInquiryInput = z.infer<typeof ContactInquirySchema>;

export const SubmitLeadSchema = Step1BasicsSchema.merge(Step2EmploymentSchema)
  .merge(Step3LocationSchema)
  .merge(PersonDetailsSchema)
  .merge(AgencyDataSchema)
  .merge(CvInterviewSchema)
  .extend({
    ...Step4EligibilitySchema.shape,
    consents: z.array(ConsentItemSchema).min(1).max(10),
    uploadedFileIds: z.array(z.string().min(1).max(60)).max(20).default([]),
    source: z.string().max(120).nullable().default(null),
    utm: z.string().max(500).nullable().default(null),
  })
  .superRefine((val, ctx) => {
    const privacy = val.consents.find((c) => c.type === "PRIVACY");
    if (!privacy || !privacy.granted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["consents"],
        message: "Datenschutzhinweis muss akzeptiert werden",
      });
    }
    for (const required of ["EMAIL", "WHATSAPP", "PHONE"] as const) {
      const item = val.consents.find((c) => c.type === required);
      if (!item || !item.granted) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["consents"],
          message: `Einwilligung ${required} ist erforderlich`,
        });
      }
    }
  });
export type SubmitLeadInputDto = z.infer<typeof SubmitLeadSchema>;

// ---------------------------------------------------------------------------
// File upload validation (used by the uploadFile Server Action)
// ---------------------------------------------------------------------------
export const ACCEPTED_UPLOAD_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

export const UploadFileInputSchema = z.object({
  leadDraftId: z.string().trim().min(1).max(60),
  kind: UploadedFileKindSchema,
  originalName: z.string().trim().min(1).max(255),
  mimeType: z.enum(ACCEPTED_UPLOAD_MIME),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});
export type UploadFileInput = z.infer<typeof UploadFileInputSchema>;

export const UpdateStatusSchema = z.object({
  leadId: z.string().min(1),
  toStatus: z.string().min(1),
  reason: z.string().trim().max(500).nullable(),
  override: z.boolean().optional(),
});

export const AddNoteSchema = z.object({
  leadId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

export const ScheduleFollowUpSchema = z.object({
  leadId: z.string().min(1),
  when: z
    .string()
    .datetime({ offset: true })
    .nullable(),
});

export const SendMagicLinkSchema = z.object({
  leadId: z.string().min(1),
  scope: z.enum(["COMPLETE_PROFILE", "UPLOAD_DOCS"]),
  channel: z.enum(["WHATSAPP", "EMAIL"]),
});

export const RevokeConsentSchema = z.object({
  leadId: z.string().min(1),
  type: ConsentTypeSchema,
});

/**
 * Local login identifier for the seeded admin namespace. A bare username like
 * `admin` is auto-completed to `admin@fairtrain.local`, so operators don't have
 * to type the internal domain in the form.
 */
const LOGIN_USERNAME_DOMAIN = "fairtrain.local";

export const CrmLoginSchema = z.object({
  password: z.string().min(1).max(200),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => {
      if (!v) return undefined;
      // Plain username (no "@") -> append the local admin domain.
      return v.includes("@") ? v : `${v}@${LOGIN_USERNAME_DOMAIN}`;
    })
    .pipe(z.string().email().optional())
    .optional(),
});

export const LeadFilterSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  preferredLocation: z.string().optional(),
  funnelPath: z.string().optional(),
  source: z.string().optional(),
  slaBreachedOnly: z.coerce.boolean().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
});
