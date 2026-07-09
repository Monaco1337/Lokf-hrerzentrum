"use client";

/**
 * LeadImportWizard — Alt-Lead Excel/CSV import.
 *
 * Upload → preview (counters + sample, no writes) → confirm (create leads).
 * No message is sent here: imported leads land as paused Alt-Leads and are only
 * contacted after a separate manual campaign release.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import type {
  ImportCommitDto,
  ImportCounters,
  ImportPreviewDto,
} from "@/features/fairtrain-funnel/campaign/types";
import {
  commitLeadImport,
  previewLeadImport,
} from "@/server/actions/leadImport";

const inputClass =
  "w-full rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#111827]";

const STATUS_STYLE: Record<string, string> = {
  imported: "bg-[#F0FDF4] text-[#15803D]",
  duplicate: "bg-[#FFFBEB] text-[#B45309]",
  invalid: "bg-[#FEF2F2] text-[#B91C1C]",
};
const STATUS_LABEL: Record<string, string> = {
  imported: "Importierbar",
  duplicate: "Dublette",
  invalid: "Fehlerhaft",
};

function Kpi({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
      <div className={`text-2xl font-semibold ${tone ?? "text-[#111827]"}`}>{value}</div>
      <div className="mt-0.5 text-[12px] uppercase tracking-wide text-[#6B7280]">{label}</div>
    </div>
  );
}

function CounterGrid({ counters }: { counters: ImportCounters }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <Kpi label="Zeilen gesamt" value={counters.totalRows} />
      <Kpi label="Versandbereit" value={counters.imported} tone="text-[#15803D]" />
      <Kpi label="WhatsApp verfügbar" value={counters.whatsappAvailable} />
      <Kpi label="E-Mail verfügbar" value={counters.emailAvailable} />
      <Kpi label="Dubletten (Datei)" value={counters.duplicates} tone="text-[#B45309]" />
      <Kpi label="Bereits im System" value={counters.alreadyContacted} tone="text-[#B45309]" />
      <Kpi label="Fehlerhaft" value={counters.invalid} tone="text-[#B91C1C]" />
    </div>
  );
}

export function LeadImportWizard() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewDto | null>(null);
  const [committed, setCommitted] = useState<ImportCommitDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreview(null);
    setCommitted(null);
    setError(null);
  }

  function runPreview() {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const res = await previewLeadImport(fd);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setPreview(res.data);
    });
  }

  function runCommit() {
    if (!file) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const res = await commitLeadImport(fd);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setCommitted(res.data);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-[#111827]">Lead-Import (Alt-Leads)</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Excel- oder CSV-Datei hochladen. Importierte Kontakte werden als{" "}
          <strong>Alt-Leads</strong> angelegt und pausiert – es wird{" "}
          <strong>keine Nachricht</strong> versendet. Der Versand startet erst
          nach manueller Freigabe der Reaktivierungskampagne.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-sm text-[#B91C1C]">
          {error}
        </p>
      ) : null}

      {committed ? (
        <section className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-5">
          <h2 className="text-sm font-semibold text-[#15803D]">Import abgeschlossen</h2>
          <p className="mt-1 text-sm text-[#166534]">
            {committed.counters.imported} Alt-Leads wurden angelegt (
            {committed.counters.duplicates} Dubletten,{" "}
            {committed.counters.alreadyContacted} bereits im System,{" "}
            {committed.counters.invalid} fehlerhaft übersprungen).
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/crm/campaigns/reaktivierung"
              className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F2937]"
            >
              Zur Kampagne (Freigabe)
            </Link>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setCommitted(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="rounded-lg border border-[#D1D5DB] px-4 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
            >
              Weitere Datei importieren
            </button>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[#111827]">1. Datei auswählen</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onSelect}
              className={`${inputClass} max-w-md`}
            />
            <button
              type="button"
              onClick={runPreview}
              disabled={!file || pending}
              className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F2937] disabled:opacity-50"
            >
              {pending && !preview ? "Analysiere…" : "Vorschau erzeugen"}
            </button>
          </div>
          <p className="mt-2 text-[12px] text-[#6B7280]">
            Erkannte Spalten: Vorname, Nachname, E-Mail, Telefon, Ort. Max. 15 MB.
          </p>
        </section>
      )}

      {preview && !committed ? (
        <>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-[#111827]">2. Vorschau</h2>
            <CounterGrid counters={preview.counters} />
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#EEF0F3] bg-[#F9FAFB] text-[12px] uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Telefon</th>
                  <th className="px-4 py-2.5">E-Mail</th>
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {preview.sample.map((r) => (
                  <tr key={r.rowIndex}>
                    <td className="px-4 py-2 text-[#6B7280]">{r.rowIndex}</td>
                    <td className="px-4 py-2 text-[#111827]">
                      {r.firstName} {r.lastName}
                      {r.city ? <span className="text-[#9CA3AF]"> · {r.city}</span> : null}
                    </td>
                    <td className="px-4 py-2 text-[#374151]">{r.phone || "—"}</td>
                    <td className="px-4 py-2 text-[#374151]">{r.email || "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${STATUS_STYLE[r.status]}`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                      {r.errorReason ? (
                        <span className="ml-2 text-[12px] text-[#9CA3AF]">{r.errorReason}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.counters.totalRows > preview.sample.length ? (
              <p className="px-4 py-2.5 text-[12px] text-[#6B7280]">
                Zeige {preview.sample.length} von {preview.counters.totalRows} Zeilen.
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-[#111827]">3. Import bestätigen</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              {preview.counters.imported} Kontakte werden als Alt-Leads angelegt.
              Es wird keine Nachricht versendet.
            </p>
            <button
              type="button"
              onClick={runCommit}
              disabled={pending || preview.counters.imported === 0}
              className="mt-3 rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F2937] disabled:opacity-50"
            >
              {pending ? "Importiere…" : `${preview.counters.imported} Alt-Leads importieren`}
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}
