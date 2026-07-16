"use client";

/**
 * ReactivationCampaign — the Reaktivierung workspace.
 *
 * Premium glass design matching the Multichat: a live overview bar (the 10
 * headline metrics), a few-clicks release panel ("100 offene Leads → anschreiben"
 * — one click also dispatches them right away), template health and the
 * follow-up runner. Outbound is driven by the reliable campaign queue; the KI
 * reply router (Workflow-Engine) takes over the inbound side automatically.
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

const TONE_VALUE: Record<Tone, string> = {
  ink: "text-slate-900",
  green: "text-emerald-600",
  blue: "text-sky-600",
  amber: "text-amber-600",
  violet: "text-violet-600",
  red: "text-rose-600",
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
    <div className="rounded-2xl border border-black/[0.06] bg-white/70 px-3.5 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.25)] backdrop-blur">
      <div className={`text-[22px] font-semibold leading-none ${TONE_VALUE[tone]}`}>
        {value.toLocaleString("de-DE")}
      </div>
      <div className="mt-1.5 text-[11px] font-medium leading-tight text-slate-500">
        {label}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[10px] leading-tight text-slate-400">{hint}</div>
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
          <h1 className="text-[20px] font-semibold tracking-tight text-slate-900">
            Reaktivierung
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
            Alt-Leads reaktivieren – Erstkontakt, automatische Erinnerungen und
            KI-Antwort-Router in einem Ablauf.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/crm/multichat"
            className="rounded-xl border border-black/[0.08] bg-white/70 px-3.5 py-2 text-[13px] font-medium text-slate-700 backdrop-blur transition hover:bg-white"
          >
            Multi-Chat öffnen
          </Link>
          <Link
            href="/crm/import"
            className="rounded-xl border border-black/[0.08] bg-white/70 px-3.5 py-2 text-[13px] font-medium text-slate-700 backdrop-blur transition hover:bg-white"
          >
            Leads importieren
          </Link>
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-2.5 text-[13px] text-rose-700 backdrop-blur">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-[13px] text-emerald-800 backdrop-blur">
          {notice}
        </p>
      ) : null}

      {/* Live overview — the 10 headline metrics */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Live-Übersicht
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Importiert" value={overview.imported} />
          <StatCard label="Offen" value={overview.open} tone="blue" />
          <StatCard label="Heute angeschrieben" value={overview.contactedToday} tone="green" />
          <StatCard label="Warten auf Antwort" value={overview.waitingReply} tone="amber" />
          <StatCard label="Erinnerung 24 h" value={overview.reminder24h} tone="amber" />
          <StatCard label="Erinnerung 48 h" value={overview.reminder48h} tone="amber" />
          <StatCard label="Eignungscheck gestartet" value={overview.eligibilityStarted} tone="violet" />
          <StatCard label="Bereits im Funnel" value={overview.inFunnel} tone="green" />
          <StatCard label="Abgeschlossen" value={overview.completed} />
          <StatCard label="Fehlgeschlagen" value={overview.failed} tone="red" />
        </div>
      </section>

      {/* Release panel — few clicks */}
      <section className="rounded-2xl border border-black/[0.06] bg-white/70 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">
              Nächste offene Leads anschreiben
            </h2>
            <p className="mt-1 text-[13px] text-slate-500">
              <strong className="text-slate-700">{readyCount.toLocaleString("de-DE")}</strong>{" "}
              Alt-Leads sind versandbereit. Das System nimmt automatisch die
              nächsten offenen Leads – bereits kontaktierte werden nie erneut
              angeschrieben.
            </p>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-slate-600">
            <input
              type="checkbox"
              checked={!whatsappOnly}
              onChange={(e) => setWhatsappOnly(!e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
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
              className={[
                "rounded-full px-4 py-1.5 text-[13px] font-medium transition",
                tier === t
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "border border-black/[0.08] bg-white/70 text-slate-600 hover:bg-white",
              ].join(" ")}
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
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending
              ? "Wird gesendet…"
              : `Jetzt ${tier === "all" ? "alle offenen" : tier} Leads anschreiben`}
          </button>
          <button
            type="button"
            onClick={() => doRelease("test5")}
            disabled={pending || readyCount === 0}
            className="rounded-xl border border-black/[0.08] bg-white/70 px-4 py-2.5 text-[13px] font-medium text-slate-700 backdrop-blur transition hover:bg-white disabled:opacity-50"
          >
            Testversand (5)
          </button>
        </div>

        {!whatsappLive ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-[12.5px] text-amber-800">
            WhatsApp ist aktuell nicht live (Simulation). E-Mail wird real
            versendet, WhatsApp-Schritte werden simuliert.
          </p>
        ) : waMissingSender ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-[12.5px] text-amber-800">
            Eine freigegebene WhatsApp-Vorlage hat keine Absendernummer. Bitte in
            der Vorlage unter „Senden über“ eine aktive Nummer wählen – sonst
            schlägt jeder WhatsApp-Versand fehl.
          </p>
        ) : !waSendable ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2 text-[12.5px] text-amber-800">
            Kein WhatsApp-Template ist von Meta freigegeben – WhatsApp-Schritte
            werden übersprungen, E-Mail läuft weiter.
          </p>
        ) : null}
      </section>

      {/* Templates + runner */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur">
          <div className="border-b border-black/[0.05] px-5 py-3">
            <h2 className="text-[13px] font-semibold text-slate-900">Vorlagen</h2>
          </div>
          <table className="w-full text-left text-[13px]">
            <tbody className="divide-y divide-black/[0.04]">
              {templates.map((t) => (
                <tr key={t.slug}>
                  <td className="px-5 py-2.5 text-slate-800">{t.name}</td>
                  <td className="px-5 py-2.5 text-slate-500">
                    {t.channel === "WHATSAPP" ? "WhatsApp" : "E-Mail"}
                  </td>
                  <td className="px-5 py-2.5">
                    {t.channel === "EMAIL" ? (
                      <span className="text-emerald-600">Versandbereit</span>
                    ) : t.sendable ? (
                      <span className="text-emerald-600">Freigegeben</span>
                    ) : t.metaApprovalStatus === "approved" &&
                      !t.senderConfigured ? (
                      <span className="text-amber-600">Absender fehlt</span>
                    ) : (
                      <span className="text-amber-600">
                        {t.metaApprovalStatus ?? "nicht eingereicht"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-black/[0.06] bg-white/70 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur">
          <h2 className="text-[13px] font-semibold text-slate-900">
            Fällige Erinnerungen
          </h2>
          <p className="mt-1 text-[13px] text-slate-500">
            <strong className="text-slate-700">{dueCount}</strong> fällige Jobs.
            Erinnerungen laufen automatisch per Cron – hier manuell auslösbar.
          </p>
          {failedReasons.length > 0 ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                Warum fehlgeschlagen?
              </p>
              <ul className="mt-1 space-y-1">
                {failedReasons.map((r) => (
                  <li key={r.reason} className="text-[13px] text-amber-800">
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
              className="rounded-xl border border-black/[0.08] bg-white/70 px-4 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-white disabled:opacity-50"
            >
              {pending ? "Verarbeite…" : "Fällige jetzt senden"}
            </button>
            {failedCount > 0 ? (
              <button
                type="button"
                onClick={doRequeueFailed}
                disabled={pending}
                className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-2 text-[13px] font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
              >
                {pending ? "Verarbeite…" : `Fehlgeschlagene erneut (${failedCount})`}
              </button>
            ) : null}
          </div>
        </section>
      </div>

      {/* Detail KPIs (secondary) */}
      <section className="rounded-2xl border border-black/[0.06] bg-white/60 p-4 backdrop-blur">
        <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          Reaktionen &amp; Zustellung
        </h2>
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
