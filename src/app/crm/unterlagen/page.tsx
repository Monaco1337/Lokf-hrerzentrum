/**
 * /crm/unterlagen — Unterlagen-Center (document control center).
 *
 * Per applicant: status of CV, ID, certificates, voucher and agency papers.
 * Statuses follow the ops brief: fehlt · bereit · erstellt · geprüft.
 * Backed by the existing Document table; rendered via <UnterlagenBoard/>.
 */
import {
  DocumentStatus,
  type DocumentEntry,
  type LeadSummary,
} from "@/features/fairtrain-funnel/types";
import {
  UnterlagenBoard,
  type DocTone,
  type UnterlagenApplicant,
} from "@/features/fairtrain-funnel/crm/UnterlagenBoard";
import { requireCrmUser } from "@/server/actions/_helpers";
import { documentRepository } from "@/server/repositories/DocumentRepository";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  CV: "Lebenslauf",
  AA_REASONING: "Begründung AA",
  AA_GUIDE: "Leitfaden AA",
  LOCATION_INFO: "Standort-Info",
  HOUSING_SAALFELD: "Unterkunft",
  WEITERBILDUNG_INFO: "Weiterbildung",
  MASTER_BUNDLE: "Master-Bundle",
};

const STATUS_META: Record<DocumentStatus, { label: string; tone: DocTone }> = {
  MISSING_DATA: { label: "fehlt", tone: "red" },
  READY_TO_GENERATE: { label: "bereit", tone: "amber" },
  GENERATED: { label: "erstellt", tone: "blue" },
  SENT: { label: "geprüft", tone: "green" },
  UPDATED: { label: "aktualisiert", tone: "violet" },
};

function summarize(docs: ReadonlyArray<DocumentEntry>): {
  pct: number;
  missing: number;
  ready: number;
  sent: number;
} {
  let missing = 0;
  let ready = 0;
  let sent = 0;
  for (const d of docs) {
    if (d.status === DocumentStatus.MISSING_DATA) missing += 1;
    else if (d.status === DocumentStatus.READY_TO_GENERATE) ready += 1;
    else if (d.status === DocumentStatus.SENT) sent += 1;
  }
  const total = Math.max(1, docs.length);
  const pct = Math.round(((total - missing) / total) * 100);
  return { pct, missing, ready, sent };
}

export default async function UnterlagenPage() {
  const currentUser = await requireCrmUser();
  const scoped = applyScope({}, currentUser);
  const leads = await leadRepository.list(scoped);

  const leadDocs = await Promise.all(
    leads.map(async (lead: LeadSummary) => ({
      lead,
      docs: await documentRepository.list(lead.id),
    })),
  );

  const applicants: UnterlagenApplicant[] = leadDocs
    .map(({ lead, docs }) => {
      const s = summarize(docs);
      const name = `${lead.firstName} ${lead.lastName}`.trim();
      return {
        id: lead.id,
        name,
        isDemo: /^\[DEMO\]/i.test(name),
        city: lead.city ?? "",
        docCount: docs.length,
        pct: s.pct,
        missing: s.missing,
        ready: s.ready,
        sent: s.sent,
        docs: docs.map((d) => {
          const meta = STATUS_META[d.status];
          return {
            label: TYPE_LABEL[d.type] ?? d.type,
            statusLabel: meta.label,
            tone: meta.tone,
          };
        }),
      };
    })
    // Most incomplete first — those need attention.
    .sort((a, b) => b.missing - a.missing || a.pct - b.pct);

  return <UnterlagenBoard applicants={applicants} />;
}
