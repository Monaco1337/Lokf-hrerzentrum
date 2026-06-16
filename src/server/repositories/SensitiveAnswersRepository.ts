/**
 * SensitiveAnswersRepository - isolated access to MPU/Drogen-Daten.
 *
 * This data is NEVER joined into list queries. Callers must pass an `actor`
 * argument; the service layer is required to write an AuditLog entry around
 * the read so every reveal is traceable.
 */
import type { Prisma } from "@prisma/client";

import type { SensitiveAnswersData } from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";

export interface CreateSensitiveInput {
  leadId: string;
  hasMpuIssue: boolean;
  hasDrugIssue: boolean;
  notesSensitive: string | null;
}

export class SensitiveAnswersRepository {
  async create(
    input: CreateSensitiveInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.sensitiveAnswers.create({
      data: {
        leadId: input.leadId,
        hasMpuIssue: input.hasMpuIssue,
        hasDrugIssue: input.hasDrugIssue,
        notesSensitive: input.notesSensitive,
      },
    });
  }

  /**
   * Reveal sensitive answers. Service layer MUST write an AuditLog entry around
   * this call. The repository itself does not audit - that responsibility is
   * explicit at the service boundary.
   */
  async getForLead(leadId: string): Promise<SensitiveAnswersData | null> {
    const row = await prisma.sensitiveAnswers.findUnique({
      where: { leadId },
    });
    if (!row) return null;
    return {
      hasMpuIssue: row.hasMpuIssue,
      hasDrugIssue: row.hasDrugIssue,
      notesSensitive: row.notesSensitive,
    };
  }
}

export const sensitiveAnswersRepository = new SensitiveAnswersRepository();
