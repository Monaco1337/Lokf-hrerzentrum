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
        <p className="ops-eyebrow">Kommunikation · WhatsApp</p>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
          Postfach
        </h1>
        <p className="mt-1 text-[12.5px] text-zinc-400">
          {list.length} Threads · Antworten direkt im Lead Command Center.
        </p>
      </header>

      {list.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-10 text-center text-[13px] text-zinc-500">
          Noch keine WhatsApp-Nachrichten.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#0d0d0f] divide-y divide-white/[0.05]">
          {list.map((t) => (
            <li key={t.leadId}>
              <Link
                href={`/crm/leads/${t.leadId}` as Route}
                className="flex items-start gap-3 px-4 py-3 transition hover:bg-white/[0.04]"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-[12px] font-bold text-black">
                  {t.leadName
                    .split(/\s+/)
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-white">
                      {t.leadName}
                    </p>
                    <p className="shrink-0 text-[10.5px] tabular-nums text-zinc-500">
                      {DT_FMT.format(t.lastAt)}
                    </p>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11.5px] text-zinc-400">
                    <span
                      className={
                        t.lastDirection === "IN"
                          ? "text-emerald-300"
                          : "text-blue-300"
                      }
                    >
                      {t.lastDirection === "IN" ? "↘ " : "↗ "}
                    </span>
                    {t.lastPayload.slice(0, 160)}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-600">
                    {t.inboundCount} ein · {t.outboundCount} aus
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
