/**
 * EligibilityAnswerRepository - stores configurable question/answer pairs.
 *
 * The configuration of which questions exist is in
 * `src/features/fairtrain-funnel/scoring/eligibilityQuestions.ts`.
 * This repository only persists the answers keyed by questionId.
 */
import type { Prisma } from "@prisma/client";

import type { EligibilityAnswerEntry } from "@/features/fairtrain-funnel/types";

import { prisma } from "../db/prisma";

export interface CreateEligibilityAnswersInput {
  leadId: string;
  answers: Array<{ questionId: string; answer: string; score: number }>;
}

export class EligibilityAnswerRepository {
  async createMany(
    input: CreateEligibilityAnswersInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (input.answers.length === 0) return;
    const client = tx ?? prisma;
    await client.eligibilityAnswer.createMany({
      data: input.answers.map((a) => ({
        leadId: input.leadId,
        questionId: a.questionId,
        answer: a.answer,
        score: a.score,
      })),
    });
  }

  async listForLead(leadId: string): Promise<EligibilityAnswerEntry[]> {
    const rows = await prisma.eligibilityAnswer.findMany({
      where: { leadId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      questionId: r.questionId,
      answer: r.answer,
      score: r.score,
    }));
  }
}

export const eligibilityAnswerRepository = new EligibilityAnswerRepository();
