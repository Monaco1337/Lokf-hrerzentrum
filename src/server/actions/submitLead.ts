"use server";
/**
 * submitLead - public Server Action used by the EligibilityWizard.
 *
 * Server-validates with zod, then orchestrates lead creation via LeadService.
 */
import { SubmitLeadSchema } from "@/features/fairtrain-funnel/forms/schemas";

import { ValidationError } from "../errors";
import { leadService, type SubmitLeadResult } from "../services/LeadService";
import { getRequestContext, runAction, type Result } from "./_helpers";

export async function submitLead(
  raw: unknown,
): Promise<Result<SubmitLeadResult>> {
  return runAction(async () => {
    const parsed = SubmitLeadSchema.safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError("Invalid submit payload", {
        issues: parsed.error.issues,
      });
    }
    const input = parsed.data;
    const ctx = await getRequestContext();

    return leadService.submit(
      {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        city: input.city,
        funnelPath: input.funnelPath,
        employmentStatus: input.employmentStatus,
        preferredLocation: input.preferredLocation,
        acceptsShiftWork: input.acceptsShiftWork,
        motivationText: input.motivationText,
        isInterestedInProgram: input.isInterestedInProgram,
        source: input.source ?? ctx.source,
        utm: input.utm,
        sensitive: {
          hasMpuIssue: input.hasMpuIssue,
          hasDrugIssue: input.hasDrugIssue,
          notesSensitive: input.notesSensitive,
        },
        eligibilityAnswers: input.answers,
        consents: input.consents,
        uploadedFileIds: input.uploadedFileIds ?? [],
        birthDate: input.birthDate ? new Date(input.birthDate) : null,
        birthPlace: input.birthPlace,
        street: input.street,
        houseNumber: input.houseNumber,
        postalCode: input.postalCode,
        addressCity: input.addressCity,
        nationality: input.nationality,
        agencyCity: input.agencyCity,
        agencyCustomerNumber: input.agencyCustomerNumber,
        agencyCaseWorker: input.agencyCaseWorker,
        unemployedSince: input.unemployedSince,
        careerHistory: input.careerHistory,
        schoolEducation: input.schoolEducation,
        graduationYear: input.graduationYear,
        languages: input.languages,
        computerSkills: input.computerSkills,
        interests: input.interests,
        acceptsTravelHotel: input.acceptsTravelHotel,
        acceptsPsychLoad: input.acceptsPsychLoad,
        hasNoKbaDrugEntries: input.hasNoKbaDrugEntries,
      },
      ctx,
    );
  });
}
