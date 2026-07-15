/**
 * /crm/unterlagen — "Bewerberakte" (unified applicant document center).
 *
 * Shows EVERY web-funnel applicant (leadType "neu" — i.e. finished the
 * Eignungscheck on the website) together with the documents they uploaded
 * through the portal. Reactivation / alt-leads are intentionally excluded so
 * the old imported contacts no longer clutter the applicant files.
 *
 * No 100-row cap: the full set of funnel applicants is loaded. Portal documents
 * are batch-loaded in a single query to avoid N+1.
 */
import {
  FUNNEL_PHASE_LABEL,
  PORTAL_DOCUMENT_LABEL,
  PORTAL_DOCUMENT_ORDER,
  PORTAL_DOCUMENT_STATUS_LABEL,
  PORTAL_REQUIRED_DOCUMENTS,
  type PortalDocumentEntry,
} from "@/features/fairtrain-funnel/types";
import {
  UnterlagenBoard,
  type AkteDoc,
  type BewerberakteRow,
} from "@/features/fairtrain-funnel/crm/UnterlagenBoard";
import { requireCrmUser } from "@/server/actions/_helpers";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { portalDocumentRepository } from "@/server/repositories/PortalDocumentRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

/** Upper bound — effectively "all". Web-funnel applicants are a bounded set. */
const APPLICANT_LIMIT = 20000;

const REQUIRED = new Set<string>(PORTAL_REQUIRED_DOCUMENTS);

function buildRow(
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    city: string | null;
    createdAt: Date;
    funnelPhase: string;
  },
  docs: ReadonlyArray<PortalDocumentEntry>,
): BewerberakteRow {
  const byKind = new Map(docs.map((d) => [d.kind, d]));

  let pendingReview = 0;
  let approved = 0;
  let rejected = 0;
  let uploadedCount = 0;
  let requiredPresent = 0;

  const chips: AkteDoc[] = [];
  for (const kind of PORTAL_DOCUMENT_ORDER) {
    const status = byKind.get(kind)?.status ?? "MISSING";
    if (status === "UPLOADED") pendingReview += 1;
    if (status === "APPROVED") approved += 1;
    if (status === "REJECTED") rejected += 1;
    if (status === "UPLOADED" || status === "APPROVED") {
      uploadedCount += 1;
      if (REQUIRED.has(kind)) requiredPresent += 1;
    }
    // Only surface documents that actually carry a signal (not blank "fehlt").
    if (status !== "MISSING") {
      chips.push({
        label: PORTAL_DOCUMENT_LABEL[kind],
        status,
        statusLabel: PORTAL_DOCUMENT_STATUS_LABEL[status],
      });
    }
  }

  const requiredTotal = PORTAL_REQUIRED_DOCUMENTS.length;
  const missingRequired = Math.max(0, requiredTotal - requiredPresent);
  const pct = Math.round((requiredPresent / Math.max(1, requiredTotal)) * 100);
  const name = `${lead.firstName} ${lead.lastName}`.trim();

  return {
    id: lead.id,
    name,
    isDemo: /^\[DEMO\]/i.test(name),
    city: lead.city ?? "",
    phaseLabel:
      FUNNEL_PHASE_LABEL[lead.funnelPhase as keyof typeof FUNNEL_PHASE_LABEL] ??
      "Eignungscheck abgeschlossen",
    createdAtLabel: lead.createdAt.toLocaleDateString("de-DE"),
    pct,
    uploadedCount,
    pendingReview,
    approved,
    rejected,
    missingRequired,
    docs: chips,
  };
}

export default async function UnterlagenPage() {
  const currentUser = await requireCrmUser();
  // Only real web-funnel applicants — excludes alt-leads / reactivation contacts.
  const scoped = applyScope({ leadType: "neu" }, currentUser);
  const leads = await leadRepository.list(scoped, { limit: APPLICANT_LIMIT });

  const docsByLead = await portalDocumentRepository.listForLeads(
    leads.map((l) => l.id),
  );

  const applicants: BewerberakteRow[] = leads
    .map((lead) => buildRow(lead, docsByLead.get(lead.id) ?? []))
    // Needs-attention first: awaiting review, then incomplete, then newest.
    .sort(
      (a, b) =>
        b.pendingReview - a.pendingReview ||
        b.missingRequired - a.missingRequired ||
        b.pct - a.pct,
    );

  return <UnterlagenBoard applicants={applicants} />;
}
