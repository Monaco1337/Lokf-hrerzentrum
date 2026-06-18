/**
 * /crm/communication/whatsapp — WhatsApp-Inbox.
 *
 * Listet WhatsApp-Threads (Lead × jüngste Nachricht), klickbar auf Lead Command Center.
 * Echte Daten aus CommunicationEvent.
 */
import Link from "next/link";
import type { Route } from "next";

import { requireCrmUser } from "@/server/actions/_helpers";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

const DT_FMT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

interface Thread {
  leadId: string;
  leadName: string;
  lastAt: Date;
  lastDirection: "IN" | "OUT";
  lastPayload: string;
  inboundCount: number;
  outboundCount: number;
}

export default async function WhatsAppInboxPage() {
  await requireCrmUser();
  const events = await prisma.communicationEvent.findMany({
    where: { channel: "WHATSAPP" },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      lead: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const threads = new Map<string, Thread>();
  for (const e of events) {
    const t = threads.get(e.leadId);
    if (!t) {
      threads.set(e.leadId, {
        leadId: e.leadId,
        leadName: `${e.lead.firstName} ${e.lead.lastName}`,
        lastAt: e.createdAt,
        lastDirection: e.direction === "IN" ? "IN" : "OUT",
        lastPayload: e.payload,
        inboundCount: e.direction === "IN" ? 1 : 0,
        outboundCount: e.direction === "OUT" ? 1 : 0,
      });
    } else {
      if (e.direction === "IN") t.inboundCount += 1;
      else t.outboundCount += 1;
    }
  }
  const list = Array.from(threads.values()).sort(
    (a, b) => b.lastAt.getTime() - a.lastAt.getTime(),
  );

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
          Kommunikation · WhatsApp
        </p>
        <h1 className="mt-1 font-display text-[28px] font-bold tracking-tight text-navy-950">
          Postfach
        </h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          {list.length} Threads · Antworten direkt im Lead Command Center.
        </p>
      </header>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/15 bg-white/80 px-6 py-10 text-center backdrop-blur-xl">
          <p className="text-[13px] font-semibold text-navy-950">
            Noch keine WhatsApp-Nachrichten
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {list.map((t) => {
            const initials = t.leadName
              .split(/\s+/)
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();
            return (
              <li key={t.leadId}>
                <Link
                  href={`/crm/leads/${t.leadId}` as Route}
                  className="group flex items-start gap-3.5 rounded-2xl border border-ink/[0.07] bg-white/80 px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-ink/15 hover:bg-white hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] sm:gap-4"
                >
                  <span
                    aria-hidden
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-gradient-to-br from-white via-white to-surface-subtle text-[12px] font-bold tracking-tight text-navy-950 ring-1 ring-inset ring-ink/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.06)]"
                  >
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-[13.5px] font-bold tracking-tight text-navy-950 transition group-hover:text-brand-700">
                        {t.leadName}
                      </p>
                      <p className="shrink-0 text-[10.5px] tabular-nums text-ink-muted">
                        {DT_FMT.format(t.lastAt)}
                      </p>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[12px] text-ink-muted">
                      <span
                        className={
                          t.lastDirection === "IN"
                            ? "font-semibold text-emerald-700"
                            : "font-semibold text-blue-700"
                        }
                      >
                        {t.lastDirection === "IN" ? "↘ " : "↗ "}
                      </span>
                      {t.lastPayload.slice(0, 160)}
                    </p>
                    <p className="mt-1.5 text-[10.5px] text-ink-muted">
                      {t.inboundCount} ein · {t.outboundCount} aus
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
