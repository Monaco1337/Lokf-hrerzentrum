/**
 * /crm/communication — Kommunikations-Center Übersicht.
 *
 * Hub mit den 4 Brief-Modulen (WhatsApp · E-Mail · Vorlagen · Versandhistorie)
 * plus Live-Kennzahlen pro Kanal aus echten CommunicationEvent-/AutomationLog-Daten.
 */
import Link from "next/link";
import type { Route } from "next";

import { CommunicationChannel } from "@/features/fairtrain-funnel/types";
import { requireCrmUser } from "@/server/actions/_helpers";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

const DT_FMT = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const CHANNEL_LABEL: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "E-Mail",
  SMS: "SMS",
};

export default async function CommunicationCenterPage() {
  await requireCrmUser();
  const since24h = new Date(Date.now() - 24 * 3_600_000);

  const [byChannel, recent, automationCount, templateCount] = await Promise.all([
    prisma.communicationEvent.groupBy({
      by: ["channel", "direction"],
      _count: { _all: true },
    }),
    prisma.communicationEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.automationLog.count({
      where: { createdAt: { gte: since24h } },
    }),
    prisma.automationTemplate.count(),
  ]);

  // Aggregate channel counts
  const channelStats = new Map<string, { out: number; in: number }>();
  for (const r of byChannel) {
    const cur = channelStats.get(r.channel) ?? { out: 0, in: 0 };
    if (r.direction === "OUT") cur.out += r._count._all;
    else cur.in += r._count._all;
    channelStats.set(r.channel, cur);
  }
  const wa = channelStats.get(CommunicationChannel.WHATSAPP) ?? { out: 0, in: 0 };
  const em = channelStats.get(CommunicationChannel.EMAIL) ?? { out: 0, in: 0 };

  return (
    <div className="space-y-5">
      <header>
        <p className="ops-eyebrow">Kommunikation</p>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight text-white sm:text-[28px]">
          Nachrichtenzentrale
        </h1>
        <p className="mt-1 max-w-2xl text-[12.5px] text-zinc-400">
          Alle Lead-bezogene Kommunikation in einem Center: WhatsApp,
          E-Mail, Vorlagen, Versandhistorie.
        </p>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ModuleCard
          eyebrow="WhatsApp"
          title="Postfach"
          metric={`${wa.in + wa.out}`}
          hint={`${wa.in} eingehend · ${wa.out} ausgehend`}
          href={"/crm/communication/whatsapp" as Route}
          tone="emerald"
        />
        <ModuleCard
          eyebrow="E-Mail"
          title="Postfach"
          metric={`${em.in + em.out}`}
          hint={`${em.in} eingehend · ${em.out} ausgehend`}
          href={"/crm/communication/email" as Route}
          tone="blue"
        />
        <ModuleCard
          eyebrow="Vorlagen"
          title="Templates"
          metric={`${templateCount}`}
          hint="Versandbausteine"
          href={"/crm/automation" as Route}
          tone="orange"
        />
        <ModuleCard
          eyebrow="Versandhistorie"
          title="Live-Log"
          metric={`${automationCount}`}
          hint="Versand-Aktionen (24h)"
          href={"/crm/communication/log" as Route}
          tone="amber"
        />
      </ul>

      <section className="rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4">
        <header className="mb-2 flex items-end justify-between">
          <div>
            <p className="ops-eyebrow">Letzte Konversationen</p>
            <p className="text-[12.5px] text-zinc-400">
              Eingehende und ausgehende Nachrichten aller Kanäle
            </p>
          </div>
          <Link
            href={"/crm/communication/log" as Route}
            className="ops-eyebrow text-orange-300 hover:text-orange-200"
          >
            Alle Logs →
          </Link>
        </header>
        {recent.length === 0 && (
          <p className="py-6 text-center text-[12px] text-zinc-500">
            Noch keine Kommunikation erfasst.
          </p>
        )}
        <ul className="divide-y divide-white/[0.05]">
          {recent.map((m) => (
            <li key={m.id}>
              <Link
                href={`/crm/leads/${m.lead.id}` as Route}
                className="flex items-center gap-3 px-1 py-2.5 transition hover:bg-white/[0.03]"
              >
                <span
                  className={`inline-flex h-6 w-12 items-center justify-center rounded-md text-[9.5px] font-bold tracking-wider ${
                    m.direction === "IN"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-blue-500/15 text-blue-300"
                  }`}
                >
                  {m.direction === "IN" ? "EIN" : "AUS"}
                </span>
                <span className="inline-flex shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[9.5px] uppercase tracking-wider text-zinc-300">
                  {CHANNEL_LABEL[m.channel] ?? m.channel}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-white">
                    {m.lead.firstName} {m.lead.lastName}
                  </p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {m.payload.slice(0, 120)}
                  </p>
                </div>
                <p className="shrink-0 text-[10.5px] tabular-nums text-zinc-500">
                  {DT_FMT.format(m.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ModuleCard({
  eyebrow,
  title,
  metric,
  hint,
  href,
  tone,
}: {
  eyebrow: string;
  title: string;
  metric: string;
  hint: string;
  href: Route;
  tone: "emerald" | "blue" | "orange" | "amber";
}) {
  const accent = {
    emerald: "text-emerald-300",
    blue: "text-blue-300",
    orange: "text-orange-300",
    amber: "text-amber-300",
  }[tone];
  return (
    <li>
      <Link
        href={href}
        className="block rounded-xl border border-white/[0.06] bg-[#0d0d0f] p-4 transition hover:border-white/[0.16] hover:bg-[#161618]"
      >
        <p className="ops-eyebrow">{eyebrow}</p>
        <p className="mt-1 text-[15px] font-semibold text-white">{title}</p>
        <p className={`mt-2 text-[26px] font-bold leading-none tabular-nums ${accent}`}>
          {metric}
        </p>
        <p className="mt-1 text-[10.5px] text-zinc-500">{hint}</p>
      </Link>
    </li>
  );
}
