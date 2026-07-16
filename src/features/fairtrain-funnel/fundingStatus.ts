/**
 * Förderstatus (Bildungsgutschein) — the funding lifecycle a Vertriebler tracks
 * per lead. Kept SEPARATE from the pipeline `LeadStatus` because it is its own
 * axis (the voucher can be "beantragt" while the lead is already in an
 * appointment stage, etc.).
 *
 * Persisted inside the existing `tags` array with a `foerder:` prefix, so no
 * schema migration is needed and it can never break existing lead reads. The
 * default (no tag present) is "nicht besprochen".
 */
export const FundingStatus = {
  NICHT_BESPROCHEN: "nicht_besprochen",
  BEANTRAGT: "beantragt",
  EINGEREICHT: "eingereicht",
  GENEHMIGT: "genehmigt",
  ERHALTEN: "erhalten",
  ABGELEHNT: "abgelehnt",
} as const;
export type FundingStatus = (typeof FundingStatus)[keyof typeof FundingStatus];

export const FUNDING_STATUS_ORDER: ReadonlyArray<FundingStatus> = [
  FundingStatus.NICHT_BESPROCHEN,
  FundingStatus.BEANTRAGT,
  FundingStatus.EINGEREICHT,
  FundingStatus.GENEHMIGT,
  FundingStatus.ERHALTEN,
  FundingStatus.ABGELEHNT,
];

export const FUNDING_STATUS_LABEL: Record<FundingStatus, string> = {
  [FundingStatus.NICHT_BESPROCHEN]: "Nicht besprochen",
  [FundingStatus.BEANTRAGT]: "Beantragt",
  [FundingStatus.EINGEREICHT]: "Eingereicht",
  [FundingStatus.GENEHMIGT]: "Genehmigt",
  [FundingStatus.ERHALTEN]: "Erhalten",
  [FundingStatus.ABGELEHNT]: "Abgelehnt",
};

export const FUNDING_STATUS_TONE: Record<FundingStatus, string> = {
  [FundingStatus.NICHT_BESPROCHEN]: "bg-slate-100 text-slate-600 ring-slate-200",
  [FundingStatus.BEANTRAGT]: "bg-amber-50 text-amber-700 ring-amber-200",
  [FundingStatus.EINGEREICHT]: "bg-sky-50 text-sky-700 ring-sky-200",
  [FundingStatus.GENEHMIGT]: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  [FundingStatus.ERHALTEN]: "bg-emerald-100 text-emerald-800 ring-emerald-300",
  [FundingStatus.ABGELEHNT]: "bg-rose-50 text-rose-700 ring-rose-200",
};

export const FUNDING_TAG_PREFIX = "foerder:";

function isFundingStatus(v: string): v is FundingStatus {
  return (FUNDING_STATUS_ORDER as ReadonlyArray<string>).includes(v);
}

/** Read the current Förderstatus from a lead's tags (defaults to nicht besprochen). */
export function fundingStatusFromTags(
  tags: ReadonlyArray<string>,
): FundingStatus {
  const tag = tags.find((t) => t.startsWith(FUNDING_TAG_PREFIX));
  const value = tag?.slice(FUNDING_TAG_PREFIX.length) ?? "";
  return isFundingStatus(value) ? value : FundingStatus.NICHT_BESPROCHEN;
}

/** Return a new tag list with the Förderstatus set (removing any previous one). */
export function tagsWithFundingStatus(
  tags: ReadonlyArray<string>,
  status: FundingStatus,
): string[] {
  const rest = tags.filter((t) => !t.startsWith(FUNDING_TAG_PREFIX));
  // "nicht besprochen" is the default → store as absence, no tag noise.
  if (status === FundingStatus.NICHT_BESPROCHEN) return rest;
  return [...rest, `${FUNDING_TAG_PREFIX}${status}`];
}
