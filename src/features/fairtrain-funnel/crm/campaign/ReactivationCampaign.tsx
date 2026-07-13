"use client";

/**
 * ReactivationCampaign — overview, manual release (with staffing tiers) and the
 * manual "Fällige senden" trigger for the Alt-Lead reactivation campaign.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type {
  CampaignKpis,
  CampaignTemplateInfo,
  ReleaseTier,
} from "@/features/fairtrain-funnel/campaign/types";
import { RELEASE_TIER_LABEL } from "@/features/fairtrain-funnel/campaign/types";
import {
  releaseCampaign,
  sendDueCampaignJobs,
} from "@/server/actions/campaign";

function Tile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-3">
      <div className={`text-2xl font-semibold ${tone ?? "text-[#111827]"}`}>{value}</div>
      <div className="mt-0.5 text-[12px] uppercase tracking-wide text-[#6B7280]">{label}</div>
    </div>
  );
}

const TIER_ORDER: ReleaseTier[] = [
  "test5",
  "10",
  "50",
  "100",
  "300",
  "500",
  "all",
];

export function ReactivationCampaign({
  kpis,
  readyCount,
  dueCount,
  templates,
  whatsappLive,
}: {
  kpis: CampaignKpis;
  readyCount: number;
  dueCount: number;
  templates: CampaignTemplateInfo[];
  whatsappLive: boolean;
}) {
  const router = useRouter();
  const [tier, setTier] = useState<ReleaseTier>("300");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const waSendable = templates.some((t) => t.channel === "WHATSAPP" && t.sendable);

  function doRelease(chosen: ReleaseTier) {
    setError(null);
    setNotice(null);
    const label = RELEASE_TIER_LABEL[chosen];
    if (
      !window.confirm(
        `Kampagne freigeben – ${label}?\n\nDie ausgewählten versandbereiten Alt-Leads erhalten den Erstkontakt (WhatsApp + E-Mail). Fortfahren?`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await releaseCampaign({ tier: chosen });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setNotice(
        `Freigegeben: ${res.data.enqueued} Leads in die Warteschlange (${res.data.skipped} übersprungen).`,
      );
      router.refresh();
    });
  }

  function doSendDue() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await sendDueCampaignJobs();
      if (!res.ok) {
        setError(res.message);
        return;
      }
      const s = res.data;
      setNotice(
        `Verarbeitet: ${s.processed} · gesendet: ${s.sent} · fehlgeschlagen: ${s.failed} · übersprungen: ${s.skipped} · finalisiert: ${s.finalized}.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#111827]">
            Reaktivierung Alt-Leads
          </h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Reaktivierungskampagne für importierte Beschäftigte (Tag 0 / 3 / 7).
          </p>
        </div>
        <Link
          href="/crm/import"
          className="rounded-lg border border-[#D1D5DB] px-3 py-1.5 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB]"
        >
          Leads importieren
        </Link>
      </header>

      {error ? (
        <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-sm text-[#B91C1C]">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2.5 text-sm text-[#15803D]">
          {notice}
        </p>
      ) : null}

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Tile label="Importiert" value={kpis.imported} />
        <Tile label="Versandbereit" value={kpis.versandbereit} tone="text-[#2563EB]" />
        <Tile label="Erstkontakt gesendet" value={kpis.erstkontaktGesendet} />
        <Tile label="Follow-up 1 / 2" value={kpis.followup1Gesendet} />
        <Tile label="WhatsApp gesendet" value={kpis.whatsappGesendet} />
        <Tile label="WA zugestellt" value={kpis.whatsappZugestellt} />
        <Tile label="WA gelesen" value={kpis.whatsappGelesen} />
        <Tile label="E-Mail gesendet" value={kpis.emailGesendet} />
        <Tile label="Antworten" value={kpis.antworten} tone="text-[#15803D]" />
        <Tile label="Ja, Interesse" value={kpis.jaInteresse} tone="text-[#15803D]" />
        <Tile label="Mehr Infos" value={kpis.mehrInfos} />
        <Tile label="Kein Interesse" value={kpis.keinInteresse} tone="text-[#B45309]" />
        <Tile label="Inaktiv" value={kpis.inaktiv} />
        <Tile label="Fehlerhafte Kontakte" value={kpis.fehlerhafte} tone="text-[#B91C1C]" />
      </section>

      {/* Templates */}
      <section className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm">
        <div className="border-b border-[#EEF0F3] px-5 py-3">
          <h2 className="text-sm font-semibold text-[#111827]">Vorlagen</h2>
        </div>
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-[#F3F4F6]">
            {templates.map((t) => (
              <tr key={t.slug}>
                <td className="px-5 py-2.5 text-[#111827]">{t.name}</td>
                <td className="px-5 py-2.5 text-[#6B7280]">
                  {t.channel === "WHATSAPP" ? "WhatsApp" : "E-Mail"}
                </td>
                <td className="px-5 py-2.5">
                  {t.channel === "EMAIL" ? (
                    <span className="text-[#15803D]">Versandbereit</span>
                  ) : t.sendable ? (
                    <span className="text-[#15803D]">Meta: freigegeben</span>
                  ) : (
                    <span className="text-[#B45309]">
                      Meta: {t.metaApprovalStatus ?? "nicht eingereicht"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Release panel */}
      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#111827]">Kampagne freigeben</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          <strong>{readyCount}</strong> Alt-Leads sind versandbereit. Kanäle:
          WhatsApp + E-Mail. Importierte Alt-Leads werden erst nach dieser
          Bestätigung kontaktiert.
        </p>
        {!whatsappLive ? (
          <p className="mt-2 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2 text-[13px] text-[#9A3412]">
            WhatsApp ist aktuell nicht live (Simulation). E-Mail wird real
            versendet, WhatsApp-Schritte werden simuliert.
          </p>
        ) : !waSendable ? (
          <p className="mt-2 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2 text-[13px] text-[#9A3412]">
            Kein WhatsApp-Template ist von Meta freigegeben – WhatsApp-Schritte
            werden übersprungen/als fehlgeschlagen markiert, E-Mail läuft weiter.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-[12px] font-medium uppercase tracking-wide text-[#6B7280]">
              Versandstaffelung
            </span>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as ReleaseTier)}
              className="rounded-lg border border-[#D1D5DB] px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#111827]"
            >
              {TIER_ORDER.filter((t) => t !== "test5").map((t) => (
                <option key={t} value={t}>
                  {RELEASE_TIER_LABEL[t]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => doRelease(tier)}
            disabled={pending || readyCount === 0}
            className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1F2937] disabled:opacity-50"
          >
            {pending ? "Wird freigegeben…" : "Freigeben und Kampagne starten"}
          </button>
          <button
            type="button"
            onClick={() => doRelease("test5")}
            disabled={pending || readyCount === 0}
            className="rounded-lg border border-[#D1D5DB] px-4 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50"
          >
            Testversand an 5 Leads
          </button>
        </div>
      </section>

      {/* Runner */}
      <section className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#111827]">
          Fällige Follow-ups senden
        </h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          <strong>{dueCount}</strong> fällige Jobs in der Warteschlange. Läuft
          automatisch per Cron – hier manuell auslösbar.
        </p>
        <button
          type="button"
          onClick={doSendDue}
          disabled={pending}
          className="mt-3 rounded-lg border border-[#D1D5DB] px-4 py-2 text-sm font-medium text-[#374151] transition hover:bg-[#F9FAFB] disabled:opacity-50"
        >
          {pending ? "Verarbeite…" : "Fällige jetzt senden"}
        </button>
      </section>
    </div>
  );
}
