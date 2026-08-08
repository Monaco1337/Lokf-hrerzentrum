"use client";
/**
 * DashboardWhatsApp — WhatsApp tracking as a COLLAPSIBLE statistics widget.
 * Collapsed by default so it never dominates the operative dashboard; expands
 * on demand for the full KPI band. Real counts only (see WhatsAppKpisQuery).
 * Styled with the remap-proof `.dash-*` layer (tone: emerald).
 */
import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";

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

const TONE: Record<NonNullable<Tile["tone"]>, string> = {
  default: "text-white",
  good: "text-emerald-300",
  warn: "text-amber-300",
  bad: "text-rose-300",
};

export function DashboardWhatsApp({ kpis }: { kpis: WhatsAppKpis }) {
  const [open, setOpen] = useState(false);

  const tiles: ReadonlyArray<Tile> = [
    { label: "Gesendet", value: kpis.sent, href: "/crm/leads?whatsapp=gesendet" as Route },
    { label: "Zugestellt", value: kpis.delivered, href: "/crm/leads?whatsapp=zugestellt" as Route },
    { label: "Gelesen", value: kpis.read, href: "/crm/leads?whatsapp=gelesen" as Route },
    { label: "Antworten", value: kpis.replied, href: "/crm/leads?newReply=1" as Route, tone: "good" },
    { label: "Fehlgeschlagen", value: kpis.failed, href: "/crm/leads?whatsapp=fehlgeschlagen" as Route, tone: "warn" },
    { label: "Zustellrate", value: pct(kpis.deliveryRate), href: "/crm/leads?whatsapp=zugestellt" as Route },
    { label: "Leserate", value: pct(kpis.readRate), href: "/crm/leads?whatsapp=gelesen" as Route },
    { label: "Antwortquote", value: pct(kpis.replyRate), href: "/crm/leads?newReply=1" as Route, tone: "good" },
    { label: "Nicht registriert", value: kpis.notRegistered, href: "/crm/leads?whatsapp=nicht_registriert" as Route, tone: "warn" },
    { label: "Nummer ungültig", value: kpis.invalidNumbers, href: "/crm/leads?whatsapp=nummer_ungueltig" as Route, tone: "warn" },
    { label: "HOT Leads", value: kpis.hot, href: "/crm/leads?temp=HOT" as Route, tone: "good" },
    { label: "WARM Leads", value: kpis.warm, href: "/crm/leads?temp=WARM" as Route },
  ];

  return (
    <section className="dash-card dash-t-emerald">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <div className="flex items-center gap-2.5">
          <span className="dash-tile dash-tile--sm" aria-hidden>
            <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12c0 4.4-4 8-9 8-1.4 0-2.7-.3-3.9-.8L3 21l1.6-4.5C3.6 15.2 3 13.7 3 12c0-4.4 4-8 9-8s9 3.6 9 8Z" />
            </svg>
          </span>
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-white">
              WhatsApp-Statistik
            </h2>
            <p className="mt-0.5 text-[11.5px] text-[#7f8a83]">
              {kpis.sent} gesendet · {pct(kpis.replyRate)} Antwortquote
            </p>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-[#7f8a83] transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div className="border-t border-white/[0.06] p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {tiles.map((t) => (
              <Link key={t.label} href={t.href} className="dash-row px-3.5 py-3">
                <p className={`text-[22px] font-extrabold leading-none tabular-nums ${TONE[t.tone ?? "default"]}`}>
                  {t.value}
                </p>
                <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-wide text-[#7f8a83]">
                  {t.label}
                </p>
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link href={"/crm/campaigns/reaktivierung" as Route} className="text-[12.5px] font-semibold text-emerald-300 hover:text-emerald-200">
              Reaktivierung →
            </Link>
            <Link href={"/crm/multichat" as Route} className="text-[12.5px] font-semibold text-emerald-300 hover:text-emerald-200">
              Multichat öffnen →
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
