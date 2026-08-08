"use client";

/**
 * ReactivationCampaign — the Reaktivierung workspace.
 *
 * Premium dark High-End surface (matching the Dashboard/Multichat): a live
 * overview bar (headline metrics as tone tiles), a few-clicks release panel
 * ("100 offene Leads → anschreiben" — one click also dispatches them right
 * away), template health and the follow-up runner. Colour comes from the
 * remap-proof `.dash-*` layer. Outbound is driven by the reliable campaign
 * queue; the KI reply router (Workflow-Engine) takes over the inbound side
 * automatically. Only styling changed here — all logic is unchanged.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type {
  CampaignKpis,
  CampaignTemplateInfo,
  ReactivationOverview,
  ReleaseTier,
} from "@/features/fairtrain-funnel/campaign/types";
import { RELEASE_TIER_LABEL } from "@/features/fairtrain-funnel/campaign/types";
import {
  releaseCampaign,
  requeueFailedCampaignJobs,
  sendDueCampaignJobs,
} from "@/server/actions/campaign";

type Tone = "ink" | "green" | "blue" | "amber" | "violet" | "red";

const TONE_DASH: Record<Tone, string> = {
  ink: "",
  green: "dash-t-emerald",
  blue: "dash-t-cyan",
  amber: "dash-t-amber",
  violet: "dash-t-violet",
  red: "dash-t-rose",
};

function StatCard({
  label,
  value,
  tone = "ink",
  hint,
}: {
  label: string;
  value: number;
  tone?: Tone;
  hint?: string;
}) {
  return (
    <div className={`dash-card ${TONE_DASH[tone]} px-3.5 py-3`}>
      <div className="dash-num text-[22px]">{value.toLocaleString("de-DE")}</div>
      <div className="mt-1.5 text-[11px] font-medium leading-tight text-[#aab4ae]">
        {label}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[10px] leading-tight text-[#7f8a83]">{hint}</div>
      ) : null}
    </div>
  );
}

const TIER_CHIPS: ReleaseTier[] = ["10", "50", "100", "300", "500", "all"];

export function ReactivationCampaign({
  overview,
  kpis,
  readyCount,
  dueCount,
  failedCount,
  failedReasons,
  templates,
  whatsappLive,
}: {
  overview: ReactivationOverview;
  kpis: CampaignKpis;
  readyCount: number;
  dueCount: number;
  failedCount: number;
  failedReasons: { reason: string; count: number }[];
  templates: CampaignTemplateInfo[];
  whatsappLive: boolean;
}) {
  const router = useRouter();
  const [tier, setTier] = useState<ReleaseTier>("100");
  const [whatsappOnly, setWhatsappOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const waTemplates = templates.filter((t) => t.channel === "WHATSAPP");
  const waSendable = waTemplates.some((t) => t.sendable);
  const waMissingSender = waTemplates.some(
    (t) => t.metaApprovalStatus === "approved" && !t.senderConfigured,
  );

  function doRelease(chosen: ReleaseTier) {
    setError(null);
    setNotice(null);
    const label = RELEASE_TIER_LABEL[chosen];
    const channelLabel = whatsappOnly ? "nur WhatsApp" : "WhatsApp + E-Mail";
    if (
      !window.confirm(
        `${label} anschreiben?\n\nNur wirklich unbehandelte Alt-Leads erhalten den Erstkontakt (${channelLabel}). Bereits kontaktierte, wartende, im Funnel befindliche oder abgeschlossene Leads werden automatisch ausgeschlossen (Kontaktschutz). Die Nachrichten gehen sofort raus.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await releaseCampaign({ tier: chosen, whatsappOnly });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      const d = res.data;
      const sentPart = d.sendDeferred
        ? "Versand läuft im Hintergrund weiter (großer Stapel)."
        : `${d.sent} sofort gesendet${d.failed > 0 ? `, ${d.failed} fehlgeschlagen` : ""}.`;
      setNotice(
        `${d.enqueued} Alt-Leads freigegeben (${d.skipped} übersprungen). ${sentPart}`,
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

  function doRequeueFailed() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const res = await requeueFailedCampaignJobs();
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setNotice(
        `${res.data.requeued} fehlgeschlagene Job(s) erneut eingereiht. Sie werden beim nächsten Versand automatisch mitgesendet.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[21px] font-bold tracking-tight text-white">
            Reaktivierung
          </h1>
          <p className="mt-1 text-[13px] text-[#9aa6a0]">
            Alt-Leads reaktivieren – Erstkontakt, automatische Erinnerungen und
            KI-Antwort-Router in einem Ablauf.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/crm/multichat"
            className="dash-soft px-3.5 py-2 text-[13px] font-medium transition"
          >
            Multi-Chat öffnen
          </Link>
          <Link
            href="/crm/import"
            className="dash-soft px-3.5 py-2 text-[13px] font-medium transition"
          >
            Leads importieren
          </Link>
        </div>
      </header>

      {error ? (
        <p className="dash-note-err px-4 py-2.5 text-[13px]">{error}</p>
      ) : null}
      {notice ? (
        <p className="dash-note-ok px-4 py-2.5 text-[13px]">{notice}</p>
      ) : null}

      {/* Live overview — the headline metrics */}
      <section>
        <div className="mb-2.5 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <h2 className="dash-eyebrow">Live-Übersicht</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Importiert" value={overview.imported} />
          <StatCard label="Offen" value={overview.open} tone="blue" />
          <StatCard label="Heute angeschrieben" value={overview.contactedToday} tone="green" />
          <StatCard label="Warten auf Antwort" value={overview.waitingReply} tone="amber" />
          <StatCard label="Eignungscheck gestartet" value={overview.eligibilityStarted} tone="violet" />
          <StatCard label="Bereits im Funnel" value={overview.inFunnel} tone="green" />
          <StatCard label="Abgeschlossen" value={overview.completed} />
          <StatCard label="Fehlgeschlagen" value={overview.failed} tone="red" />
        </div>
      </section>

      {/* Release panel — few clicks */}
      <section className="dash-panel dash-t-emerald p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-bold text-white">
              Nächste offene Leads anschreiben
            </h2>
            <p className="mt-1 text-[13px] text-[#9aa6a0]">
              <strong className="text-emerald-300">{readyCount.toLocaleString("de-DE")}</strong>{" "}
              Alt-Leads sind versandbereit. Das System nimmt automatisch die
              nächsten offenen Leads – bereits kontaktierte werden nie erneut
              angeschrieben.
            </p>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-[#aab4ae]">
            <input
              type="checkbox"
              checked={!whatsappOnly}
              onChange={(e) => setWhatsappOnly(!e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-500"
            />
            Auch per E-Mail
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {TIER_CHIPS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition ${
                tier === t ? "dash-pill dash-pill--active" : "dash-pill"
              }`}
            >
              {t === "all" ? "Alle" : t}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => doRelease(tier)}
            disabled={pending || readyCount === 0}
            className="dash-btn-primary rounded-xl px-5 py-2.5 text-[13.5px] transition disabled:opacity-50"
          >
            {pending
              ? "Wird gesendet…"
              : `Jetzt ${tier === "all" ? "alle offenen" : tier} Leads anschreiben`}
          </button>
          <button
            type="button"
            onClick={() => doRelease("test5")}
            disabled={pending || readyCount === 0}
            className="dash-soft px-4 py-2.5 text-[13px] font-medium transition disabled:opacity-50"
          >
            Testversand (5)
          </button>
        </div>

        {!whatsappLive ? (
          <p className="dash-note-warn mt-3 px-3.5 py-2 text-[12.5px]">
            WhatsApp ist aktuell nicht live (Simulation). E-Mail wird real
            versendet, WhatsApp-Schritte werden simuliert.
          </p>
        ) : waMissingSender ? (
          <p className="dash-note-warn mt-3 px-3.5 py-2 text-[12.5px]">
            Eine freigegebene WhatsApp-Vorlage hat keine Absendernummer. Bitte in
            der Vorlage unter „Senden über“ eine aktive Nummer wählen – sonst
            schlägt jeder WhatsApp-Versand fehl.
          </p>
        ) : !waSendable ? (
          <p className="dash-note-warn mt-3 px-3.5 py-2 text-[12.5px]">
            Kein WhatsApp-Template ist von Meta freigegeben – WhatsApp-Schritte
            werden übersprungen, E-Mail läuft weiter.
          </p>
        ) : null}
      </section>

      {/* Templates + runner */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="dash-panel overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-3.5">
            <h2 className="text-[13px] font-bold text-white">Vorlagen</h2>
          </div>
          <table className="w-full text-left text-[13px]">
            <tbody className="divide-y divide-white/[0.06]">
              {templates.map((t) => (
                <tr key={t.slug}>
                  <td className="px-5 py-2.5 text-[#e9efeb]">{t.name}</td>
                  <td className="px-5 py-2.5 text-[#9aa6a0]">
                    {t.channel === "WHATSAPP" ? "WhatsApp" : "E-Mail"}
                  </td>
                  <td className="px-5 py-2.5">
                    {t.channel === "EMAIL" ? (
                      <span className="text-emerald-300">Versandbereit</span>
                    ) : t.sendable ? (
                      <span className="text-emerald-300">Freigegeben</span>
                    ) : t.metaApprovalStatus === "approved" &&
                      !t.senderConfigured ? (
                      <span className="text-amber-300">Absender fehlt</span>
                    ) : (
                      <span className="text-amber-300">
                        {t.metaApprovalStatus ?? "nicht eingereicht"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="dash-panel p-5">
          <h2 className="text-[13px] font-bold text-white">
            Warteschlange (Erstkontakt)
          </h2>
          <p className="mt-1 text-[13px] text-[#9aa6a0]">
            <strong className="text-white">{dueCount}</strong> Erstkontakte in
            der Warteschlange (z. B. Rest eines großen Stapels). Es wird nur der
            Erstkontakt gesendet – danach wartet das System auf die Antwort und
            der KI-Antwort-Router übernimmt. Cron sendet automatisch weiter, hier
            manuell auslösbar.
          </p>
          {failedReasons.length > 0 ? (
            <div className="dash-note-warn mt-3 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                Warum fehlgeschlagen?
              </p>
              <ul className="mt-1 space-y-1">
                {failedReasons.map((r) => (
                  <li key={r.reason} className="text-[13px] text-amber-200">
                    <strong>{r.count}×</strong> {r.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={doSendDue}
              disabled={pending}
              className="dash-soft px-4 py-2 text-[13px] font-medium transition disabled:opacity-50"
            >
              {pending ? "Verarbeite…" : "Warteschlange jetzt senden"}
            </button>
            {failedCount > 0 ? (
              <button
                type="button"
                onClick={doRequeueFailed}
                disabled={pending}
                className="dash-note-warn px-4 py-2 text-[13px] font-medium transition disabled:opacity-50"
              >
                {pending ? "Verarbeite…" : `Fehlgeschlagene erneut (${failedCount})`}
              </button>
            ) : null}
          </div>
        </section>
      </div>

      {/* Detail KPIs (secondary) */}
      <section className="dash-panel p-4">
        <h2 className="dash-eyebrow mb-3">Reaktionen &amp; Zustellung</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="WhatsApp gesendet" value={kpis.whatsappGesendet} />
          <StatCard label="WA zugestellt" value={kpis.whatsappZugestellt} />
          <StatCard label="WA gelesen" value={kpis.whatsappGelesen} />
          <StatCard label="Antworten" value={kpis.antworten} tone="green" />
          <StatCard label="Ja, Interesse" value={kpis.jaInteresse} tone="green" />
          <StatCard label="Kein Interesse" value={kpis.keinInteresse} tone="amber" />
        </div>
      </section>
    </div>
  );
}
