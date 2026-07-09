/**
 * LeitstandWhatsApp — the WhatsApp KPI band on the Operations dashboard.
 *
 * Real counts only (see WhatsAppKpisQuery). Each tile deep-links into the leads
 * list pre-filtered by the matching WhatsApp status / quality / temperature so
 * an operator can jump straight from a number to the underlying leads.
 */
import type { Route } from "next";
import Link from "next/link";

import type { WhatsAppKpis } from "../../messaging/types";

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

interface Tile {
  label: string;
  value: string | number;
  href: Route;
  tone?: "default" | "good" | "warn" | "bad";
}

export function LeitstandWhatsApp({ kpis }: { kpis: WhatsAppKpis }) {
  const tiles: ReadonlyArray<Tile> = [
    { label: "Gesendet", value: kpis.sent, href: "/crm/leads?whatsapp=gesendet" as Route },
    { label: "Zugestellt", value: kpis.delivered, href: "/crm/leads?whatsapp=zugestellt" as Route },
    { label: "Gelesen", value: kpis.read, href: "/crm/leads?whatsapp=gelesen" as Route },
    { label: "Antworten", value: kpis.replied, href: "/crm/leads?newReply=1" as Route, tone: "good" },
    { label: "Fehlgeschlagen", value: kpis.failed, href: "/crm/leads?whatsapp=fehlgeschlagen" as Route, tone: "warn" },
    { label: "Nicht registriert", value: kpis.notRegistered, href: "/crm/leads?whatsapp=nicht_registriert" as Route, tone: "warn" },
    { label: "Nummer ungültig", value: kpis.invalidNumbers, href: "/crm/leads?whatsapp=nummer_ungueltig" as Route, tone: "warn" },
    { label: "Schrottleads", value: kpis.culled, href: "/crm/leads?quality=schrottlead" as Route, tone: "bad" },
    { label: "Zustellrate", value: pct(kpis.deliveryRate), href: "/crm/leads?whatsapp=zugestellt" as Route },
    { label: "Leserate", value: pct(kpis.readRate), href: "/crm/leads?whatsapp=gelesen" as Route },
    { label: "Antwortquote", value: pct(kpis.replyRate), href: "/crm/leads?newReply=1" as Route, tone: "good" },
    { label: "HOT Leads", value: kpis.hot, href: "/crm/leads?temp=HOT" as Route, tone: "good" },
    { label: "WARM Leads", value: kpis.warm, href: "/crm/leads?temp=WARM" as Route },
  ];

  return (
    <section className="rounded-2xl border border-ink/[0.06] bg-white p-4 shadow-card sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-muted">
          WhatsApp-Tracking
        </h2>
        <Link
          href={"/crm/multichat" as Route}
          className="text-[12.5px] font-semibold text-brand-700 hover:underline"
        >
          Multichat öffnen →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <KpiTile key={t.label} tile={t} />
        ))}
      </div>
    </section>
  );
}

const TONE: Record<NonNullable<Tile["tone"]>, string> = {
  default: "text-navy-950",
  good: "text-emerald-700",
  warn: "text-amber-700",
  bad: "text-red-700",
};

function KpiTile({ tile }: { tile: Tile }) {
  return (
    <Link
      href={tile.href}
      className="group rounded-xl border border-ink/[0.06] bg-white px-3.5 py-3 transition hover:border-ink/15 hover:shadow-card"
    >
      <p
        className={`text-[24px] font-bold leading-none tabular-nums ${TONE[tile.tone ?? "default"]}`}
      >
        {tile.value}
      </p>
      <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-muted">
        {tile.label}
      </p>
    </Link>
  );
}
