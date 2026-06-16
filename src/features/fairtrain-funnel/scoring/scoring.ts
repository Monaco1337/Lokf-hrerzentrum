/**
 * Pure scoring logic. No side effects, no Prisma.
 *
 * Points (plan-conformant):
 *   +25 unemployed
 *   +20 location matches (BERLIN or SAALFELD; UNDECIDED no bonus)
 *   +15 accepts shift work
 *   +20 no hard exclusion reasons
 *   +10 motivation (text length >= 40 chars OR explicit interest flag)
 *   +10 profile complete
 *
 * Hard blocking (priority = BLOCKED regardless of score):
 *   - hasMpuIssue
 *   - hasDrugIssue
 *   - !acceptsShiftWork
 *   - !isInterestedInProgram
 *
 * Categories:
 *   HOT  score >= 80
 *   WARM score 50..79
 *   COLD score < 50
 */
import {
  type BlockReasonCode,
  LeadPriority,
  type ScoringInput as BaseScoringInput,
  type ScoringResult,
} from "../types";

export interface ScoringInput extends BaseScoringInput {
  /** New K.O. criteria - if explicitly false the lead is blocked. Undefined = unknown. */
  acceptsTravelHotel?: boolean | undefined;
  acceptsPsychLoad?: boolean | undefined;
  hasNoKbaDrugEntries?: boolean | undefined;
}

const POINTS = {
  UNEMPLOYED: 25,
  LOCATION_MATCH: 20,
  SHIFT_WORK: 15,
  NO_EXCLUSION: 20,
  MOTIVATION: 10,
  COMPLETE_PROFILE: 10,
} as const;

const HOT_THRESHOLD = 80;
const WARM_THRESHOLD = 50;
const MOTIVATION_MIN_LENGTH = 40;

export function computeScore(input: ScoringInput): ScoringResult {
  const blockedReasons: BlockReasonCode[] = [];
  if (input.hasMpuIssue) blockedReasons.push("MPU_ISSUE");
  if (input.hasDrugIssue) blockedReasons.push("DRUG_ISSUE");
  if (!input.acceptsShiftWork) blockedReasons.push("NO_SHIFT_WORK");
  if (!input.isInterestedInProgram) blockedReasons.push("NO_PROGRAM_INTEREST");
  if (input.hasNoKbaDrugEntries === false) blockedReasons.push("KBA_DRUG_ENTRY");
  if (input.acceptsTravelHotel === false) blockedReasons.push("NO_TRAVEL_HOTEL");
  if (input.acceptsPsychLoad === false) blockedReasons.push("PSYCH_LOAD_REFUSED");

  let score = 0;

  if (input.funnelPath === "UNEMPLOYED") {
    score += POINTS.UNEMPLOYED;
  }

  if (
    input.preferredLocation === "BERLIN" ||
    input.preferredLocation === "SAALFELD"
  ) {
    score += POINTS.LOCATION_MATCH;
  }

  if (input.acceptsShiftWork) {
    score += POINTS.SHIFT_WORK;
  }

  if (blockedReasons.length === 0) {
    score += POINTS.NO_EXCLUSION;
  }

  const motivationLength = input.motivationText?.trim().length ?? 0;
  if (motivationLength >= MOTIVATION_MIN_LENGTH) {
    score += POINTS.MOTIVATION;
  }

  if (input.isProfileComplete) {
    score += POINTS.COMPLETE_PROFILE;
  }

  let priority: LeadPriority;
  if (blockedReasons.length > 0) {
    priority = LeadPriority.BLOCKED;
  } else if (score >= HOT_THRESHOLD) {
    priority = LeadPriority.HOT;
  } else if (score >= WARM_THRESHOLD) {
    priority = LeadPriority.WARM;
  } else {
    priority = LeadPriority.COLD;
  }

  return { score, priority, blockedReasons };
}

export const SCORING_CONSTANTS = {
  POINTS,
  HOT_THRESHOLD,
  WARM_THRESHOLD,
  MOTIVATION_MIN_LENGTH,
} as const;
