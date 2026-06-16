/**
 * /crm/applicants/uploads — Bewerberzentrierte Upload-Übersicht.
 *
 * Statt einer flachen Dateimanager-Tabelle (Datei · Typ · Größe) zeigen wir
 * pro Bewerber eine Akte: welche Pflichtunterlagen sind da, welche fehlen.
 * Das ist die operative Sicht, die der Brief verlangt.
 */
import Link from "next/link";
import type { Route } from "next";

import type { LeadSummary, UploadedFileEntry } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { documentRepository } from "@/server/repositories/DocumentRepository";
import { leadRepository } from "@/server/repositories/LeadRepository";
import { uploadedFileRepository } from "@/server/repositories/UploadedFileRepository";
import { applyScope } from "@/server/services/LeadAccess";

export const dynamic = "force-dynamic";

interface DocSlot {
  key: string;
  label: string;
  kinds: ReadonlyArray<string>;
}

/**
 * Canonical operative document slots — same set as the Workflow-Engine
 * provisions when a lead enters DOC_PENDING.
 */
const SLOTS: ReadonlyArray<DocSlot> = [
  { key: "lebenslauf", label: "Lebenslauf", kinds: ["CV", "LEBENSLAUF"] },
  { key: "ausweis", label: "Ausweis", kinds: ["ID", "AUSWEIS"] },
  { key: "zeugnis", label: "Zeugnis", kinds: ["CERTIFICATE", "ZEUGNIS"] },
  {
    key: "gutschein",
    label: "Gutscheinunterlagen",
    kinds: ["GUTSCHEIN", "VOUCHER"],
  },
];

type SlotState = "ok" | "missing" | "pending";

interface BewerberAkte {
  lead: LeadSummary;
  slots: ReadonlyArray<{ slot: DocSlot; state: SlotState; detail: string }>;
  filledCount: number;
  totalSlots: number;
  extraFiles: ReadonlyArray<UploadedFileEntry>;
}

function classifySlot(
  slot: DocSlot,
  generatedKinds: Set<string>,
  uploadedKinds: Set<string>,
  pendingKinds: Set<string>,
): { state: SlotState; detail: string } {
  for (const kind of slot.kinds) {
    if (generatedKinds.has(kind))
      return { state: "ok", detail: "geprüft & abgelegt" };
    if (uploadedKinds.has(kind))
      return { state: "ok", detail: "vom Bewerber hochgeladen" };
  }
  for (const kind of slot.kinds) {
    if (pendingKinds.has(kind))
      return { state: "pending", detail: "angefordert, wartet auf Bewerber" };
  }
  return { state: "missing", detail: "fehlt" };
}

export default async function UploadsByApplicantPage() {
  const currentUser = await requireCrmUser();
  const scoped = applyScope({}, currentUser);
  const leads = await leadRepository.list(scoped);

  const items: BewerberAkte[] = await Promise.all(
    leads.map(async (lead) => {
      const [files, documents] = await Promise.all([
        uploadedFileRepository.listByLead(lead.id),
        documentRepository.list(lead.id),
      ]);
      const activeFiles = files.filter((f) => f.deletedAt === null);
      const uploadedKinds = new Set(activeFiles.map((f) => f.kind));
      const generatedKinds = new Set(
        documents
          .filter((d) => d.status !== "MISSING_DATA")
          .map((d) => d.type),
      );
      const pendingKinds = new Set(
        documents
          .filter((d) => d.status === "MISSING_DATA")
          .map((d) => d.type),
      );

      const slotStates = SLOTS.map((slot) => ({
        slot,
        ...classifySlot(slot, generatedKinds, uploadedKinds, pendingKinds),
      }));
      const filledCount = slotStates.filter((s) => s.state === "ok").length;

      // Extra files that don't belong to any canonical slot
      const slotKinds = new Set(SLOTS.flatMap((s) => s.kinds));
      const extraFiles = activeFiles.filter((f) => !slotKinds.has(f.kind));

      return {
        lead,
        slots: slotStates,
        filledCount,
        totalSlots: SLOTS.length,
        extraFiles,
      };
    }),
  );

  const sortable = [...items].sort((a, b) => {
    // Show worst (most missing) first — those need work
    const ma = a.totalSlots - a.filledCount;
    const mb = b.totalSlots - b.filledCount;
    if (ma !== mb) return mb - ma;
    return (
      b.lead.createdAt.getTime() - a.lead.createdAt.getTime()
    );
  });

  const totalMissing = items.reduce(
    (s, i) => s + (i.totalSlots - i.filledCount),
    0,
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ops-eyebrow">Bewerber-Uploads</p>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
            Bewerberakten
          </h1>
          <p className="mt-1 max-w-2xl text-[12.5px] text-zinc-400">
            Pro Bewerber: welche Pflichtunterlagen sind da, welche fehlen.
            Klicke auf eine Akte zum Öffnen.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="ops-chip ops-chip-slate">
            {items.length} Bewerber
          </span>
          {totalMissing > 0 && (
            <span className="ops-chip ops-chip-amber">
              {totalMissing} fehlende Dokumente
            </span>
          )}
        </div>
      </header>

      {sortable.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-10 text-center text-[13px] text-zinc-500">
          Keine Bewerber im Zugriff.
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {sortable.map((row) => (
            <li key={row.lead.id}>
              <BewerberAkteCard data={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BewerberAkteCard({ data }: { data: BewerberAkte }) {
  const { lead, slots, filledCount, totalSlots, extraFiles } = data;
  const initials = `${lead.firstName[0] ?? ""}${lead.lastName[0] ?? ""}`.toUpperCase();
  const isComplete = filledCount === totalSlots;
  return (
    <Link
      href={`/crm/leads/${lead.id}` as Route}
      className="block rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4 transition hover:border-white/[0.16] hover:bg-[#161618]"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[12px] font-bold text-black">
          {initials || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold text-white">
            {lead.firstName} {lead.lastName}
          </p>
          <p className="mt-0.5 text-[10.5px] text-zinc-500">
            {lead.city ?? "—"} · Status {lead.status}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
            isComplete
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-300"
          }`}
        >
          {filledCount} / {totalSlots}
        </span>
      </div>

      <ul className="mt-3 space-y-1.5">
        {slots.map(({ slot, state, detail }) => (
          <li
            key={slot.key}
            className="flex items-center justify-between gap-2 text-[12px]"
          >
            <span className="flex items-center gap-2 text-zinc-200">
              <SlotIcon state={state} />
              {slot.label}
            </span>
            <span
              className={`text-[10.5px] ${
                state === "ok"
                  ? "text-emerald-300"
                  : state === "pending"
                    ? "text-amber-300"
                    : "text-red-300"
              }`}
            >
              {detail}
            </span>
          </li>
        ))}
      </ul>

      {extraFiles.length > 0 && (
        <p className="mt-3 text-[10.5px] text-zinc-500">
          + {extraFiles.length} weitere Datei{extraFiles.length === 1 ? "" : "en"}
        </p>
      )}

      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
        Akte öffnen
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}

function SlotIcon({ state }: { state: SlotState }) {
  if (state === "ok") {
    return (
      <span
        aria-hidden
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  }
  if (state === "pending") {
    return (
      <span
        aria-hidden
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/20 text-amber-300"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500/20 text-red-300"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    </span>
  );
}
