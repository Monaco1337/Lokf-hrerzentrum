/**
 * LeadDocumentChecklist — applicant document overview for the Unterlagen tab.
 *
 * Derives a per-category checklist from real uploaded files + generated
 * documents (no hardcoded state) and shows a completion percentage. Requesting
 * documents happens via the MagicLinkPanel rendered alongside; per-document
 * approve/reject persistence is a planned backend follow-up (needs a
 * Document.reviewerNote column + updateDocument action).
 */
import type { DocumentEntry, UploadedFileEntry, UploadedFileKind } from "../../types";
import { documentLabel } from "../leadLabels";

interface ChecklistItem {
  label: string;
  kinds: ReadonlyArray<UploadedFileKind>;
}

const CHECKLIST: ReadonlyArray<ChecklistItem> = [
  { label: "Lebenslauf", kinds: ["CV"] },
  { label: "Ausweis / Führerschein", kinds: ["ID"] },
  { label: "Zeugnisse", kinds: ["CERTIFICATE"] },
  { label: "Weitere Unterlagen", kinds: ["OTHER"] },
];

const DOC_STATUS_LABEL: Record<string, string> = {
  MISSING_DATA: "Daten fehlen",
  READY_TO_GENERATE: "bereit",
  GENERATED: "erstellt",
  SENT: "versendet",
  UPDATED: "aktualisiert",
};

export function LeadDocumentChecklist({
  uploadedFiles,
  documents,
}: {
  uploadedFiles: ReadonlyArray<UploadedFileEntry>;
  documents: ReadonlyArray<DocumentEntry>;
}) {
  const active = uploadedFiles.filter((f) => !f.deletedAt);
  const rows = CHECKLIST.map((item) => {
    const files = active.filter((f) => item.kinds.includes(f.kind));
    return { ...item, files, present: files.length > 0 };
  });
  const done = rows.filter((r) => r.present).length;
  const pct = Math.round((done / rows.length) * 100);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="font-semibold text-ink">Vollständigkeit der Bewerberakte</span>
          <span className="font-bold tabular-nums text-navy-950">{pct}%</span>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-ink/[0.06] rounded-xl border border-ink/[0.07]">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[12px] font-bold ${
                  r.present ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                }`}
              >
                {r.present ? "✓" : "–"}
              </span>
              <span className="text-[13px] font-medium text-ink">{r.label}</span>
            </div>
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                r.present
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {r.present ? `${r.files.length} hochgeladen` : "fehlt"}
            </span>
          </li>
        ))}
      </ul>

      {documents.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Generierte Dokumente
          </p>
          <ul className="divide-y divide-ink/[0.06] rounded-xl border border-ink/[0.07]">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-3.5 py-2">
                <span className="text-[12.5px] font-medium text-ink">{documentLabel(d.type)}</span>
                <span className="rounded-md bg-surface-subtle px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                  {DOC_STATUS_LABEL[d.status] ?? d.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
